from rest_framework import serializers
from .models import Client, DocumentAttachment
import json


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    """
    Serializer for DocumentAttachment model.
    """
    class Meta:
        model = DocumentAttachment
        fields = ['id', 'file', 'filename', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for Client model.
    Includes all fields for both read and write operations.
    Handles tags field when submitted as JSON string from FormData.
    Includes related document_attachments.
    """
    document_attachments = DocumentAttachmentSerializer(many=True, read_only=True)
    
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
            'document_attachments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
