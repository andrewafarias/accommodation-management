from rest_framework import serializers
from .models import Package
from accommodations.models import AccommodationUnit
from accommodations.serializers import AccommodationUnitSerializer


class PackageSerializer(serializers.ModelSerializer):
    """
    Serializador para modelo Package.
    Inclui informações das unidades de acomodação associadas.
    """
    accommodation_units = AccommodationUnitSerializer(many=True, read_only=True)
    accommodation_unit_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        source='accommodation_units',
        queryset=AccommodationUnit.objects.all()
    )
    unit_count = serializers.IntegerField(read_only=True)
    total_capacity = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Package
        fields = [
            'id',
            'name',
            'description',
            'accommodation_units',
            'accommodation_unit_ids',
            'package_price',
            'is_active',
            'unit_count',
            'total_capacity',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'unit_count', 'total_capacity']
    
    def validate_accommodation_unit_ids(self, value):
        """Validar que o pacote tenha pelo menos uma unidade."""
        if not value or len(value) == 0:
            raise serializers.ValidationError(
                "O pacote deve ter pelo menos uma unidade de acomodação."
            )
        return value


class PackageListSerializer(serializers.ModelSerializer):
    """
    Serializador simplificado para listagem de pacotes.
    Inclui apenas informações básicas para melhor performance.
    """
    unit_count = serializers.IntegerField(read_only=True)
    total_capacity = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Package
        fields = [
            'id',
            'name',
            'description',
            'package_price',
            'is_active',
            'unit_count',
            'total_capacity',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'unit_count', 'total_capacity']
