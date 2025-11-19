from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import AccommodationUnit
from .serializers import AccommodationUnitSerializer


class AccommodationUnitViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing AccommodationUnit resources.
    
    Supports filtering by status.
    """
    queryset = AccommodationUnit.objects.all()
    serializer_class = AccommodationUnitSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'type']
    ordering_fields = ['name', 'created_at', 'base_price']
    ordering = ['name']
