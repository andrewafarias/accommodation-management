from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'cpf', 'phone', 'email', 'created_at')
    search_fields = ('full_name', 'cpf', 'email', 'phone')
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')

