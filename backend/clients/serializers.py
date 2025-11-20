from rest_framework import serializers
from .models import Client
import json


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for Client model.
    Includes all fields for both read and write operations.
    Handles tags field when submitted as JSON string from FormData.
    """
    
    def validate_tags(self, value):
        """Handle tags field when it comes as a JSON string from FormData."""
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Tags must be a valid JSON array")
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
            'document_file',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
