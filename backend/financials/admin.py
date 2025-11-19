from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_type', 'amount', 'category', 'payment_method', 'due_date', 'is_paid', 'reservation')
    list_filter = ('transaction_type', 'category', 'payment_method', 'due_date')
    search_fields = ('description', 'reservation__client__full_name')
    readonly_fields = ('created_at', 'updated_at', 'is_paid')
    date_hierarchy = 'due_date'

