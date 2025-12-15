from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Reservation
from .serializers import ReservationSerializer
from accommodations.models import AccommodationUnit


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
