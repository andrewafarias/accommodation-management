from django.contrib import admin
from .models import AccommodationUnit, DatePriceOverride, DatePackage


@admin.register(AccommodationUnit)
class AccommodationUnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'max_capacity', 'base_price', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'short_description', 'long_description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'max_capacity', 'color_hex', 'status', 'display_order')
        }),
        ('Preços', {
            'fields': ('base_price', 'weekend_price', 'holiday_price')
        }),
        ('Horários', {
            'fields': ('default_check_in_time', 'default_check_out_time')
        }),
        ('Limpeza', {
            'fields': ('auto_dirty_days', 'last_cleaned_at')
        }),
        ('Descrições e Regras', {
            'fields': ('short_description', 'long_description', 'rules'),
            'description': 'Campos com suporte a formato Markdown'
        }),
        ('Fotos', {
            'fields': ('album_photos',)
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DatePriceOverride)
class DatePriceOverrideAdmin(admin.ModelAdmin):
    list_display = ['accommodation_unit', 'date', 'price', 'created_at']
    list_filter = ['accommodation_unit', 'date']
    search_fields = ['accommodation_unit__name']
    date_hierarchy = 'date'
    ordering = ['-date', 'accommodation_unit']


@admin.register(DatePackage)
class DatePackageAdmin(admin.ModelAdmin):
    list_display = ['name', 'accommodation_unit', 'start_date', 'end_date', 'color', 'created_at']
    list_filter = ['accommodation_unit', 'name']
    search_fields = ['name', 'accommodation_unit__name']
    date_hierarchy = 'start_date'
    ordering = ['-created_at']

