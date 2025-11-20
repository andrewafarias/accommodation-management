from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for Client model.
    Includes all fields for both read and write operations.
    """
    
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
