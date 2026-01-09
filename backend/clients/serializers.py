from rest_framework import serializers
from .models import Client, DocumentAttachment
from django.db.models import Count, Sum, Avg, F, ExpressionWrapper, DecimalField
from decimal import Decimal
import json


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    """
    Serializador para modelo DocumentAttachment.
    """
    class Meta:
        model = DocumentAttachment
        fields = ['id', 'file', 'filename', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializador para modelo Client.
    Inclui todos os campos para operações de leitura e escrita.
    Manipula campo tags quando submetido como string comma-separated do FormData.
    Inclui document_attachments relacionados.
    CPF é opcional.
    """
    document_attachments = DocumentAttachmentSerializer(many=True, read_only=True)
    tags = serializers.ListField(
        child=serializers.CharField(allow_blank=True),
        required=False,
        allow_empty=True,
        help_text="Lista de etiquetas"
    )
    
    def to_representation(self, instance):
        """Customize representation to conditionally include statistics."""
        data = super().to_representation(instance)
        
        # Only include stats if explicitly requested
        if self.context.get('include_stats', False):
            try:
                # Calculate statistics
                reservations = instance.reservations.all()
                reservations_count = reservations.count()
                
                # Total days
                total_days = 0
                for res in reservations:
                    if res.check_in and res.check_out:
                        # Convert datetime to date for calculation
                        check_in_date = res.check_in.date() if hasattr(res.check_in, 'date') else res.check_in
                        check_out_date = res.check_out.date() if hasattr(res.check_out, 'date') else res.check_out
                        delta = check_out_date - check_in_date
                        total_days += delta.days
                
                # Total paid
                from django.db.models import Sum
                from decimal import Decimal
                total_paid = float(reservations.aggregate(
                    total=Sum('transactions__amount')
                )['total'] or Decimal('0.00'))
                
                # Average per night
                avg_per_night = round(total_paid / total_days, 2) if total_days > 0 else 0.0
                
                data['reservations_count'] = reservations_count
                data['total_days_stayed'] = total_days
                data['total_amount_paid'] = total_paid
                data['average_price_per_night'] = avg_per_night
            except:
                pass
        
        return data
        total_paid = self.get_total_amount_paid(obj)
        
        if total_days > 0:
            return round(total_paid / total_days, 2)
        return 0.0
    
    def to_internal_value(self, data):
        """Convert tags from comma-separated string to list if necessary."""
        if 'tags' in data:
            if isinstance(data['tags'], str):
                if data['tags'].strip():
                    data['tags'] = [tag.strip() for tag in data['tags'].split(',') if tag.strip()]
                else:
                    data['tags'] = []  # Empty list, not None
            elif not isinstance(data['tags'], list):
                data['tags'] = []
        return super().to_internal_value(data)
    
    def get_default_field_value(self, field_name):
        """Provide default value for tags if not provided."""
        if field_name == 'tags':
            return []
        return super().get_default_field_value(field_name)
    
    def validate_cpf(self, value):
        """Validate CPF field - allow empty string to be converted to None."""
        if value == '' or value is None:
            return None
        return value
    
    class Meta:
        model = Client
        fields = [
            'id',
            'full_name',
            'cpf',
            'phone',
            'email',
            'address',
            'notes',
            'tags',
            'profile_picture',
            'document_attachments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
