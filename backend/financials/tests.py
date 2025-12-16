from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from .models import Transaction
from reservations.models import Reservation
from accommodations.models import AccommodationUnit
from clients.models import Client


class TransactionModelTest(TestCase):
    """Test suite for Transaction model."""
    
    def setUp(self):
        """Create test data."""
        self.unit = AccommodationUnit.objects.create(
            name="Test Chalet",
            max_capacity=4,
            base_price=250.00
        )
        
        self.client = Client.objects.create(
            full_name="Test Client",
            cpf="123.456.789-00",
            phone="+55 (11) 98765-4321"
        )
        
        check_in = timezone.now()
        check_out = check_in + timedelta(days=3)
        
        self.reservation = Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
    
    def test_create_income_transaction(self):
        """Test creating an income transaction."""
        transaction = Transaction.objects.create(
            reservation=self.reservation,
            amount=750.00,
            transaction_type=Transaction.INCOME,
            category=Transaction.LODGING,
            payment_method=Transaction.PIX,
            due_date=date.today()
        )
        
        self.assertIsNotNone(transaction.pk)
        self.assertEqual(transaction.amount, 750.00)
        self.assertFalse(transaction.is_paid)
        
    def test_create_expense_transaction(self):
        """Test creating an expense transaction without reservation."""
        transaction = Transaction.objects.create(
            amount=150.00,
            transaction_type=Transaction.EXPENSE,
            category=Transaction.MAINTENANCE,
            payment_method=Transaction.CASH,
            due_date=date.today(),
            description="Pool maintenance"
        )
        
        self.assertIsNotNone(transaction.pk)
        self.assertIsNone(transaction.reservation)
        
    def test_is_paid_property_false(self):
        """Test is_paid property when transaction is unpaid."""
        transaction = Transaction.objects.create(
            amount=500.00,
            transaction_type=Transaction.INCOME,
            category=Transaction.LODGING,
            payment_method=Transaction.PIX,
            due_date=date.today()
        )
        
        self.assertFalse(transaction.is_paid)
        
    def test_is_paid_property_true(self):
        """Test is_paid property when transaction is paid."""
        transaction = Transaction.objects.create(
            amount=500.00,
            transaction_type=Transaction.INCOME,
            category=Transaction.LODGING,
            payment_method=Transaction.PIX,
            due_date=date.today(),
            paid_date=date.today()
        )
        
        self.assertTrue(transaction.is_paid)
        
    def test_mark_transaction_as_paid(self):
        """Test marking a transaction as paid."""
        transaction = Transaction.objects.create(
            amount=300.00,
            transaction_type=Transaction.INCOME,
            category=Transaction.LODGING,
            payment_method=Transaction.CREDIT_CARD,
            due_date=date.today()
        )
        
        self.assertFalse(transaction.is_paid)
        
        # Mark as paid
        transaction.paid_date = date.today()
        transaction.save()
        
        self.assertTrue(transaction.is_paid)

