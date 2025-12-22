from rest_framework import serializers
from .models import Client, DocumentAttachment
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
    Manipula campo tags quando submetido como string JSON do FormData.
    Inclui document_attachments relacionados.
    CPF é opcional.
    """
    document_attachments = DocumentAttachmentSerializer(many=True, read_only=True)
    
    def validate_tags(self, value):
        """Manipula campo tags quando vem como string JSON do FormData."""
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Tags devem ser um array JSON válido")
        return value
    
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
