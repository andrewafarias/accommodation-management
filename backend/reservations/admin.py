from django.contrib import admin
from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('accommodation_unit', 'client', 'check_in', 'check_out', 'status', 'created_at')
    list_filter = ('status', 'check_in', 'check_out')
    search_fields = ('client__full_name', 'accommodation_unit__name')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'check_in'

