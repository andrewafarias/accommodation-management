from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
import json
import csv
import re
from io import StringIO, BytesIO
from urllib.parse import quote
from datetime import datetime
from .models import Reservation
from .serializers import ReservationSerializer
from accommodations.models import AccommodationUnit
from clients.models import Client

# ReportLab imports for PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    Image, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY


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
    def generate_document(self, request, pk=None):
        """
        Generate a professional PDF document for a reservation.
        
        The document includes:
        - Reservation details (check-in/out dates and times, guests, price breakdown)
        - Client information
        - Accommodation images
        - Accommodation rules
        - Long description (markdown formatted)
        - Location with Google Maps link
        
        Note: Payment information is NOT included as per requirements.
        """
        reservation = self.get_object()
        unit = reservation.accommodation_unit
        client = reservation.client
        
        # Create buffer for PDF
        buffer = BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        # Define styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1a365d'),
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=8,
            spaceBefore=16,
            textColor=colors.HexColor('#2d3748'),
            fontName='Helvetica-Bold'
        )
        
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading3'],
            fontSize=12,
            spaceAfter=6,
            spaceBefore=12,
            textColor=colors.HexColor('#4a5568'),
            fontName='Helvetica-Bold'
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=4,
            alignment=TA_JUSTIFY,
            leading=14
        )
        
        info_style = ParagraphStyle(
            'InfoStyle',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=2,
            leading=14
        )
        
        small_style = ParagraphStyle(
            'SmallStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#718096'),
            alignment=TA_CENTER
        )
        
        link_style = ParagraphStyle(
            'LinkStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#3182ce'),
            spaceAfter=4
        )
        
        # Build document content
        content = []
        
        # Header with accommodation name
        content.append(Paragraph(f"Comprovante de Reserva", title_style))
        content.append(Paragraph(unit.name, subtitle_style))
        content.append(Spacer(1, 8*mm))
        
        # Horizontal line
        content.append(HRFlowable(
            width="100%",
            thickness=1,
            color=colors.HexColor('#e2e8f0'),
            spaceBefore=4,
            spaceAfter=12
        ))
        
        # Reservation Information Section
        content.append(Paragraph("📅 Informações da Reserva", section_style))
        
        # Format dates
        check_in_date = reservation.check_in.strftime('%d/%m/%Y')
        check_in_time = reservation.check_in.strftime('%H:%M')
        check_out_date = reservation.check_out.strftime('%d/%m/%Y')
        check_out_time = reservation.check_out.strftime('%H:%M')
        
        # Calculate nights
        nights = (reservation.check_out.date() - reservation.check_in.date()).days
        
        # Reservation details table
        reservation_data = [
            ['Check-in:', f'{check_in_date} às {check_in_time}'],
            ['Check-out:', f'{check_out_date} às {check_out_time}'],
            ['Noites:', f'{nights}'],
            ['Adultos:', str(reservation.guest_count_adults)],
            ['Crianças:', str(reservation.guest_count_children)],
            ['Animais de estimação:', str(reservation.pet_count)],
        ]
        
        # Calculate average price per night if total_price is set
        if reservation.total_price and nights > 0:
            avg_price = reservation.total_price / nights
            reservation_data.append(['Preço médio/noite:', f'R$ {avg_price:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')])
            reservation_data.append(['Valor Total:', f'R$ {reservation.total_price:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')])
        
        res_table = Table(reservation_data, colWidths=[4*cm, 10*cm])
        res_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#2d3748')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        content.append(res_table)
        
        # Price breakdown (if available)
        if reservation.price_breakdown:
            content.append(Spacer(1, 4*mm))
            content.append(Paragraph("Discriminação de Valores:", section_style))
            
            breakdown_data = [['Item', 'Qtd', 'Valor Unit.', 'Total']]
            total_calculated = 0
            
            for item in reservation.price_breakdown:
                name = item.get('name', '')
                value = float(item.get('value', 0))
                quantity = float(item.get('quantity', 1))
                item_total = value * quantity
                total_calculated += item_total
                
                breakdown_data.append([
                    name,
                    str(int(quantity)) if quantity == int(quantity) else str(quantity),
                    f'R$ {value:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.'),
                    f'R$ {item_total:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
                ])
            
            # Add total row
            breakdown_data.append(['', '', 'Total:', f'R$ {total_calculated:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')])
            
            breakdown_table = Table(breakdown_data, colWidths=[6*cm, 2*cm, 3*cm, 3*cm])
            breakdown_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7fafc')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -2), 0.5, colors.HexColor('#e2e8f0')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('LINEABOVE', (0, -1), (-1, -1), 1, colors.HexColor('#4a5568')),
            ]))
            content.append(breakdown_table)
        
        content.append(Spacer(1, 6*mm))
        
        # Client Information Section
        content.append(Paragraph("👤 Dados do Cliente", section_style))
        
        client_data = [
            ['Nome:', client.full_name],
        ]
        if client.cpf:
            client_data.append(['CPF:', client.cpf])
        client_data.append(['Telefone:', client.phone])
        if client.email:
            client_data.append(['E-mail:', client.email])
        if client.address:
            client_data.append(['Endereço:', client.address])
        
        client_table = Table(client_data, colWidths=[4*cm, 10*cm])
        client_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#2d3748')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        content.append(client_table)
        
        content.append(Spacer(1, 6*mm))
        
        # Location Section (with Google Maps link)
        if unit.location:
            content.append(Paragraph("📍 Localização", section_style))
            content.append(Paragraph(unit.location, info_style))
            
            # Create Google Maps link
            encoded_location = quote(unit.location)
            maps_url = f"https://www.google.com/maps/search/?api=1&query={encoded_location}"
            content.append(Paragraph(
                f'<link href="{maps_url}">Ver no Google Maps</link>',
                link_style
            ))
            content.append(Spacer(1, 6*mm))
        
        # Accommodation Rules Section
        if unit.rules:
            content.append(Paragraph("📋 Regras da Acomodação", section_style))
            
            # Process markdown-style rules (basic processing)
            rules_text = self._process_markdown_to_reportlab(unit.rules, body_style)
            content.extend(rules_text)
            content.append(Spacer(1, 6*mm))
        
        # Long Description Section
        if unit.long_description:
            content.append(Paragraph("📖 Sobre a Acomodação", section_style))
            
            # Process markdown-style description (basic processing)
            desc_text = self._process_markdown_to_reportlab(unit.long_description, body_style)
            content.extend(desc_text)
            content.append(Spacer(1, 6*mm))
        
        # Accommodation Images Section
        if unit.album_photos:
            content.append(Paragraph("🖼️ Fotos da Acomodação", section_style))
            content.append(Spacer(1, 2*mm))
            
            # Add note about images (since images from URLs might not load in PDF)
            content.append(Paragraph(
                "As fotos da acomodação estão disponíveis nos seguintes links:",
                info_style
            ))
            for idx, photo_url in enumerate(unit.album_photos[:6]):  # Limit to 6 photos
                content.append(Paragraph(
                    f'<link href="{photo_url}">Foto {idx + 1}</link>',
                    link_style
                ))
            content.append(Spacer(1, 6*mm))
        
        # Footer
        content.append(Spacer(1, 10*mm))
        content.append(HRFlowable(
            width="100%",
            thickness=1,
            color=colors.HexColor('#e2e8f0'),
            spaceBefore=4,
            spaceAfter=8
        ))
        
        generated_date = timezone.now().strftime('%d/%m/%Y às %H:%M')
        content.append(Paragraph(
            f"Documento gerado em {generated_date}",
            small_style
        ))
        content.append(Paragraph(
            "Este documento é um comprovante de reserva. Apresente-o no check-in.",
            small_style
        ))
        
        # Build PDF
        doc.build(content)
        
        # Get PDF value from buffer
        pdf = buffer.getvalue()
        buffer.close()
        
        # Create response
        response = HttpResponse(pdf, content_type='application/pdf')
        filename = f"reserva_{reservation.id}_{client.full_name.replace(' ', '_')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
    
    def _process_markdown_to_reportlab(self, text, base_style):
        """
        Basic markdown processing for ReportLab.
        Converts common markdown patterns to ReportLab paragraphs.
        """
        content = []
        lines = text.split('\n')
        
        current_paragraph = []
        
        for line in lines:
            stripped = line.strip()
            
            # Skip empty lines but flush current paragraph
            if not stripped:
                if current_paragraph:
                    content.append(Paragraph(' '.join(current_paragraph), base_style))
                    current_paragraph = []
                continue
            
            # Headers
            if stripped.startswith('### '):
                if current_paragraph:
                    content.append(Paragraph(' '.join(current_paragraph), base_style))
                    current_paragraph = []
                header_style = ParagraphStyle(
                    'H3Style',
                    parent=base_style,
                    fontSize=10,
                    fontName='Helvetica-Bold',
                    spaceAfter=4,
                    spaceBefore=8
                )
                content.append(Paragraph(stripped[4:], header_style))
            elif stripped.startswith('## '):
                if current_paragraph:
                    content.append(Paragraph(' '.join(current_paragraph), base_style))
                    current_paragraph = []
                header_style = ParagraphStyle(
                    'H2Style',
                    parent=base_style,
                    fontSize=11,
                    fontName='Helvetica-Bold',
                    spaceAfter=4,
                    spaceBefore=10
                )
                content.append(Paragraph(stripped[3:], header_style))
            elif stripped.startswith('# '):
                if current_paragraph:
                    content.append(Paragraph(' '.join(current_paragraph), base_style))
                    current_paragraph = []
                header_style = ParagraphStyle(
                    'H1Style',
                    parent=base_style,
                    fontSize=12,
                    fontName='Helvetica-Bold',
                    spaceAfter=6,
                    spaceBefore=12
                )
                content.append(Paragraph(stripped[2:], header_style))
            # List items
            elif stripped.startswith('- ') or stripped.startswith('* '):
                if current_paragraph:
                    content.append(Paragraph(' '.join(current_paragraph), base_style))
                    current_paragraph = []
                list_style = ParagraphStyle(
                    'ListStyle',
                    parent=base_style,
                    leftIndent=10,
                    bulletIndent=0
                )
                content.append(Paragraph(f"• {stripped[2:]}", list_style))
            # Numbered list items
            elif len(stripped) > 2 and stripped[0].isdigit() and stripped[1] in '.):':
                if current_paragraph:
                    content.append(Paragraph(' '.join(current_paragraph), base_style))
                    current_paragraph = []
                list_style = ParagraphStyle(
                    'ListStyle',
                    parent=base_style,
                    leftIndent=10,
                    bulletIndent=0
                )
                content.append(Paragraph(stripped, list_style))
            else:
                # Regular text - process inline formatting
                processed_line = stripped
                # Bold: **text** or __text__ (process before italic to avoid conflicts)
                processed_line = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', processed_line)
                processed_line = re.sub(r'__(.+?)__', r'<b>\1</b>', processed_line)
                # Italic: *text* or _text_ (use negative lookbehind/lookahead to avoid matching bold markers)
                processed_line = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<i>\1</i>', processed_line)
                processed_line = re.sub(r'(?<!_)_([^_]+)_(?!_)', r'<i>\1</i>', processed_line)
                
                current_paragraph.append(processed_line)
        
        # Flush remaining paragraph
        if current_paragraph:
            content.append(Paragraph(' '.join(current_paragraph), base_style))
        
        return content
