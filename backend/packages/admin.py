from django.contrib import admin
from .models import Package


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    """
    Admin interface for Package model.
    """
    list_display = ['name', 'package_price', 'is_active', 'unit_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    filter_horizontal = ['accommodation_units']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        ('Informações Básicas', {
            'fields': ['name', 'description', 'is_active']
        }),
        ('Unidades e Preços', {
            'fields': ['accommodation_units', 'package_price']
        }),
        ('Metadados', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]
    
    def unit_count(self, obj):
        """Display number of units in package."""
        return obj.unit_count
    unit_count.short_description = 'Nº de Unidades'
