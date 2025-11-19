from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Client resources.
    
    Provides standard CRUD operations.
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [OrderingFilter, SearchFilter]
    search_fields = ['full_name', 'cpf', 'phone', 'email']
    ordering_fields = ['full_name', 'created_at']
    ordering = ['full_name']
