from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.db.models import Q, Value, CharField
from django.db.models.functions import Replace
from django.http import HttpResponse
import json
import csv
from io import StringIO
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
        Uses transaction to ensure both file and database record are deleted together.
        """
        client = self.get_object()
        
        try:
            document = DocumentAttachment.objects.get(id=document_id, client=client)
            
            # Use transaction to ensure atomicity
            with transaction.atomic():
                # Store file reference before deletion
                file_field = document.file
                # Delete the database record first
                document.delete()
                # Then delete the file from storage
                file_field.delete(save=False)
                
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DocumentAttachment.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def export_data(self, request):
        """
        Export all clients to JSON or CSV format.
        Query param: export_format (json or csv, default: json)
        """
        export_format = request.query_params.get('export_format', 'json').lower()
        clients = self.get_queryset()
        serializer = self.get_serializer(clients, many=True)
        data = serializer.data
        
        # Remove fields that shouldn't be exported (auto-generated)
        export_data = []
        for client in data:
            export_item = {
                'full_name': client.get('full_name', ''),
                'cpf': client.get('cpf', ''),
                'phone': client.get('phone', ''),
                'email': client.get('email', ''),
                'address': client.get('address', ''),
                'notes': client.get('notes', ''),
                'tags': client.get('tags', []),
            }
            export_data.append(export_item)
        
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="clients.csv"'
            
            if export_data:
                writer = csv.DictWriter(response, fieldnames=['full_name', 'cpf', 'phone', 'email', 'address', 'notes', 'tags'])
                writer.writeheader()
                for row in export_data:
                    row['tags'] = json.dumps(row['tags']) if row['tags'] else '[]'
                    writer.writerow(row)
            
            return response
        else:
            response = HttpResponse(
                json.dumps(export_data, ensure_ascii=False, indent=2),
                content_type='application/json'
            )
            response['Content-Disposition'] = 'attachment; filename="clients.json"'
            return response
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def import_data(self, request):
        """
        Import clients from JSON or CSV format.
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
                data = []
                for row in reader:
                    if 'tags' in row and row['tags']:
                        try:
                            row['tags'] = json.loads(row['tags'])
                        except json.JSONDecodeError:
                            row['tags'] = []
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
                {'error': 'Data must be a list of clients'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for idx, client_data in enumerate(data):
            try:
                # Check if client with same CPF already exists
                cpf = client_data.get('cpf', '')
                existing = Client.objects.filter(cpf=cpf).first()
                
                if existing:
                    # Update existing client
                    serializer = ClientSerializer(existing, data=client_data, partial=True)
                else:
                    # Create new client
                    serializer = ClientSerializer(data=client_data)
                
                if serializer.is_valid():
                    serializer.save()
                    imported_count += 1
                else:
                    errors.append({
                        'index': idx,
                        'data': client_data,
                        'errors': serializer.errors
                    })
            except Exception as e:
                errors.append({
                    'index': idx,
                    'data': client_data,
                    'errors': str(e)
                })
        
        return Response({
            'imported': imported_count,
            'errors': errors
        }, status=status.HTTP_200_OK if imported_count > 0 else status.HTTP_400_BAD_REQUEST)
