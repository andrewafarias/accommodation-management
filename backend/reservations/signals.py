from django.db.models.signals import post_save, pre_delete, pre_save
from django.dispatch import receiver
from .models import Reservation


@receiver(pre_save, sender=Reservation)
def handle_reservation_status_change(sender, instance, **kwargs):
    """
    Handle status changes before saving, particularly for cancellations.
    
    Business Logic:
    - If status is being changed to CANCELLED, delete unpaid transactions
    """
    # Import here to avoid circular imports
    from financials.models import Transaction
    
    # Only process if this is an update (not a new reservation)
    if instance.pk:
        try:
            old_instance = Reservation.objects.get(pk=instance.pk)
            
            # Check if status is being changed to CANCELLED
            if old_instance.status != Reservation.CANCELLED and instance.status == Reservation.CANCELLED:
                print(f"[SIGNAL DEBUG] Reservation #{instance.pk} cancelled. Deleting unpaid transactions...")
                
                # Delete unpaid transactions linked to this reservation
                deleted_count = Transaction.objects.filter(
                    reservation=instance,
                    paid_date__isnull=True
                ).delete()[0]
                
                print(f"[SIGNAL DEBUG] Deleted {deleted_count} unpaid transaction(s) for reservation #{instance.pk}")
        except Reservation.DoesNotExist:
            # This shouldn't happen, but just in case
            pass


@receiver(post_save, sender=Reservation)
def create_financial_transaction(sender, instance, created, **kwargs):
    """
    Auto-create a financial transaction when a reservation is confirmed, checked-in, or checked-out.
    
    Business Logic:
    - When a reservation is saved with status CONFIRMED, CHECKED_IN, or CHECKED_OUT, create an INCOME transaction
    - Link the transaction to the reservation
    - Use the total_price from the reservation
    - Set due_date to check_in date
    """
    # Import here to avoid circular imports
    from financials.models import Transaction
    
    # Create transaction for paid/active reservations that have a price
    # Trigger on CONFIRMED, CHECKED_IN, or CHECKED_OUT
    valid_statuses = [Reservation.CONFIRMED, Reservation.CHECKED_IN, Reservation.CHECKED_OUT]
    
    if instance.status in valid_statuses and instance.total_price:
        print(f"[SIGNAL DEBUG] Reservation #{instance.pk} has valid status ({instance.status}) and price ({instance.total_price})")
        
        # Check if transaction already exists for this reservation
        existing_transaction = Transaction.objects.filter(
            reservation=instance,
            transaction_type=Transaction.INCOME
        ).first()
        
        if not existing_transaction:
            # Create new income transaction
            print(f"[SIGNAL DEBUG] Creating new transaction for reservation #{instance.pk}")
            Transaction.objects.create(
                reservation=instance,
                amount=instance.total_price,
                transaction_type=Transaction.INCOME,
                category=Transaction.LODGING,
                payment_method=Transaction.PIX,  # Default, can be changed later
                due_date=instance.check_in.date(),
                description=f"Reserva #{instance.pk} - {instance.accommodation_unit.name} - {instance.client.full_name}"
            )
            print(f"[SIGNAL DEBUG] Transaction created successfully for reservation #{instance.pk}")
        else:
            print(f"[SIGNAL DEBUG] Transaction already exists for reservation #{instance.pk} (ID: {existing_transaction.pk})")
    else:
        if instance.status not in valid_statuses:
            print(f"[SIGNAL DEBUG] Reservation #{instance.pk} status ({instance.status}) not in valid statuses for transaction creation")
        if not instance.total_price:
            print(f"[SIGNAL DEBUG] Reservation #{instance.pk} has no total_price set")


@receiver(pre_delete, sender=Reservation)
def delete_related_transactions(sender, instance, **kwargs):
    """
    When a reservation is deleted, also delete related financial transactions.
    
    Business Logic:
    - Delete all transactions linked to this reservation
    """
    # Import here to avoid circular imports
    from financials.models import Transaction
    
    print(f"[SIGNAL DEBUG] Reservation #{instance.pk} being deleted. Deleting all related transactions...")
    # Delete all transactions related to this reservation
    deleted_count = Transaction.objects.filter(reservation=instance).delete()[0]
    print(f"[SIGNAL DEBUG] Deleted {deleted_count} transaction(s) for reservation #{instance.pk}")
