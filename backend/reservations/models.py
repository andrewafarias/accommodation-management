from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Reservation(models.Model):
    """
    Reservation model for managing bookings.
    CRITICAL: Includes overlap validation to prevent double bookings.
    """
    
    # Status choices
    PENDING = 'PENDING'
    CONFIRMED = 'CONFIRMED'
    CHECKED_IN = 'CHECKED_IN'
    CHECKED_OUT = 'CHECKED_OUT'
    CANCELLED = 'CANCELLED'
    
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (CONFIRMED, 'Confirmed'),
        (CHECKED_IN, 'Checked-in'),
        (CHECKED_OUT, 'Checked-out'),
        (CANCELLED, 'Cancelled'),
    ]
    
    # Foreign Keys
    accommodation_unit = models.ForeignKey(
        'accommodations.AccommodationUnit',
        on_delete=models.PROTECT,
        related_name='reservations',
        verbose_name="Accommodation Unit"
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.PROTECT,
        related_name='reservations',
        verbose_name="Client"
    )
    
    # Booking details
    check_in = models.DateTimeField(verbose_name="Check-in Date/Time")
    check_out = models.DateTimeField(verbose_name="Check-out Date/Time")
    guest_count_adults = models.PositiveIntegerField(
        default=1,
        verbose_name="Adult Guests"
    )
    guest_count_children = models.PositiveIntegerField(
        default=0,
        verbose_name="Children Guests"
    )
    
    # Pricing - manual override support
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Total Price (BRL)",
        help_text="Manual price override. If not set, will be calculated automatically."
    )
    price_breakdown = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Price Breakdown",
        help_text="List of price items: [{'name': 'Diária', 'value': 100.00, 'quantity': 1}, ...]"
    )
    
    # Payment pool - track paid vs required amounts
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Amount Paid (BRL)",
        help_text="Total amount already paid by the client"
    )
    payment_history = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Payment History",
        help_text="List of payment entries: [{'date': '...', 'amount': ..., 'method': '...'}, ...]"
    )
    
    # Reservation status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
        verbose_name="Status"
    )
    
    # Additional info
    notes = models.TextField(blank=True, null=True, verbose_name="Notes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Reservation"
        verbose_name_plural = "Reservations"
        ordering = ['-check_in']
    
    def __str__(self):
        return f"{self.accommodation_unit.name} - {self.client.full_name} ({self.check_in.strftime('%d/%m/%Y')} to {self.check_out.strftime('%d/%m/%Y')})"
    
    @property
    def amount_remaining(self):
        """Calculate remaining amount to be paid."""
        if self.total_price is None:
            return 0
        return max(0, self.total_price - self.amount_paid)
    
    @property
    def is_fully_paid(self):
        """Check if reservation is fully paid."""
        if self.total_price is None or self.total_price == 0:
            return False
        return self.amount_paid >= self.total_price
    
    def clean(self):
        """
        CRITICAL: Validate that there are no overlapping reservations for the same unit.
        This prevents double bookings.
        """
        super().clean()
        
        # Validate check-out is after check-in
        if self.check_out <= self.check_in:
            raise ValidationError({
                'check_out': 'Check-out date must be after check-in date.'
            })
        
        # Check for overlapping reservations
        # Two reservations overlap if:
        # - One starts before the other ends AND
        # - One ends after the other starts
        # We exclude cancelled reservations from overlap checks
        overlapping = Reservation.objects.filter(
            accommodation_unit=self.accommodation_unit
        ).exclude(
            status=self.CANCELLED
        ).exclude(
            pk=self.pk  # Exclude self when updating existing reservation
        ).filter(
            check_in__lt=self.check_out,
            check_out__gt=self.check_in
        )
        
        if overlapping.exists():
            # Build friendly error message (as per requirement)
            conflicts = []
            for reservation in overlapping:
                conflicts.append(
                    f"Esta reserva está conflitando com a de {reservation.client.full_name}, "
                    f"entrada dia {reservation.check_in.strftime('%d/%m/%Y %H:%M')} e "
                    f"saída {reservation.check_out.strftime('%d/%m/%Y %H:%M')}."
                )
            
            raise ValidationError({
                'check_in': ' '.join(conflicts)
            })
    
    def save(self, *args, **kwargs):
        """
        Override save to call clean() validation and handle auto-dirty status.
        """
        # Always call clean before saving
        self.full_clean()
        
        # Auto-mark unit as dirty on checkout
        if self.status == self.CHECKED_OUT:
            self.accommodation_unit.status = 'DIRTY'
            self.accommodation_unit.save()
        
        super().save(*args, **kwargs)

