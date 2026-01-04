from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.http import HttpResponse
import json
import csv
from io import StringIO, BytesIO
from datetime import datetime
from decimal import Decimal
from .models import Reservation
from .serializers import ReservationSerializer
from accommodations.models import AccommodationUnit
from clients.models import Client

# PDF generation imports
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import os


class ReservationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Reservation resources.
    
    Supports filtering by check_in range and status.
    Includes a custom action to check availability.
    """
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'accommodation_unit', 'client']
    ordering_fields = ['check_in', 'check_out', 'created_at']
    ordering = ['-check_in']
    
    def get_queryset(self):
        """
        Optionally filter by check_in date range.
        """
        queryset = super().get_queryset()
        
        # Filter by check_in range
        check_in_start = self.request.query_params.get('check_in_start', None)
        check_in_end = self.request.query_params.get('check_in_end', None)
        
        if check_in_start:
            queryset = queryset.filter(check_in__gte=check_in_start)
        if check_in_end:
            queryset = queryset.filter(check_in__lte=check_in_end)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """
        Override create to include tight turnaround warning in response.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Build response data with potential warning
        response_data = serializer.data
        warning = serializer.context.get('tight_turnaround_warning')
        if warning:
            response_data['warning'] = warning
        
        headers = self.get_success_headers(serializer.data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """
        Override update to include tight turnaround warning in response.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Build response data with potential warning
        response_data = serializer.data
        warning = serializer.context.get('tight_turnaround_warning')
        if warning:
            response_data['warning'] = warning
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'])
    def check_availability(self, request):
        """
        Custom action to check which accommodation units are available
        for a given date range.
        
        Query params:
        - check_in: ISO datetime string (required)
        - check_out: ISO datetime string (required)
        
        Returns:
        - List of available accommodation units
        """
        from django.utils import timezone
        from datetime import datetime
        
        check_in_str = request.query_params.get('check_in')
        check_out_str = request.query_params.get('check_out')
        
        if not check_in_str or not check_out_str:
            return Response(
                {'error': 'Both check_in and check_out parameters are required'},
                status=400
            )
        
        # Parse datetime strings using fromisoformat which handles various ISO formats
        try:
            check_in = datetime.fromisoformat(check_in_str.replace('Z', '+00:00'))
            check_out = datetime.fromisoformat(check_out_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError) as e:
            return Response(
                {'error': f'Invalid datetime format: {str(e)}. Use ISO 8601 format (e.g., 2025-11-23T14:00:00+00:00 or 2025-11-23T14:00:00Z)'},
                status=400
            )
        
        # Make timezone-aware if needed
        if timezone.is_naive(check_in):
            check_in = timezone.make_aware(check_in)
        if timezone.is_naive(check_out):
            check_out = timezone.make_aware(check_out)
        
        # Find units that have overlapping reservations
        overlapping_reservations = Reservation.objects.filter(
            check_in__lt=check_out,
            check_out__gt=check_in
        ).exclude(
            status=Reservation.CANCELLED
        ).values_list('accommodation_unit_id', flat=True)
        
        # Get all units that are NOT in the overlapping list
        available_units = AccommodationUnit.objects.exclude(
            id__in=overlapping_reservations
        )
        
        from accommodations.serializers import AccommodationUnitSerializer
        serializer = AccommodationUnitSerializer(available_units, many=True)
        
        return Response({
            'check_in': check_in_str,
            'check_out': check_out_str,
            'available_units': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def export_data(self, request):
        """
        Export all reservations to JSON or CSV format.
        Query param: export_format (json or csv, default: json)
        """
        export_format = request.query_params.get('export_format', 'json').lower()
        reservations = self.get_queryset()
        serializer = self.get_serializer(reservations, many=True)
        data = serializer.data
        
        # Prepare export data with references by CPF and unit name
        export_data = []
        for res in data:
            client_cpf = res.get('client', {}).get('cpf', '') if isinstance(res.get('client'), dict) else ''
            unit_name = res.get('accommodation_unit', {}).get('name', '') if isinstance(res.get('accommodation_unit'), dict) else ''
            
            export_item = {
                'client_cpf': client_cpf,
                'unit_name': unit_name,
                'check_in': res.get('check_in', ''),
                'check_out': res.get('check_out', ''),
                'guest_count_adults': res.get('guest_count_adults', 1),
                'guest_count_children': res.get('guest_count_children', 0),
                'total_price': res.get('total_price', ''),
                'amount_paid': res.get('amount_paid', '0.00'),
                'status': res.get('status', 'PENDING'),
                'notes': res.get('notes', ''),
                'price_breakdown': res.get('price_breakdown', []),
                'payment_history': res.get('payment_history', []),
            }
            export_data.append(export_item)
        
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="reservations.csv"'
            
            if export_data:
                writer = csv.DictWriter(response, fieldnames=[
                    'client_cpf', 'unit_name', 'check_in', 'check_out',
                    'guest_count_adults', 'guest_count_children', 'total_price',
                    'amount_paid', 'status', 'notes', 'price_breakdown', 'payment_history'
                ])
                writer.writeheader()
                for row in export_data:
                    row['price_breakdown'] = json.dumps(row['price_breakdown']) if row['price_breakdown'] else '[]'
                    row['payment_history'] = json.dumps(row['payment_history']) if row['payment_history'] else '[]'
                    writer.writerow(row)
            
            return response
        else:
            response = HttpResponse(
                json.dumps(export_data, ensure_ascii=False, indent=2),
                content_type='application/json'
            )
            response['Content-Disposition'] = 'attachment; filename="reservations.json"'
            return response
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def import_data(self, request):
        """
        Import reservations from JSON or CSV format.
        Accepts file upload or JSON body.
        Uses client_cpf and unit_name to link to existing records.
        """
        imported_count = 0
        errors = []
        
        # Check if file was uploaded
        file = request.FILES.get('file')
        
        if file:
            file_content = file.read().decode('utf-8')
            filename = file.name.lower()
            
            if filename.endswith('.csv'):
                # Parse CSV
                reader = csv.DictReader(StringIO(file_content))
                data = []
                for row in reader:
                    if 'price_breakdown' in row and row['price_breakdown']:
                        try:
                            row['price_breakdown'] = json.loads(row['price_breakdown'])
                        except json.JSONDecodeError:
                            row['price_breakdown'] = []
                    if 'payment_history' in row and row['payment_history']:
                        try:
                            row['payment_history'] = json.loads(row['payment_history'])
                        except json.JSONDecodeError:
                            row['payment_history'] = []
                    data.append(row)
            else:
                # Parse JSON
                try:
                    data = json.loads(file_content)
                except json.JSONDecodeError:
                    return Response(
                        {'error': 'Invalid JSON file'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        else:
            # Check for JSON body
            data = request.data if isinstance(request.data, list) else request.data.get('data', [])
        
        if not isinstance(data, list):
            return Response(
                {'error': 'Data must be a list of reservations'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for idx, res_data in enumerate(data):
            try:
                # Look up client by CPF
                client_cpf = res_data.get('client_cpf', '')
                client = Client.objects.filter(cpf=client_cpf).first()
                
                if not client:
                    errors.append({
                        'index': idx,
                        'data': res_data,
                        'errors': f"Client with CPF '{client_cpf}' not found"
                    })
                    continue
                
                # Look up unit by name
                unit_name = res_data.get('unit_name', '')
                unit = AccommodationUnit.objects.filter(name=unit_name).first()
                
                if not unit:
                    errors.append({
                        'index': idx,
                        'data': res_data,
                        'errors': f"Unit with name '{unit_name}' not found"
                    })
                    continue
                
                # Prepare data for serializer
                serializer_data = {
                    'client': client.id,
                    'accommodation_unit': unit.id,
                    'check_in': res_data.get('check_in'),
                    'check_out': res_data.get('check_out'),
                    'guest_count_adults': res_data.get('guest_count_adults', 1),
                    'guest_count_children': res_data.get('guest_count_children', 0),
                    'total_price': res_data.get('total_price') if res_data.get('total_price') != '' else None,
                    'amount_paid': res_data.get('amount_paid', '0.00'),
                    'status': res_data.get('status', 'PENDING'),
                    'notes': res_data.get('notes', ''),
                    'price_breakdown': res_data.get('price_breakdown', []),
                    'payment_history': res_data.get('payment_history', []),
                }
                
                serializer = ReservationSerializer(data=serializer_data)
                
                if serializer.is_valid():
                    serializer.save()
                    imported_count += 1
                else:
                    errors.append({
                        'index': idx,
                        'data': res_data,
                        'errors': serializer.errors
                    })
            except Exception as e:
                errors.append({
                    'index': idx,
                    'data': res_data,
                    'errors': str(e)
                })
        
        return Response({
            'imported': imported_count,
            'errors': errors
        }, status=status.HTTP_200_OK if imported_count > 0 else status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        """
        Generate a PDF receipt for a reservation.
        Returns the PDF file as a response.
        """
        try:
            reservation = self.get_object()
        except Reservation.DoesNotExist:
            return Response(
                {'error': 'Reservation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create PDF buffer
        buffer = BytesIO()
        
        # Define colors based on site theme (soft lavender/purple)
        primary_color = colors.HexColor('#9333ea')  # primary-600
        secondary_color = colors.HexColor('#ec4899')  # secondary-500
        accent_color = colors.HexColor('#10b981')  # accent-500
        light_purple = colors.HexColor('#f3e8ff')  # primary-100
        light_pink = colors.HexColor('#fce7f3')  # secondary-100
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        # Create custom styles
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            alignment=TA_CENTER,
            textColor=primary_color,
            spaceAfter=10
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            textColor=colors.gray,
            spaceAfter=20
        )
        
        section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=primary_color,
            spaceBefore=15,
            spaceAfter=10
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=5
        )
        
        # Build PDF content
        elements = []
        
        # Logo
        logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'images', 'logocentral.svg')
        if os.path.exists(logo_path):
            try:
                # SVG requires conversion, use PNG fallback or skip
                pass
            except Exception:
                pass
        
        # Title
        elements.append(Paragraph("Chalés Jasmim", title_style))
        elements.append(Paragraph("Recibo de Reserva", subtitle_style))
        elements.append(Spacer(1, 10))
        
        # Reservation Info Section
        elements.append(Paragraph("Informações da Reserva", section_header_style))
        
        unit = reservation.accommodation_unit
        check_in_date = reservation.check_in.strftime('%d/%m/%Y')
        check_in_time = reservation.check_in.strftime('%H:%M')
        check_out_date = reservation.check_out.strftime('%d/%m/%Y')
        check_out_time = reservation.check_out.strftime('%H:%M')
        
        # Calculate nights
        nights = (reservation.check_out.date() - reservation.check_in.date()).days
        
        reservation_data = [
            ['Unidade:', unit.name],
            ['Check-in:', f'{check_in_date} às {check_in_time}'],
            ['Check-out:', f'{check_out_date} às {check_out_time}'],
            ['Noites:', str(nights)],
            ['Adultos:', str(reservation.guest_count_adults)],
            ['Crianças:', str(reservation.guest_count_children)],
            ['Status:', dict(Reservation.STATUS_CHOICES).get(reservation.status, reservation.status)],
        ]
        
        reservation_table = Table(reservation_data, colWidths=[4*cm, 10*cm])
        reservation_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), light_purple),
            ('TEXTCOLOR', (0, 0), (0, -1), primary_color),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(reservation_table)
        elements.append(Spacer(1, 10))
        
        # Price Breakdown Section
        elements.append(Paragraph("Discriminação de Valores", section_header_style))
        
        price_data = [['Item', 'Qtd', 'Valor Unit.', 'Total']]
        total_from_breakdown = Decimal('0.00')
        
        if reservation.price_breakdown:
            for item in reservation.price_breakdown:
                name = item.get('name', 'Diária')
                quantity = item.get('quantity', 1)
                value = Decimal(str(item.get('value', 0)))
                item_total = value * quantity
                total_from_breakdown += item_total
                price_data.append([
                    name,
                    str(quantity),
                    f'R$ {value:.2f}',
                    f'R$ {item_total:.2f}'
                ])
        
        # Add total row
        total_price = reservation.total_price or total_from_breakdown
        price_data.append(['', '', 'Total:', f'R$ {total_price:.2f}'])
        
        # Add payment info
        amount_paid = reservation.amount_paid or Decimal('0.00')
        amount_remaining = max(Decimal('0.00'), total_price - amount_paid)
        price_data.append(['', '', 'Pago:', f'R$ {amount_paid:.2f}'])
        price_data.append(['', '', 'Restante:', f'R$ {amount_remaining:.2f}'])
        
        price_table = Table(price_data, colWidths=[6*cm, 2*cm, 3*cm, 3*cm])
        price_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('PADDING', (0, 0), (-1, -1), 8),
            # Highlight total rows
            ('FONTNAME', (2, -3), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (2, -3), (-1, -3), light_purple),
            ('TEXTCOLOR', (3, -1), (3, -1), accent_color if amount_remaining == 0 else secondary_color),
        ]))
        elements.append(price_table)
        elements.append(Spacer(1, 20))
        
        # Client Info Section
        elements.append(Paragraph("Informações do Cliente", section_header_style))
        
        client = reservation.client
        client_data = [
            ['Nome:', client.full_name],
            ['CPF:', client.cpf or 'Não informado'],
            ['Telefone:', client.phone or 'Não informado'],
            ['E-mail:', client.email or 'Não informado'],
        ]
        
        client_table = Table(client_data, colWidths=[4*cm, 10*cm])
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), light_pink),
            ('TEXTCOLOR', (0, 0), (0, -1), secondary_color),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(client_table)
        elements.append(Spacer(1, 20))
        
        # Rules Section
        if unit.rules:
            elements.append(Paragraph("Regras da Acomodação", section_header_style))
            # Split rules by newlines and add as paragraphs
            rules_lines = unit.rules.split('\n')
            for line in rules_lines:
                if line.strip():
                    elements.append(Paragraph(f"• {line.strip()}", normal_style))
            elements.append(Spacer(1, 20))
        
        # Long Description Section
        if unit.long_description:
            elements.append(Paragraph("Sobre a Acomodação", section_header_style))
            # Split description by newlines
            desc_lines = unit.long_description.split('\n')
            for line in desc_lines:
                if line.strip():
                    elements.append(Paragraph(line.strip(), normal_style))
            elements.append(Spacer(1, 10))
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER,
            textColor=colors.gray
        )
        elements.append(Paragraph(f"Recibo gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')}", footer_style))
        elements.append(Paragraph("Chalés Jasmim - Seu refúgio na natureza", footer_style))
        
        # Build PDF
        doc.build(elements)
        
        # Prepare response
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="recibo-reserva-{reservation.id}.pdf"'
        
        return response
