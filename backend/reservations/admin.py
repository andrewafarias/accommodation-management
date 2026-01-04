from django.contrib import admin
from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('accommodation_unit', 'client', 'check_in', 'check_out', 'status', 'created_at')
    list_filter = ('status', 'check_in', 'check_out')
    search_fields = ('client__full_name', 'accommodation_unit__name', 'notes')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'check_in'
    fieldsets = (
        ('Informações da Reserva', {
            'fields': ('accommodation_unit', 'client', 'status')
        }),
        ('Datas', {
            'fields': ('check_in', 'check_out')
        }),
        ('Hóspedes', {
            'fields': ('guest_count_adults', 'guest_count_children', 'pet_count')
        }),
        ('Preço e Pagamento', {
            'fields': ('total_price', 'price_breakdown', 'amount_paid', 'payment_history')
        }),
        ('Observações', {
            'fields': ('notes',)
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

