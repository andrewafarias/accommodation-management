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
    
    def test_pending_reservation_does_not_create_transaction(self):
        """Test that pending reservations don't create transactions"""
        reservation = Reservation.objects.create(
            client=self.client,
            accommodation_unit=self.unit,
            check_in=self.now,
            check_out=self.now + timedelta(days=2),
            status=Reservation.PENDING,
            total_price=Decimal("1000.00")
        )
        
        # Check that no transaction was created
        transactions = Transaction.objects.filter(reservation=reservation)
        self.assertEqual(transactions.count(), 0)
    
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
