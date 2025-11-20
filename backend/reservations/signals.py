from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import Reservation


@receiver(post_save, sender=Reservation)
def create_financial_transaction(sender, instance, created, **kwargs):
    """
    Auto-create a financial transaction when a reservation is confirmed.
    
    Business Logic:
    - When a reservation is saved with status CONFIRMED, create an INCOME transaction
    - Link the transaction to the reservation
    - Use the total_price from the reservation
    - Set due_date to check_in date
    """
    # Import here to avoid circular imports
    from financials.models import Transaction
    
    # Only create transaction for confirmed reservations that have a price
    if instance.status == Reservation.CONFIRMED and instance.total_price:
        # Check if transaction already exists for this reservation
        existing_transaction = Transaction.objects.filter(
            reservation=instance,
            transaction_type=Transaction.INCOME
        ).first()
        
        if not existing_transaction:
            # Create new income transaction
            Transaction.objects.create(
                reservation=instance,
                amount=instance.total_price,
                transaction_type=Transaction.INCOME,
                category=Transaction.LODGING,
                payment_method=Transaction.PIX,  # Default, can be changed later
                due_date=instance.check_in.date(),
                description=f"Reserva #{instance.pk} - {instance.accommodation_unit.name} - {instance.client.full_name}"
            )


@receiver(pre_delete, sender=Reservation)
def delete_related_transactions(sender, instance, **kwargs):
    """
    When a reservation is deleted, also delete related financial transactions.
    
    Business Logic:
    - Delete all transactions linked to this reservation
    """
    # Import here to avoid circular imports
    from financials.models import Transaction
    
    # Delete all transactions related to this reservation
    Transaction.objects.filter(reservation=instance).delete()


def handle_reservation_cancellation(reservation):
    """
    Handle financial transaction when reservation is cancelled.
    
    This can be called from the serializer or view when status changes to CANCELLED.
    
    Business Logic:
    - Delete or mark as cancelled any unpaid transactions
    - For paid transactions, you may want to create a refund transaction (future enhancement)
    """
    # Import here to avoid circular imports
    from financials.models import Transaction
    
    # Delete unpaid transactions linked to this reservation
    Transaction.objects.filter(
        reservation=reservation,
        paid_date__isnull=True
    ).delete()
    
    # Note: For paid transactions, consider creating a refund record
    # This is left for future enhancement based on business requirements
