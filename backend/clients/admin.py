from django.contrib import admin
from .models import Client, DocumentAttachment


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'cpf', 'phone', 'email', 'created_at')
    search_fields = ('full_name', 'cpf', 'email', 'phone')
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DocumentAttachment)
class DocumentAttachmentAdmin(admin.ModelAdmin):
    list_display = ('filename', 'client', 'uploaded_at')
    search_fields = ('filename', 'client__full_name')
    list_filter = ('uploaded_at',)
    readonly_fields = ('uploaded_at',)

