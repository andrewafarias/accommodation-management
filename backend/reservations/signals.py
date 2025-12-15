from django.db.models.signals import post_save, pre_delete, pre_save
from django.dispatch import receiver
from .models import Reservation
from decimal import Decimal


@receiver(pre_save, sender=Reservation)
def handle_reservation_status_change(sender, instance, **kwargs):
    """
    Handle status changes before saving.
    
    Business Logic:
    - If status is being changed to CANCELLED, delete unpaid transactions
    - Auto-confirm when payment goes from 0 to > 0
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
            
            # Auto-confirm when payment goes from 0 to > 0
            old_paid = old_instance.amount_paid or Decimal('0')
            new_paid = instance.amount_paid or Decimal('0')
            
            if old_paid == Decimal('0') and new_paid > Decimal('0'):
                if instance.status == Reservation.PENDING:
                    instance.status = Reservation.CONFIRMED
                    print(f"[SIGNAL DEBUG] Reservation #{instance.pk} auto-confirmed due to payment")
                    
        except Reservation.DoesNotExist:
            # This shouldn't happen, but just in case
            pass


@receiver(post_save, sender=Reservation)
def create_financial_transaction(sender, instance, created, **kwargs):
    """
    Auto-create a financial transaction when a reservation is created or confirmed.
    
    Business Logic:
    - Create INCOME transaction immediately when reservation is created (if price set)
    - Link the transaction to the reservation
    - Use the total_price from the reservation
    - Set due_date to check_in date
    - Auto-mark transaction as paid when reservation is fully paid
    """
    # Import here to avoid circular imports
    from financials.models import Transaction
    from datetime import date
    
    # Create transaction for any reservation that has a price set
    if instance.total_price and instance.status != Reservation.CANCELLED:
        print(f"[SIGNAL DEBUG] Reservation #{instance.pk} has price ({instance.total_price})")
        
        # Check if transaction already exists for this reservation
        existing_transaction = Transaction.objects.filter(
            reservation=instance,
            transaction_type=Transaction.INCOME
        ).first()
        
        if not existing_transaction:
            # Create new income transaction immediately on creation
            print(f"[SIGNAL DEBUG] Creating new transaction for reservation #{instance.pk}")
            Transaction.objects.create(
                reservation=instance,
                amount=instance.total_price,
                transaction_type=Transaction.INCOME,
                category=Transaction.LODGING,
                payment_method=Transaction.PIX,  # Default, can be changed later
                due_date=instance.check_in.date(),
                description=f"Res. nº {instance.pk} de {instance.client.full_name}, {instance.check_in.strftime('%d/%m/%y')} até {instance.check_out.strftime('%d/%m/%y')} em {instance.accommodation_unit.name}",
                # Auto-mark as paid if reservation is fully paid
                paid_date=date.today() if instance.is_fully_paid else None
            )
            print(f"[SIGNAL DEBUG] Transaction created successfully for reservation #{instance.pk}")
        else:
            # Update existing transaction's paid status based on reservation payment
            if instance.is_fully_paid and not existing_transaction.paid_date:
                existing_transaction.paid_date = date.today()
                existing_transaction.save()
                print(f"[SIGNAL DEBUG] Transaction #{existing_transaction.pk} marked as paid")
            elif not instance.is_fully_paid and existing_transaction.paid_date:
                # If payment was reversed, unmark as paid
                existing_transaction.paid_date = None
                existing_transaction.save()
                print(f"[SIGNAL DEBUG] Transaction #{existing_transaction.pk} unmarked as paid")
    else:
        if not instance.total_price:
            print(f"[SIGNAL DEBUG] Reservation #{instance.pk} has no total_price set")
        if instance.status == Reservation.CANCELLED:
            print(f"[SIGNAL DEBUG] Reservation #{instance.pk} is cancelled, no transaction created")


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

