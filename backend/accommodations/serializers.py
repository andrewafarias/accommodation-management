from rest_framework import serializers
from .models import AccommodationUnit, DatePriceOverride, DatePackage, UnitImage


class UnitImageSerializer(serializers.ModelSerializer):
    """
    Serializer for UnitImage model.
    Handles image file uploads.
    """
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UnitImage
        fields = [
            'id',
            'accommodation_unit',
            'image',
            'image_url',
            'order',
            'caption',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'image_url']
    
    def get_image_url(self, obj):
        """Return the full URL for the image."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class AccommodationUnitSerializer(serializers.ModelSerializer):
    """
    Serializador para modelo AccommodationUnit.
    Inclui todos os campos para operações de leitura e escrita.
    """
    images = UnitImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = AccommodationUnit
        fields = [
            'id',
            'name',
            'max_capacity',
            'base_price',
            'weekend_price',
            'holiday_price',
            'color_hex',
            'status',
            'auto_dirty_days',
            'last_cleaned_at',
            'default_check_in_time',
            'default_check_out_time',
            'display_order',
            'short_description',
            'long_description',
            'rules',
            'album_photos',
            'images',
            'location',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'images']


class DatePriceOverrideSerializer(serializers.ModelSerializer):
    """
    Serializador para modelo DatePriceOverride.
    Suporta criação em lote de substituições de preço.
    """
    accommodation_unit_name = serializers.CharField(source='accommodation_unit.name', read_only=True)
    
    class Meta:
        model = DatePriceOverride
        fields = [
            'id',
            'accommodation_unit',
            'accommodation_unit_name',
            'date',
            'price',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'accommodation_unit_name']
    
    def validate_price(self, value):
        """Ensure price is positive."""
        if value <= 0:
            raise serializers.ValidationError("O preço deve ser maior que zero.")
        return value


class DatePackageSerializer(serializers.ModelSerializer):
    """
    Serializador para modelo DatePackage.
    Suporta criação em lote de pacotes.
    """
    accommodation_unit_name = serializers.CharField(source='accommodation_unit.name', read_only=True)
    
    class Meta:
        model = DatePackage
        fields = [
            'id',
            'accommodation_unit',
            'accommodation_unit_name',
            'name',
            'start_date',
            'end_date',
            'color',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'accommodation_unit_name']
    
    def validate(self, data):
        """Ensure end_date is after start_date."""
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError({
                    'end_date': 'A data final deve ser posterior à data inicial.'
                })
        return data
