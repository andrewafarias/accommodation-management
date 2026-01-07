from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import HttpResponse
from django.db import models
from datetime import timedelta, datetime
import json
import csv
from io import StringIO
from .models import AccommodationUnit, DatePriceOverride, DatePackage, UnitImage
from .serializers import AccommodationUnitSerializer, DatePriceOverrideSerializer, DatePackageSerializer, UnitImageSerializer


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
        
        # Update display_order for each unit using bulk_update for better performance
        units_to_update = []
        for index, unit_id in enumerate(unit_ids):
            try:
                unit = AccommodationUnit.objects.get(id=unit_id)
                unit.display_order = index
                units_to_update.append(unit)
            except AccommodationUnit.DoesNotExist:
                pass  # Skip non-existent units
        
        # Bulk update all units
        if units_to_update:
            AccommodationUnit.objects.bulk_update(units_to_update, ['display_order'])
        updated_count = len(units_to_update)
        
        return Response({
            'updated': updated_count,
            'message': f'Successfully updated display order for {updated_count} units'
        }, status=status.HTTP_200_OK)


class DatePriceOverrideViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing DatePriceOverride resources.
    Supports bulk creation and filtering by date range and accommodation unit.
    """
    queryset = DatePriceOverride.objects.select_related('accommodation_unit').all()
    serializer_class = DatePriceOverrideSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['accommodation_unit', 'date']
    ordering_fields = ['date', 'accommodation_unit', 'price']
    ordering = ['date', 'accommodation_unit']
    
    def get_queryset(self):
        """Filter by date range if provided."""
        queryset = super().get_queryset()
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create price overrides for multiple dates and units.
        
        Body: {
            "unit_ids": [1, 2, 3],
            "dates": ["2025-12-25", "2025-12-26"],
            "price": 500.00
        }
        
        Or for individual items:
        Body: {
            "items": [
                {"accommodation_unit": 1, "date": "2025-12-25", "price": 500.00},
                {"accommodation_unit": 2, "date": "2025-12-25", "price": 450.00}
            ]
        }
        """
        # Check if using bulk format or individual items
        items = request.data.get('items')
        
        if items:
            # Individual items format
            serializer = self.get_serializer(data=items, many=True)
        else:
            # Bulk format - expand unit_ids and dates
            unit_ids = request.data.get('unit_ids', [])
            dates = request.data.get('dates', [])
            price = request.data.get('price')
            
            if not unit_ids or not dates or price is None:
                return Response(
                    {'error': 'unit_ids, dates, and price are required for bulk creation'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create items for each unit-date combination
            items = []
            for unit_id in unit_ids:
                for date_str in dates:
                    items.append({
                        'accommodation_unit': unit_id,
                        'date': date_str,
                        'price': price
                    })
            
            serializer = self.get_serializer(data=items, many=True)
        
        if serializer.is_valid():
            # Use update_or_create to handle duplicates
            created_count = 0
            updated_count = 0
            errors = []
            
            for item_data in serializer.validated_data:
                try:
                    obj, created = DatePriceOverride.objects.update_or_create(
                        accommodation_unit=item_data['accommodation_unit'],
                        date=item_data['date'],
                        defaults={'price': item_data['price']}
                    )
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
                except Exception as e:
                    errors.append(str(e))
            
            return Response({
                'created': created_count,
                'updated': updated_count,
                'errors': errors
            }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Bulk delete price overrides for specified date ranges and units.
        
        Body: {
            "unit_ids": [1, 2],
            "start_date": "2025-12-25",
            "end_date": "2025-12-31"
        }
        """
        unit_ids = request.data.get('unit_ids', [])
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not unit_ids or not start_date or not end_date:
            return Response(
                {'error': 'unit_ids, start_date, and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter and delete
        queryset = DatePriceOverride.objects.filter(
            accommodation_unit_id__in=unit_ids,
            date__gte=start_date,
            date__lte=end_date
        )
        
        deleted_count, _ = queryset.delete()
        
        return Response({
            'deleted': deleted_count,
            'message': f'Successfully deleted {deleted_count} price overrides'
        }, status=status.HTTP_200_OK)


class DatePackageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing DatePackage resources.
    Supports bulk creation and filtering by date range and accommodation unit.
    """
    queryset = DatePackage.objects.select_related('accommodation_unit').all()
    serializer_class = DatePackageSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['accommodation_unit', 'name']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter by date range if provided."""
        queryset = super().get_queryset()
        
        # Filter packages that overlap with the given date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date and end_date:
            # Packages that overlap: package.start <= end_date AND package.end >= start_date
            queryset = queryset.filter(
                start_date__lte=end_date,
                end_date__gte=start_date
            )
        elif start_date:
            queryset = queryset.filter(end_date__gte=start_date)
        elif end_date:
            queryset = queryset.filter(start_date__lte=end_date)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create packages for multiple units with the same date range and name.
        
        Body: {
            "unit_ids": [1, 2, 3],
            "name": "Natal 2025",
            "start_date": "2025-12-20",
            "end_date": "2025-12-26",
            "color": "#FF5733"
        }
        
        Or for individual items:
        Body: {
            "items": [
                {"accommodation_unit": 1, "name": "Natal", "start_date": "2025-12-20", "end_date": "2025-12-26", "color": "#FF5733"},
                {"accommodation_unit": 2, "name": "Natal", "start_date": "2025-12-20", "end_date": "2025-12-26", "color": "#FF5733"}
            ]
        }
        """
        # Check if using bulk format or individual items
        items = request.data.get('items')
        
        if items:
            # Individual items format
            serializer = self.get_serializer(data=items, many=True)
        else:
            # Bulk format - expand unit_ids
            unit_ids = request.data.get('unit_ids', [])
            name = request.data.get('name')
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            color = request.data.get('color', '#4A90E2')
            
            if not unit_ids or not name or not start_date or not end_date:
                return Response(
                    {'error': 'unit_ids, name, start_date, and end_date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create items for each unit
            items = []
            for unit_id in unit_ids:
                items.append({
                    'accommodation_unit': unit_id,
                    'name': name,
                    'start_date': start_date,
                    'end_date': end_date,
                    'color': color
                })
            
            serializer = self.get_serializer(data=items, many=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'created': len(serializer.data),
                'packages': serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Bulk delete packages that overlap with specified date ranges and units.
        
        Body: {
            "unit_ids": [1, 2],
            "start_date": "2025-12-25",
            "end_date": "2025-12-31"
        }
        """
        unit_ids = request.data.get('unit_ids', [])
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not unit_ids or not start_date or not end_date:
            return Response(
                {'error': 'unit_ids, start_date, and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter packages that overlap with the date range
        queryset = DatePackage.objects.filter(
            accommodation_unit_id__in=unit_ids,
            start_date__lte=end_date,
            end_date__gte=start_date
        )
        
        deleted_count, _ = queryset.delete()
        
        return Response({
            'deleted': deleted_count,
            'message': f'Successfully deleted {deleted_count} packages'
        }, status=status.HTTP_200_OK)


class UnitImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing UnitImage resources.
    Supports image upload and management for accommodation units.
    """
    queryset = UnitImage.objects.select_related('accommodation_unit').all()
    serializer_class = UnitImageSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['accommodation_unit']
    ordering_fields = ['order', 'created_at']
    ordering = ['accommodation_unit', 'order', 'id']
    
    def get_queryset(self):
        """Filter by accommodation unit if provided."""
        queryset = super().get_queryset()
        unit_id = self.request.query_params.get('accommodation_unit')
        if unit_id:
            queryset = queryset.filter(accommodation_unit_id=unit_id)
        return queryset
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def bulk_upload(self, request):
        """
        Bulk upload multiple images for an accommodation unit.
        
        Form data:
        - accommodation_unit: unit ID
        - images: multiple image files
        - captions: optional captions (comma-separated)
        """
        unit_id = request.data.get('accommodation_unit')
        if not unit_id:
            return Response(
                {'error': 'accommodation_unit is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            unit = AccommodationUnit.objects.get(id=unit_id)
        except AccommodationUnit.DoesNotExist:
            return Response(
                {'error': 'Accommodation unit not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all uploaded images
        images = request.FILES.getlist('images')
        if not images:
            return Response(
                {'error': 'No images provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get captions if provided
        captions_str = request.data.get('captions', '')
        captions = [c.strip() for c in captions_str.split(',')] if captions_str else []
        
        # Get the current max order for this unit
        max_order = UnitImage.objects.filter(accommodation_unit=unit).aggregate(
            models.Max('order')
        )['order__max'] or -1
        
        # Create image records
        created_images = []
        for idx, image_file in enumerate(images):
            caption = captions[idx] if idx < len(captions) else ''
            unit_image = UnitImage.objects.create(
                accommodation_unit=unit,
                image=image_file,
                order=max_order + idx + 1,
                caption=caption
            )
            created_images.append(unit_image)
        
        serializer = self.get_serializer(created_images, many=True)
        return Response({
            'created': len(created_images),
            'images': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder images by updating their order field.
        Expects a list of image IDs in the desired order.
        
        Body: { "image_ids": [3, 1, 2] }
        """
        image_ids = request.data.get('image_ids', [])
        
        if not isinstance(image_ids, list):
            return Response(
                {'error': 'image_ids must be a list'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order for each image
        images_to_update = []
        skipped_ids = []
        for index, image_id in enumerate(image_ids):
            try:
                image = UnitImage.objects.get(id=image_id)
                image.order = index
                images_to_update.append(image)
            except UnitImage.DoesNotExist:
                skipped_ids.append(image_id)
        
        # Bulk update all images
        if images_to_update:
            UnitImage.objects.bulk_update(images_to_update, ['order'])
        updated_count = len(images_to_update)
        
        response_data = {
            'updated': updated_count,
            'message': f'Successfully updated order for {updated_count} images'
        }
        
        if skipped_ids:
            response_data['skipped_ids'] = skipped_ids
            response_data['message'] += f', skipped {len(skipped_ids)} non-existent images'
        
        return Response(response_data, status=status.HTTP_200_OK)

