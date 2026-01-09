from rest_framework import serializers
from .models import Client, DocumentAttachment
from django.db.models import Count, Sum, Avg, F, ExpressionWrapper, DecimalField
from decimal import Decimal
import json


class FlexibleTagsField(serializers.ListField):
    """
    Custom field that accepts tags as a list, JSON string, or comma-separated string.
    """
    def __init__(self, **kwargs):
        kwargs.setdefault('child', serializers.CharField(allow_blank=True))
        kwargs.setdefault('required', False)
        kwargs.setdefault('allow_empty', True)
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        """Convert various tag formats to a list."""
        # Handle string input (JSON or comma-separated)
        if isinstance(data, str):
            return self._parse_string_tags(data)
        # Handle list input
        elif isinstance(data, list):
            # Check if it's a list with a single element that is a string
            if len(data) == 1 and isinstance(data[0], str):
                # Try to parse as JSON array first (must start with '[')
                if data[0].strip().startswith('['):
                    try:
                        parsed = json.loads(data[0])
                        if isinstance(parsed, list):
                            return self._validate_tag_list(parsed)
                    except (json.JSONDecodeError, ValueError):
                        # Not valid JSON, treat as regular string
                        pass
                
                # Check if it contains commas (comma-separated tags)
                if ',' in data[0]:
                    return [tag.strip() for tag in data[0].split(',') if tag.strip()]
                # Single tag without commas, treat as a single-element list
                else:
                    tag_str = data[0].strip()
                    return [tag_str] if tag_str else []
            
            # Validate each item in the list (multiple elements or non-string element)
            return self._validate_tag_list(data)
        # Handle None or missing
        elif data is None:
            return []
        # Handle other types
        else:
            return []
    
    def _parse_string_tags(self, tags_str):
        """Parse a string as JSON array or comma-separated tags."""
        tags_str = tags_str.strip()
        if not tags_str:
            return []
        
        # Try to parse as JSON first (for FormData with JSON.stringify)
        try:
            parsed_tags = json.loads(tags_str)
            if isinstance(parsed_tags, list):
                return self._validate_tag_list(parsed_tags)
            else:
                return []
        except (json.JSONDecodeError, ValueError):
            # Fall back to comma-separated parsing
            return [tag.strip() for tag in tags_str.split(',') if tag.strip()]
    
    def _validate_tag_list(self, tags):
        """Validate and clean a list of tags."""
        validated_tags = []
        for tag in tags:
            if tag is not None:
                tag_str = str(tag).strip()
                if tag_str:
                    validated_tags.append(tag_str)
        return validated_tags


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
    tags = FlexibleTagsField(help_text="Lista de etiquetas")
    
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
