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
    Image, HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit
import base64

# HTML escape utility for ReportLab
from html import escape as html_escape


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
        Generate a modern Airbnb-style PDF document for a reservation.
        
        Query parameters:
        - preview=true: Returns JSON with base64-encoded PDF for preview
        - preview=false or not set: Returns PDF file for download (default)
        
        The document includes:
        - Hero section with unit name and photos
        - Reservation details (check-in/out, guests, pricing)
        - Client information
        - Location with maps link
        - Accommodation description and rules
        - Unit images displayed in grid
        """
        
        def safe_text(text):
            """Helper to safely escape text for ReportLab Paragraphs"""
            if not text:
                return ''
            # Escape HTML entities to prevent XML parsing issues
            return html_escape(str(text), quote=False)
        
        reservation = self.get_object()
        unit = reservation.accommodation_unit
        client = reservation.client
        
        # Check if preview mode is requested
        preview_mode = request.query_params.get('preview', 'false').lower() == 'true'
        
        # Create buffer for PDF
        buffer = BytesIO()
        
        # Create PDF document with narrower margins for more space
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1.5*cm,
            bottomMargin=1.5*cm
        )
        
        # Define modern styles
        styles = getSampleStyleSheet()
        
        # Hero title style (accommodation name)
        hero_title = ParagraphStyle(
            'HeroTitle',
            parent=styles['Heading1'],
            fontSize=28,
            leading=34,
            spaceAfter=8,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1a202c'),
            fontName='Helvetica-Bold'
        )
        
        # Tagline style
        tagline_style = ParagraphStyle(
            'Tagline',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#718096'),
            fontName='Helvetica'
        )
        
        # Section header style
        section_header = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=16,
            leading=20,
            spaceAfter=10,
            spaceBefore=16,
            textColor=colors.HexColor('#2d3748'),
            fontName='Helvetica-Bold'
        )
        
        # Body text style
        body_text = ParagraphStyle(
            'BodyText',
            parent=styles['Normal'],
            fontSize=10,
            leading=15,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor('#4a5568')
        )
        
        # Highlight box style
        highlight_style = ParagraphStyle(
            'Highlight',
            parent=styles['Normal'],
            fontSize=11,
            leading=16,
            spaceAfter=4,
            textColor=colors.HexColor('#2d3748'),
            fontName='Helvetica'
        )
        
        # Price style
        price_style = ParagraphStyle(
            'PriceStyle',
            parent=styles['Normal'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#059669'),
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT
        )
        
        # Small text style
        small_text = ParagraphStyle(
            'SmallText',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#a0aec0'),
            alignment=TA_CENTER
        )
        
        # Build document content
        content = []
        
        # ============= HERO SECTION =============
        # Accommodation name as hero
        content.append(Paragraph(safe_text(unit.name), hero_title))
        
        # Short description if available
        if unit.short_description:
            content.append(Paragraph(safe_text(unit.short_description), tagline_style))
        else:
            content.append(Paragraph(safe_text("Comprovante de Reserva"), tagline_style))
        
        content.append(Spacer(1, 6*mm))
        
        # ============= IMAGES GRID =============
        # Display unit images in a grid (prefer uploaded images over album_photos)
        unit_images = []
        if hasattr(unit, 'images') and unit.images.exists():
            # Use uploaded images
            for img in unit.images.all()[:6]:  # Limit to 6 images
                try:
                    # Get the absolute path to the image file
                    image_path = img.image.path
                    unit_images.append(image_path)
                except Exception as e:
                    # Skip if image not found or path issue
                    continue
        
        # Create image grid if we have images
        if unit_images:
            # Calculate image dimensions for grid (2x3 or 3x2)
            available_width = 17*cm  # A4 width minus margins
            num_cols = min(3, len(unit_images))
            num_rows = (len(unit_images) + num_cols - 1) // num_cols  # Ceiling division
            
            img_width = (available_width - (num_cols - 1) * 3) / num_cols
            img_height = img_width * 0.67  # 3:2 aspect ratio
            
            # Create image grid
            image_rows = []
            for i in range(0, len(unit_images), num_cols):
                row_images = []
                for j in range(num_cols):
                    idx = i + j
                    if idx < len(unit_images):
                        try:
                            img = Image(unit_images[idx], width=img_width, height=img_height)
                            row_images.append(img)
                        except:
                            # Skip if image can't be loaded
                            pass
                
                if row_images:
                    # Pad row with empty cells if needed
                    while len(row_images) < num_cols:
                        row_images.append('')
                    image_rows.append(row_images)
            
            if image_rows:
                image_table = Table(image_rows, colWidths=[img_width] * num_cols)
                image_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 1.5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 1.5),
                    ('TOPPADDING', (0, 0), (-1, -1), 1.5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
                ]))
                content.append(image_table)
                content.append(Spacer(1, 8*mm))
        
        # ============= RESERVATION DETAILS BOX =============
        content.append(Paragraph("Detalhes da Reserva", section_header))
        
        # Format dates
        check_in_date = reservation.check_in.strftime('%d/%m/%Y')
        check_in_time = reservation.check_in.strftime('%H:%M')
        check_out_date = reservation.check_out.strftime('%d/%m/%Y')
        check_out_time = reservation.check_out.strftime('%H:%M')
        nights = (reservation.check_out.date() - reservation.check_in.date()).days
        
        # Create dates and guests info in a highlighted box
        reservation_box_data = [
            ['<b>Check-in</b>', '<b>Check-out</b>', '<b>Hóspedes</b>'],
            [
                f'{check_in_date}<br/>{check_in_time}',
                f'{check_out_date}<br/>{check_out_time}',
                f'{reservation.guest_count_adults} adulto(s)<br/>{reservation.guest_count_children} criança(s)'
            ]
        ]
        
        if reservation.pet_count > 0:
            reservation_box_data[0].append('<b>Pets</b>')
            reservation_box_data[1].append(f'{reservation.pet_count}')
        
        res_box_table = Table(reservation_box_data, colWidths=[4.5*cm] * len(reservation_box_data[0]))
        res_box_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7fafc')),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#ffffff')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        content.append(res_box_table)
        content.append(Spacer(1, 6*mm))
        
        # ============= PRICING SECTION =============
        if reservation.total_price:
            content.append(Paragraph("Valores", section_header))
            
            # Price breakdown if available
            if reservation.price_breakdown:
                breakdown_data = []
                total_calculated = 0
                
                for item in reservation.price_breakdown:
                    name = item.get('name', '')
                    value = float(item.get('value', 0))
                    quantity = float(item.get('quantity', 1))
                    item_total = value * quantity
                    total_calculated += item_total
                    
                    qty_display = f"x{int(quantity)}" if quantity > 1 else ""
                    breakdown_data.append([
                        name,
                        qty_display,
                        f'R$ {item_total:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
                    ])
                
                breakdown_table = Table(breakdown_data, colWidths=[10*cm, 2*cm, 5*cm])
                breakdown_table.setStyle(TableStyle([
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('ALIGN', (0, 0), (1, -1), 'LEFT'),
                    ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e2e8f0')),
                ]))
                content.append(breakdown_table)
            
            # Total price display
            avg_price = reservation.total_price / nights if nights > 0 else reservation.total_price
            price_data = [
                ['', f'{nights} noite(s) • Média R$ {avg_price:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.'), ''],
                ['', '<b>Total</b>', f'<b>R$ {reservation.total_price:,.2f}</b>'.replace(',', 'X').replace('.', ',').replace('X', '.')]
            ]
            
            price_table = Table(price_data, colWidths=[10*cm, 3*cm, 4*cm])
            price_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTSIZE', (0, 1), (-1, 1), 14),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#718096')),
                ('TEXTCOLOR', (2, 1), (2, 1), colors.HexColor('#059669')),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            content.append(price_table)
            content.append(Spacer(1, 8*mm))
        
        # ============= CLIENT INFORMATION =============
        content.append(Paragraph("Informações do Hóspede", section_header))
        
        client_info = [
            ['Nome:', client.full_name],
        ]
        if client.cpf:
            client_info.append(['CPF:', client.cpf])
        if client.phone:
            client_info.append(['Telefone:', client.phone])
        if client.email:
            client_info.append(['E-mail:', client.email])
        if client.address:
            client_info.append(['Endereço:', client.address])
        
        client_table = Table(client_info, colWidths=[4*cm, 13*cm])
        client_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#4a5568')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        content.append(client_table)
        content.append(Spacer(1, 8*mm))
        
        # ============= LOCATION =============
        if unit.location:
            content.append(Paragraph("Localização", section_header))
            content.append(Paragraph(unit.location, body_text))
            
            # Google Maps link
            encoded_location = quote(unit.location)
            maps_url = f"https://www.google.com/maps/search/?api=1&query={encoded_location}"
            link_para = Paragraph(
                f'<a href="{maps_url}" color="#3182ce">📍 Abrir no Google Maps</a>',
                body_text
            )
            content.append(link_para)
            content.append(Spacer(1, 8*mm))
        
        # ============= ABOUT THE ACCOMMODATION =============
        if unit.long_description:
            content.append(Paragraph("Sobre a Acomodação", section_header))
            desc_paragraphs = self._process_markdown_to_reportlab(unit.long_description, body_text)
            content.extend(desc_paragraphs)
            content.append(Spacer(1, 8*mm))
        
        # ============= RULES =============
        if unit.rules:
            content.append(Paragraph("Regras da Acomodação", section_header))
            rules_paragraphs = self._process_markdown_to_reportlab(unit.rules, body_text)
            content.extend(rules_paragraphs)
            content.append(Spacer(1, 8*mm))
        
        # ============= FOOTER =============
        content.append(Spacer(1, 8*mm))
        content.append(HRFlowable(
            width="100%",
            thickness=0.5,
            color=colors.HexColor('#e2e8f0'),
            spaceBefore=4,
            spaceAfter=8
        ))
        
        generated_date = timezone.now().strftime('%d/%m/%Y às %H:%M')
        content.append(Paragraph(
            f"Documento gerado em {generated_date}",
            small_text
        ))
        content.append(Paragraph(
            "Este é o seu comprovante de reserva. Apresente-o no check-in.",
            small_text
        ))
        
        # Build PDF
        doc.build(content)
        
        # Get PDF value from buffer
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        # Return based on mode
        if preview_mode:
            # Preview mode: return JSON with base64-encoded PDF
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            filename = f"reserva_{reservation.id}_{client.full_name.replace(' ', '_')}.pdf"
            
            return Response({
                'pdf_base64': pdf_base64,
                'filename': filename,
                'content_type': 'application/pdf'
            })
        else:
            # Download mode: return PDF file
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
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
