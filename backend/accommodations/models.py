from django.db import models


class AccommodationUnit(models.Model):
    """
    AccommodationUnit model for managing physical rental spaces.
    """
    
    # Unit type choices
    CHALET = 'CHALET'
    SUITE = 'SUITE'
    ROOM = 'ROOM'
    APARTMENT = 'APARTMENT'
    
    UNIT_TYPE_CHOICES = [
        (CHALET, 'Chalet'),
        (SUITE, 'Suite'),
        (ROOM, 'Room'),
        (APARTMENT, 'Apartment'),
    ]
    
    # Status choices
    CLEAN = 'CLEAN'
    DIRTY = 'DIRTY'
    INSPECTING = 'INSPECTING'
    
    STATUS_CHOICES = [
        (CLEAN, 'Clean'),
        (DIRTY, 'Dirty'),
        (INSPECTING, 'Inspecting'),
    ]
    
    name = models.CharField(max_length=100, unique=True, verbose_name="Name")
    type = models.CharField(
        max_length=20,
        choices=UNIT_TYPE_CHOICES,
        default=CHALET,
        verbose_name="Type"
    )
    max_capacity = models.PositiveIntegerField(
        verbose_name="Max Capacity",
        help_text="Maximum number of guests"
    )
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Base Price (BRL)",
        help_text="Base daily rate in Brazilian Reais"
    )
    weekend_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Weekend Price (BRL)",
        help_text="Daily rate for weekends (Fri, Sat, Sun) in Brazilian Reais"
    )
    holiday_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Holiday Price (BRL)",
        help_text="Daily rate for holidays in Brazilian Reais"
    )
    color_hex = models.CharField(
        max_length=7,
        default='#4A90E2',
        verbose_name="Calendar Color",
        help_text="Hex color code for calendar display (e.g., #FF5733)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=CLEAN,
        verbose_name="Status"
    )
    auto_dirty_days = models.PositiveIntegerField(
        default=3,
        verbose_name="Auto Dirty Days",
        help_text="Number of days after which a clean unit automatically becomes dirty"
    )
    last_cleaned_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Last Cleaned At",
        help_text="Timestamp of when the unit was last cleaned"
    )
    
    # Custom check-in/out times per unit
    default_check_in_time = models.TimeField(
        default='14:00',
        verbose_name="Default Check-in Time",
        help_text="Default check-in time for this unit (e.g., 14:00)"
    )
    default_check_out_time = models.TimeField(
        default='12:00',
        verbose_name="Default Check-out Time",
        help_text="Default check-out time for this unit (e.g., 12:00)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Accommodation Unit"
        verbose_name_plural = "Accommodation Units"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
