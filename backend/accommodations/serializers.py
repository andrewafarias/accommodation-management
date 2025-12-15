from rest_framework import serializers
from .models import AccommodationUnit


class AccommodationUnitSerializer(serializers.ModelSerializer):
    """
    Serializer for AccommodationUnit model.
    Includes all fields for both read and write operations.
    """
    
    class Meta:
        model = AccommodationUnit
        fields = [
            'id',
            'name',
            'type',
            'max_capacity',
            'base_price',
            'color_hex',
            'status',
            'auto_dirty_days',
            'last_cleaned_at',
            'default_check_in_time',
            'default_check_out_time',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
