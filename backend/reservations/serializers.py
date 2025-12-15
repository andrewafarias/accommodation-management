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
    
    # Computed read-only fields
    amount_remaining = serializers.ReadOnlyField()
    is_fully_paid = serializers.ReadOnlyField()
    
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
            'amount_paid',
            'amount_remaining',
            'is_fully_paid',
            'payment_history',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'accommodation_unit_details', 'client_details', 'amount_remaining', 'is_fully_paid', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """
        Customize the output representation to include nested objects.
        """
        representation = super().to_representation(instance)
        # Move nested details to replace the ID fields for cleaner output
        representation['client'] = representation.pop('client_details')
        representation['accommodation_unit'] = representation.pop('accommodation_unit_details')
        return representation
    
    def check_tight_turnaround(self, accommodation_unit, check_in):
        """
        Check if there's a checkout within 2 hours before the check-in.
        Returns a warning message if tight turnaround is detected.
        """
        from datetime import timedelta
        
        # Find the most recent checkout for the same unit before this check-in
        previous_reservation = Reservation.objects.filter(
            accommodation_unit=accommodation_unit,
            check_out__lte=check_in,
            check_out__gte=check_in - timedelta(hours=2)
        ).exclude(
            status=Reservation.CANCELLED
        ).exclude(
            pk=self.instance.pk if self.instance else None
        ).order_by('-check_out').first()
        
        if previous_reservation:
            time_diff = check_in - previous_reservation.check_out
            minutes = int(time_diff.total_seconds() / 60)
            hours = minutes // 60
            remaining_minutes = minutes % 60
            
            return (
                f"AVISO: Pouco tempo entre reservas! "
                f"A reserva anterior de {previous_reservation.client.full_name} "
                f"tem check-out em {previous_reservation.check_out.strftime('%d/%m/%Y %H:%M')}, "
                f"apenas {hours}h{remaining_minutes}min antes do check-in desta reserva."
            )
        
        return None
    
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
        
        # Check for tight turnaround (warning, not error)
        warning = self.check_tight_turnaround(
            attrs.get('accommodation_unit', getattr(self.instance, 'accommodation_unit', None)),
            attrs.get('check_in', getattr(self.instance, 'check_in', None))
        )
        if warning:
            # Store warning to be returned in response (won't block the save)
            self.context['tight_turnaround_warning'] = warning
        
        return attrs
