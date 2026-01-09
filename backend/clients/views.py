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
    
    def get_serializer_context(self):
        """Add context to serializer - include stats only for detail view"""
        context = super().get_serializer_context()
        # Only include stats for retrieve (single client) or when explicitly requested
        context['include_stats'] = self.action == 'retrieve' or self.request.query_params.get('include_stats') == 'true'
        return context
    
    def create(self, request, *args, **kwargs):
        """
        Create a new client and handle document attachments.
        Expects: full_name, cpf, phone, email, address, tags, notes, profile_pic, documents (optional)
        """
        # Get the documents from request.FILES before serialization
        documents = request.FILES.getlist('documents', [])
        
        # Create the client using the standard create method
        response = super().create(request, *args, **kwargs)
        
        # If documents were provided, create DocumentAttachment records
        if response.status_code == 201 and documents:
            try:
                client_id = response.data.get('id')
                client = Client.objects.get(id=client_id)
                
                with transaction.atomic():
                    for document_file in documents:
                        DocumentAttachment.objects.create(
                            client=client,
                            file=document_file,
                            filename=document_file.name
                        )
                
                # Re-serialize the client to include the newly created documents
                updated_client = Client.objects.get(id=client_id)
                serializer = self.get_serializer(updated_client)
                response.data = serializer.data
            except Client.DoesNotExist:
                pass
        
        return response
    
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
    def rankings(self, request):
        """
        Get client rankings by various metrics.
        Returns clients ranked by reservations count, days stayed, total paid, and average per night.
        """
        from django.db.models import Count, Sum
        from decimal import Decimal
        
        clients = Client.objects.all()
        
        # Calculate statistics for each client
        client_stats = []
        errors = []
        for client in clients:
            try:
                reservations = client.reservations.all()
                reservations_count = reservations.count()
                
                # Calculate total days
                total_days = 0
                for res in reservations:
                    if res.check_in and res.check_out:
                        # Convert datetime to date for calculation
                        check_in_date = res.check_in.date() if hasattr(res.check_in, 'date') else res.check_in
                        check_out_date = res.check_out.date() if hasattr(res.check_out, 'date') else res.check_out
                        delta = check_out_date - check_in_date
                        total_days += delta.days
                
                # Calculate total paid
                total_paid = float(reservations.aggregate(
                    total=Sum('transactions__amount')
                )['total'] or Decimal('0.00'))
                
                # Calculate average per night
                avg_per_night = round(total_paid / total_days, 2) if total_days > 0 else 0.0
                
                client_stats.append({
                    'id': client.id,
                    'full_name': client.full_name,
                    'cpf': client.cpf or '',
                    'phone': client.phone or '',
                    'email': client.email or '',
                    'reservations_count': reservations_count,
                    'total_days_stayed': total_days,
                    'total_amount_paid': total_paid,
                    'average_price_per_night': avg_per_night,
                })
            except Exception as e:
                # Log error but continue
                errors.append(f"Error with client {client.id}: {str(e)}")
                continue
        
        # Create rankings
        rankings = {
            'by_reservations': sorted(
                [c for c in client_stats if c['reservations_count'] > 0],
                key=lambda x: x['reservations_count'],
                reverse=True
            ),
            'by_days_stayed': sorted(
                [c for c in client_stats if c['total_days_stayed'] > 0],
                key=lambda x: x['total_days_stayed'],
                reverse=True
            ),
            'by_total_paid': sorted(
                [c for c in client_stats if c['total_amount_paid'] > 0],
                key=lambda x: x['total_amount_paid'],
                reverse=True
            ),
            'by_avg_per_night': sorted(
                [c for c in client_stats if c['average_price_per_night'] > 0],
                key=lambda x: x['average_price_per_night'],
                reverse=True
            ),
        }
        
        # Add rank to each client in each category
        for category, clients_list in rankings.items():
            for rank, client in enumerate(clients_list, 1):
                client['rank'] = rank
        
        # Calculate general statistics
        total_reservations = sum(c['reservations_count'] for c in client_stats)
        total_days = sum(c['total_days_stayed'] for c in client_stats)
        total_paid = sum(c['total_amount_paid'] for c in client_stats)
        avg_per_night = round(total_paid / total_days, 2) if total_days > 0 else 0.0
        
        general_stats = {
            'total_reservations': total_reservations,
            'total_days_stayed': total_days,
            'total_amount_paid': total_paid,
            'average_price_per_night': avg_per_night,
        }
        
        return Response({
            **rankings,
            'general_stats': general_stats,
        })
    
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
                # Check if client with same CPF already exists (only if CPF is provided)
                cpf = client_data.get('cpf', '').strip()
                existing = None
                
                if cpf:
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
