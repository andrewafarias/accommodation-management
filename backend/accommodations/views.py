from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta
import json
import csv
from io import StringIO
from .models import AccommodationUnit
from .serializers import AccommodationUnitSerializer


class AccommodationUnitViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing AccommodationUnit resources.
    
    Supports filtering by status and automatic dirty status checking.
    """
    queryset = AccommodationUnit.objects.all()
    serializer_class = AccommodationUnitSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['name', 'created_at', 'base_price', 'display_order']
    ordering = ['display_order', 'name']
    
    def list(self, request, *args, **kwargs):
        """
        List accommodations and automatically update dirty status based on auto_dirty_days.
        """
        # Check and update dirty status before listing
        self._check_and_update_dirty_status()
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve an accommodation and check dirty status.
        """
        # Check and update dirty status before retrieving
        self._check_and_update_dirty_status()
        return super().retrieve(request, *args, **kwargs)
    
    def _check_and_update_dirty_status(self):
        """
        Check all CLEAN units and update to DIRTY if they exceed auto_dirty_days.
        """
        now = timezone.now()
        clean_units = AccommodationUnit.objects.filter(status=AccommodationUnit.CLEAN)
        
        for unit in clean_units:
            # If last_cleaned_at is not set, use updated_at as a fallback
            reference_time = unit.last_cleaned_at or unit.updated_at
            
            if reference_time:
                days_since_cleaned = (now - reference_time).days
                if days_since_cleaned >= unit.auto_dirty_days:
                    unit.status = AccommodationUnit.DIRTY
                    unit.save(update_fields=['status', 'updated_at'])
    
    def update(self, request, *args, **kwargs):
        """
        Update an accommodation unit and set last_cleaned_at when marked as CLEAN.
        """
        instance = self.get_object()
        old_status = instance.status
        
        # Perform the update
        response = super().update(request, *args, **kwargs)
        
        # Refresh instance to get updated values
        instance.refresh_from_db()
        
        # If status changed to CLEAN, update last_cleaned_at
        if old_status != AccommodationUnit.CLEAN and instance.status == AccommodationUnit.CLEAN:
            instance.last_cleaned_at = timezone.now()
            instance.save(update_fields=['last_cleaned_at', 'updated_at'])
            # Refresh serializer data
            serializer = self.get_serializer(instance)
            response.data = serializer.data
        
        return response
    
    def partial_update(self, request, *args, **kwargs):
        """
        Partially update an accommodation unit and set last_cleaned_at when marked as CLEAN.
        """
        instance = self.get_object()
        old_status = instance.status
        
        # Perform the partial update
        response = super().partial_update(request, *args, **kwargs)
        
        # Refresh instance to get updated values
        instance.refresh_from_db()
        
        # If status changed to CLEAN, update last_cleaned_at
        if old_status != AccommodationUnit.CLEAN and instance.status == AccommodationUnit.CLEAN:
            instance.last_cleaned_at = timezone.now()
            instance.save(update_fields=['last_cleaned_at', 'updated_at'])
            # Refresh serializer data
            serializer = self.get_serializer(instance)
            response.data = serializer.data
        
        return response
    
    @action(detail=False, methods=['get'])
    def export_data(self, request):
        """
        Export all accommodation units to JSON or CSV format.
        Query param: export_format (json or csv, default: json)
        """
        export_format = request.query_params.get('export_format', 'json').lower()
        units = self.get_queryset()
        serializer = self.get_serializer(units, many=True)
        data = serializer.data
        
        # Remove fields that shouldn't be exported (auto-generated)
        export_data = []
        for unit in data:
            export_item = {
                'name': unit.get('name', ''),
                'max_capacity': unit.get('max_capacity', 0),
                'base_price': unit.get('base_price', '0.00'),
                'weekend_price': unit.get('weekend_price', ''),
                'holiday_price': unit.get('holiday_price', ''),
                'color_hex': unit.get('color_hex', '#4A90E2'),
                'status': unit.get('status', 'CLEAN'),
                'auto_dirty_days': unit.get('auto_dirty_days', 3),
                'default_check_in_time': unit.get('default_check_in_time', '14:00:00'),
                'default_check_out_time': unit.get('default_check_out_time', '12:00:00'),
            }
            export_data.append(export_item)
        
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="units.csv"'
            
            if export_data:
                writer = csv.DictWriter(response, fieldnames=[
                    'name', 'max_capacity', 'base_price', 'weekend_price', 'holiday_price',
                    'color_hex', 'status', 'auto_dirty_days', 'default_check_in_time', 'default_check_out_time'
                ])
                writer.writeheader()
                for row in export_data:
                    writer.writerow(row)
            
            return response
        else:
            response = HttpResponse(
                json.dumps(export_data, ensure_ascii=False, indent=2),
                content_type='application/json'
            )
            response['Content-Disposition'] = 'attachment; filename="units.json"'
            return response
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def import_data(self, request):
        """
        Import accommodation units from JSON or CSV format.
        Accepts file upload or JSON body.
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
                data = list(reader)
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
                {'error': 'Data must be a list of accommodation units'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for idx, unit_data in enumerate(data):
            try:
                # Check if unit with same name already exists
                name = unit_data.get('name', '')
                existing = AccommodationUnit.objects.filter(name=name).first()
                
                if existing:
                    # Update existing unit
                    serializer = AccommodationUnitSerializer(existing, data=unit_data, partial=True)
                else:
                    # Create new unit
                    serializer = AccommodationUnitSerializer(data=unit_data)
                
                if serializer.is_valid():
                    serializer.save()
                    imported_count += 1
                else:
                    errors.append({
                        'index': idx,
                        'data': unit_data,
                        'errors': serializer.errors
                    })
            except Exception as e:
                errors.append({
                    'index': idx,
                    'data': unit_data,
                    'errors': str(e)
                })
        
        return Response({
            'imported': imported_count,
            'errors': errors
        }, status=status.HTTP_200_OK if imported_count > 0 else status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder accommodation units by updating their display_order.
        Expects a list of unit IDs in the desired order.
        
        Body: { "unit_ids": [3, 1, 2] }
        """
        unit_ids = request.data.get('unit_ids', [])
        
        if not isinstance(unit_ids, list):
            return Response(
                {'error': 'unit_ids must be a list'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update display_order for each unit
        updated_count = 0
        for index, unit_id in enumerate(unit_ids):
            try:
                unit = AccommodationUnit.objects.get(id=unit_id)
                unit.display_order = index
                unit.save(update_fields=['display_order', 'updated_at'])
                updated_count += 1
            except AccommodationUnit.DoesNotExist:
                pass  # Skip non-existent units
        
        return Response({
            'updated': updated_count,
            'message': f'Successfully updated display order for {updated_count} units'
        }, status=status.HTTP_200_OK)
