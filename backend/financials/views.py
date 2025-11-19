from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
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
