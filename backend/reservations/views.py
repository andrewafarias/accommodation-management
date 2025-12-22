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
from io import StringIO
from .models import Reservation
from .serializers import ReservationSerializer
from accommodations.models import AccommodationUnit
from clients.models import Client


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
