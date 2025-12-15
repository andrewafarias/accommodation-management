from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from reservations.models import Reservation
from accommodations.models import AccommodationUnit
from clients.models import Client
from financials.models import Transaction


class ReservationSignalTest(TestCase):
    """Test that signals correctly create/delete financial transactions"""
    
    def setUp(self):
        """Create test data"""
        self.client = Client.objects.create(
            full_name="Test Client",
            cpf="123.456.789-00",
            phone="+55 11 99999-9999"
        )
        
        self.unit = AccommodationUnit.objects.create(
            name="Test Unit",
            type="CHALET",
            max_capacity=4,
            base_price=Decimal("500.00")
        )
        
        self.now = timezone.now()
    
    def test_confirmed_reservation_creates_transaction(self):
        """Test that creating a confirmed reservation with price creates a transaction"""
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.CONFIRMED,
            total_price=Decimal("1000.00")
        )
        
        # Check that transaction was created
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 1)
        
        transaction = transactions.first()
        self.assertEqual(transaction.transaction_type, Transaction.INCOME)
        self.assertEqual(transaction.amount, Decimal("1000.00"))
        self.assertEqual(transaction.category, Transaction.LODGING)
        self.assertEqual(transaction.reservation, reservation)
    
    def test_pending_reservation_with_price_creates_transaction(self):
        """Test that pending reservations with price DO create transactions (new behavior)"""
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.PENDING,
            total_price=Decimal("1000.00")
        )
        
        # Check that transaction was created immediately
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 1)
        self.assertEqual(transactions.first().amount, Decimal("1000.00"))
    
    def test_confirmed_reservation_without_price_does_not_create_transaction(self):
        """Test that confirmed reservations without price don't create transactions"""
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.CONFIRMED,
            total_price=None
        )
        
        # Check that no transaction was created
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 0)
    
    def test_deleting_reservation_deletes_transaction(self):
        """Test that deleting a reservation also deletes its transactions"""
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.CONFIRMED,
            total_price=Decimal("1000.00")
        )
        
        # Verify transaction was created
        self.assertEqual(Transaction.objects.filter(reservation=reservation).count(), 1)
        
        # Delete reservation
        reservation_id = reservation.id
        reservation.delete()
        
        # Check that transaction was also deleted
        transactions = Transaction.objects.filter(reservation_id=reservation_id)
        self.assertEqual(transactions.count(), 0)
    
    def test_updating_confirmed_reservation_does_not_duplicate_transaction(self):
        """Test that updating a confirmed reservation doesn't create duplicate transactions"""
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.CONFIRMED,
            total_price=Decimal("1000.00")
        )
        
        # Verify one transaction was created
        self.assertEqual(Transaction.objects.filter(reservation=reservation).count(), 1)
        
        # Update reservation
        reservation.check_out = self.now + timedelta(days=3)
        reservation.save()
        
        # Verify still only one transaction exists
        self.assertEqual(Transaction.objects.filter(reservation=reservation).count(), 1)
    
    def test_checked_in_reservation_creates_transaction(self):
        """Test that creating a checked-in reservation with price creates a transaction"""
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.CHECKED_IN,
            total_price=Decimal("1000.00")
        )
        
        # Check that transaction was created
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 1)
        
        transaction = transactions.first()
        self.assertEqual(transaction.transaction_type, Transaction.INCOME)
        self.assertEqual(transaction.amount, Decimal("1000.00"))
        self.assertEqual(transaction.category, Transaction.LODGING)
        self.assertEqual(transaction.reservation, reservation)
    
    def test_checked_out_reservation_creates_transaction(self):
        """Test that creating a checked-out reservation with price creates a transaction"""
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.CHECKED_OUT,
            total_price=Decimal("1000.00")
        )
        
        # Check that transaction was created
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 1)
        
        transaction = transactions.first()
        self.assertEqual(transaction.transaction_type, Transaction.INCOME)
        self.assertEqual(transaction.amount, Decimal("1000.00"))
        self.assertEqual(transaction.category, Transaction.LODGING)
        self.assertEqual(transaction.reservation, reservation)
    
    def test_cancelling_reservation_deletes_unpaid_transactions(self):
        """Test that changing status to CANCELLED deletes unpaid transactions"""
        # Create a confirmed reservation (which creates a transaction)
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.CONFIRMED,
            total_price=Decimal("1000.00")
        )
        
        # Verify transaction was created
        self.assertEqual(Transaction.objects.filter(reservation=reservation).count(), 1)
        
        # Cancel the reservation
        reservation.status = Reservation.CANCELLED
        reservation.save()
        
        # Check that unpaid transaction was deleted
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 0)
    
    def test_cancelling_reservation_keeps_paid_transactions(self):
        """Test that changing status to CANCELLED keeps paid transactions"""
        # Create a confirmed reservation (which creates a transaction)
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.CONFIRMED,
            total_price=Decimal("1000.00")
        )
        
        # Verify transaction was created and mark it as paid
        transaction = Transaction.objects.filter(reservation=reservation).first()
        self.assertIsNotNone(transaction)
        transaction.paid_date = self.now.date()
        transaction.save()
        
        # Cancel the reservation
        reservation.status = Reservation.CANCELLED
        reservation.save()
        
        # Check that paid transaction still exists
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 1)
    
    def test_pending_to_confirmed_does_not_duplicate_transaction(self):
        """Test that changing status from PENDING to CONFIRMED doesn't duplicate transaction"""
        # Create a pending reservation - transaction is created immediately now
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.PENDING,
            total_price=Decimal("1000.00")
        )
        
        # Verify transaction was created immediately
        self.assertEqual(Transaction.objects.filter(reservation=reservation).count(), 1)
        
        # Confirm the reservation
        reservation.status = Reservation.CONFIRMED
        reservation.save()
        
        # Check that no duplicate transaction was created
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 1)
        
        transaction = transactions.first()
        self.assertEqual(transaction.transaction_type, Transaction.INCOME)
        self.assertEqual(transaction.amount, Decimal("1000.00"))
    
    def test_transaction_description_format(self):
        """Test that transaction description follows the required format"""
        # Create a reservation with known dates
        check_in = timezone.datetime(2025, 12, 20, 14, 0, 0, tzinfo=timezone.get_current_timezone())
        check_out = timezone.datetime(2025, 12, 22, 10, 0, 0, tzinfo=timezone.get_current_timezone())
        
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=check_in,
            check_out=check_out,
            status=Reservation.CONFIRMED,
            total_price=Decimal("1000.00")
        )
        
        # Get the created transaction
        transaction = Transaction.objects.filter(reservation=reservation).first()
        self.assertIsNotNone(transaction)
        
        # Expected format: "Res. nº [id] de [Nome do cliente], xx/xx/xx até yy/yy/yy em [Nome da unidade]"
        expected_description = f"Res. nº {reservation.pk} de Test Client, 20/12/25 até 22/12/25 em Test Unit"
        self.assertEqual(transaction.description, expected_description)
