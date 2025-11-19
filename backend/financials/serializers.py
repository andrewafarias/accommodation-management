from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for Transaction model.
    Includes all fields for both read and write operations.
    """
    is_paid = serializers.ReadOnlyField()
    
    class Meta:
        model = Transaction
        fields = [
            'id',
            'reservation',
            'amount',
            'transaction_type',
            'category',
            'payment_method',
            'due_date',
            'paid_date',
            'description',
            'notes',
            'is_paid',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_paid', 'created_at', 'updated_at']
