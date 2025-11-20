from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
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
    filterset_fields = ['status', 'type']
    ordering_fields = ['name', 'created_at', 'base_price']
    ordering = ['name']
    
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
