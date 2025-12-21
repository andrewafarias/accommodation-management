from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
import json
import csv
from io import StringIO
from .models import Transaction
from .serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Transaction resources.
    
    Supports filtering by due_date range and transaction_type.
    """
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['transaction_type', 'category', 'payment_method']
    ordering_fields = ['due_date', 'amount', 'created_at']
    ordering = ['-due_date']
    
    def get_queryset(self):
        """
        Optionally filter by due_date range (month/year).
        """
        queryset = super().get_queryset()
        
        # Filter by due_date range
        due_date_start = self.request.query_params.get('due_date_start', None)
        due_date_end = self.request.query_params.get('due_date_end', None)
        
        if due_date_start:
            queryset = queryset.filter(due_date__gte=due_date_start)
        if due_date_end:
            queryset = queryset.filter(due_date__lte=due_date_end)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def export_data(self, request):
        """
        Export all transactions to JSON or CSV format.
        Query param: export_format (json or csv, default: json)
        """
        export_format = request.query_params.get('export_format', 'json').lower()
        transactions = self.get_queryset()
        serializer = self.get_serializer(transactions, many=True)
        data = serializer.data
        
        # Prepare export data
        export_data = []
        for trans in data:
            export_item = {
                'amount': trans.get('amount', '0.00'),
                'transaction_type': trans.get('transaction_type', 'INCOME'),
                'category': trans.get('category', 'LODGING'),
                'payment_method': trans.get('payment_method', 'PIX'),
                'due_date': trans.get('due_date', ''),
                'paid_date': trans.get('paid_date', ''),
                'description': trans.get('description', ''),
                'notes': trans.get('notes', ''),
            }
            export_data.append(export_item)
        
        if export_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="financials.csv"'
            
            if export_data:
                writer = csv.DictWriter(response, fieldnames=[
                    'amount', 'transaction_type', 'category', 'payment_method',
                    'due_date', 'paid_date', 'description', 'notes'
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
            response['Content-Disposition'] = 'attachment; filename="financials.json"'
            return response
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def import_data(self, request):
        """
        Import transactions from JSON or CSV format.
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
                {'error': 'Data must be a list of transactions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for idx, trans_data in enumerate(data):
            try:
                # Clean up empty paid_date
                if trans_data.get('paid_date') == '':
                    trans_data['paid_date'] = None
                
                serializer = TransactionSerializer(data=trans_data)
                
                if serializer.is_valid():
                    serializer.save()
                    imported_count += 1
                else:
                    errors.append({
                        'index': idx,
                        'data': trans_data,
                        'errors': serializer.errors
                    })
            except Exception as e:
                errors.append({
                    'index': idx,
                    'data': trans_data,
                    'errors': str(e)
                })
        
        return Response({
            'imported': imported_count,
            'errors': errors
        }, status=status.HTTP_200_OK if imported_count > 0 else status.HTTP_400_BAD_REQUEST)
