from django.contrib import admin
from .models import AccommodationUnit


@admin.register(AccommodationUnit)
class AccommodationUnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'max_capacity', 'base_price', 'status', 'created_at')
    list_filter = ('type', 'status')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')

