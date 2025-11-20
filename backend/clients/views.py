from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Client resources.
    
    Provides standard CRUD operations.
    Supports file uploads via multipart/form-data.
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [OrderingFilter, SearchFilter]
    search_fields = ['full_name', 'cpf', 'phone', 'email']
    ordering_fields = ['full_name', 'created_at']
    ordering = ['full_name']
    
    def get_queryset(self):
        """
        Override to add custom phone search that ignores formatting.
        """
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        
        if search:
            # Remove common phone formatting characters for search
            phone_search = search.replace('+', '').replace('(', '').replace(')', '').replace('-', '').replace(' ', '')
            
            # If the search looks like a phone number (contains only digits)
            if phone_search.isdigit():
                # Search in phone field by removing formatting characters
                queryset = queryset.filter(
                    Q(phone__icontains=phone_search)
                )
            
        return queryset
