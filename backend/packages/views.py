from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Package
from .serializers import PackageSerializer, PackageListSerializer


class PackageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Package resources.
    
    Supports CRUD operations for accommodation packages.
    """
    queryset = Package.objects.all()
    serializer_class = PackageSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['is_active']
    ordering_fields = ['name', 'created_at', 'package_price']
    ordering = ['name']
    
    def get_serializer_class(self):
        """Use simplified serializer for list view."""
        if self.action == 'list':
            return PackageListSerializer
        return PackageSerializer
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get only active packages.
        """
        packages = self.queryset.filter(is_active=True)
        serializer = PackageListSerializer(packages, many=True)
        return Response(serializer.data)
