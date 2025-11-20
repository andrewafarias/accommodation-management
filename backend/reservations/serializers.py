from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Reservation
from accommodations.serializers import AccommodationUnitSerializer
from clients.serializers import ClientSerializer


class ReservationSerializer(serializers.ModelSerializer):
    """
    Serializer for Reservation model.
    
    Read Logic (GET): Returns nested client and accommodation_unit objects.
    Write Logic (POST/PUT/PATCH): Accepts client and accommodation_unit IDs.
    Validation: Calls model's clean() method to ensure overlap validation.
    """
    # Read-only nested representations for GET requests
    client_details = ClientSerializer(source='client', read_only=True)
    accommodation_unit_details = AccommodationUnitSerializer(source='accommodation_unit', read_only=True)
    
    # Write-only fields for POST/PUT/PATCH requests
    client = serializers.PrimaryKeyRelatedField(
        queryset=__import__('clients.models', fromlist=['Client']).Client.objects.all(),
        write_only=True
    )
    accommodation_unit = serializers.PrimaryKeyRelatedField(
        queryset=__import__('accommodations.models', fromlist=['AccommodationUnit']).AccommodationUnit.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = Reservation
        fields = [
            'id',
            'accommodation_unit',
            'accommodation_unit_details',
            'client',
            'client_details',
            'check_in',
            'check_out',
            'guest_count_adults',
            'guest_count_children',
            'total_price',
            'price_breakdown',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'accommodation_unit_details', 'client_details', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """
        Customize the output representation to include nested objects.
        """
        representation = super().to_representation(instance)
        # Move nested details to replace the ID fields for cleaner output
        representation['client'] = representation.pop('client_details')
        representation['accommodation_unit'] = representation.pop('accommodation_unit_details')
        return representation
    
    def validate(self, attrs):
        """
        Call the model's clean() method to enforce overlap validation.
        This ensures that the API respects the business rule preventing double bookings.
        """
        # For updates (PATCH/PUT), merge new attrs with existing instance values
        if self.instance:
            # Start with existing instance data
            instance = self.instance
            # Update with new attrs
            for key, value in attrs.items():
                setattr(instance, key, value)
        else:
            # For creation, create a new temporary instance
            instance = Reservation(**attrs)
        
        try:
            instance.clean()
        except DjangoValidationError as e:
            # Convert Django ValidationError to DRF ValidationError
            raise serializers.ValidationError(e.message_dict)
        
        return attrs
