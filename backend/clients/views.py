from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Value, CharField
from django.db.models.functions import Replace
from .models import Client, DocumentAttachment
from .serializers import ClientSerializer, DocumentAttachmentSerializer


class UnformattedPhoneSearchFilter(SearchFilter):
    """
    Custom search filter that handles phone number search without formatting.
    Extends DRF's SearchFilter to add phone search capability by stripping formatting.
    """
    
    def filter_queryset(self, request, queryset, view):
        # First apply the default search filter
        queryset = super().filter_queryset(request, queryset, view)
        
        # Then add custom phone search
        search_term = request.query_params.get(self.search_param, None)
        
        if search_term and any(char.isdigit() for char in search_term):
            # Remove common phone formatting characters from search term
            phone_digits = (search_term.replace('+', '')
                           .replace('(', '')
                           .replace(')', '')
                           .replace('-', '')
                           .replace(' ', ''))
            
            if phone_digits:
                # Create a queryset with phone field stripped of formatting
                # Chain multiple Replace calls to remove all formatting characters
                base_queryset = view.get_queryset()
                phone_stripped = Replace(
                    Replace(
                        Replace(
                            Replace(
                                Replace('phone', Value('+'), Value('')),
                                Value('('), Value('')
                            ),
                            Value(')'), Value('')
                        ),
                        Value('-'), Value('')
                    ),
                    Value(' '), Value('')
                )
                
                # Annotate and filter
                phone_matches = base_queryset.annotate(
                    phone_stripped=phone_stripped
                ).filter(phone_stripped__icontains=phone_digits)
                
                # Combine with existing queryset
                queryset = (queryset | phone_matches).distinct()
        
        return queryset


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Client resources.
    
    Provides standard CRUD operations.
    Supports file uploads via multipart/form-data.
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [OrderingFilter, UnformattedPhoneSearchFilter]
    search_fields = ['full_name', 'cpf', 'email']
    ordering_fields = ['full_name', 'created_at']
    ordering = ['full_name']
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def add_document(self, request, pk=None):
        """
        Add a document attachment to a client.
        Expects: file (required)
        """
        client = self.get_object()
        file = request.FILES.get('file')
        
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document = DocumentAttachment.objects.create(
            client=client,
            file=file,
            filename=file.name
        )
        
        serializer = DocumentAttachmentSerializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'], url_path='remove_document/(?P<document_id>[^/.]+)')
    def remove_document(self, request, pk=None, document_id=None):
        """
        Remove a document attachment from a client.
        """
        client = self.get_object()
        
        try:
            document = DocumentAttachment.objects.get(id=document_id, client=client)
            document.file.delete()  # Delete the file from storage
            document.delete()  # Delete the database record
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DocumentAttachment.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
