from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, date
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Transaction
from reservations.models import Reservation
from accommodations.models import AccommodationUnit
from clients.models import Client


class TransactionAPITest(TestCase):
    """
    Test suite for Transaction API endpoints.
    """
    
    def setUp(self):
        """Set up test client and sample data."""
        self.client = APIClient()
        
        # Create a test user and authenticate
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        # Create accommodation and client for testing
        self.unit = AccommodationUnit.objects.create(
            name="Test Chalet",
            max_capacity=4,
            base_price=250.00,
            color_hex="#FF5733"
        )
        self.guest = Client.objects.create(
            full_name="João Silva",
            cpf="123.456.789-00",
            phone="+55 (11) 98765-4321"
        )
        self.reservation = Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.guest,
            check_in=timezone.now(),
            check_out=timezone.now() + timedelta(days=3),
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # Create test transactions
        self.transaction1 = Transaction.objects.create(
            reservation=self.reservation,
            amount=750.00,
            transaction_type=Transaction.INCOME,
            category=Transaction.LODGING,
            payment_method=Transaction.PIX,
            due_date=date.today()
        )
        self.transaction2 = Transaction.objects.create(
            amount=200.00,
            transaction_type=Transaction.EXPENSE,
            category=Transaction.MAINTENANCE,
            payment_method=Transaction.BANK_TRANSFER,
            due_date=date.today() + timedelta(days=30),
            paid_date=date.today()
        )
    
    def test_list_transactions(self):
        """Test listing all transactions."""
        response = self.client.get('/api/financials/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_create_transaction(self):
        """Test creating a new transaction."""
        data = {
            'amount': 100.00,
            'transaction_type': 'EXPENSE',
            'category': 'SUPPLIES',
            'payment_method': 'CASH',
            'due_date': date.today().isoformat()
        }
        response = self.client.post('/api/financials/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['amount']), 100.00)
        self.assertEqual(Transaction.objects.count(), 3)
    
    def test_get_transaction(self):
        """Test retrieving a specific transaction."""
        response = self.client.get(f'/api/financials/{self.transaction1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['amount']), 750.00)
    
    def test_update_transaction(self):
        """Test updating a transaction."""
        data = {'paid_date': date.today().isoformat()}
        response = self.client.patch(
            f'/api/financials/{self.transaction1.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.transaction1.refresh_from_db()
        self.assertIsNotNone(self.transaction1.paid_date)
        self.assertTrue(response.data['is_paid'])
    
    def test_delete_transaction(self):
        """Test deleting a transaction."""
        response = self.client.delete(f'/api/financials/{self.transaction1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Transaction.objects.count(), 1)
    
    def test_filter_by_transaction_type(self):
        """Test filtering transactions by type."""
        response = self.client.get('/api/financials/?transaction_type=INCOME')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['transaction_type'], 'INCOME')
    
    def test_filter_by_due_date_range(self):
        """Test filtering transactions by due_date range."""
        start_date = date.today().isoformat()
        end_date = (date.today() + timedelta(days=15)).isoformat()
        response = self.client.get(
            f'/api/financials/?due_date_start={start_date}&due_date_end={end_date}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_is_paid_property(self):
        """Test that is_paid property is correctly returned."""
        response = self.client.get(f'/api/financials/{self.transaction2.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_paid'])
    
    def test_filter_by_paid_status_true(self):
        """Test filtering transactions by paid status (is_paid=true)."""
        response = self.client.get('/api/financials/?is_paid=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertTrue(response.data['results'][0]['is_paid'])
    
    def test_filter_by_paid_status_false(self):
        """Test filtering transactions by unpaid status (is_paid=false)."""
        response = self.client.get('/api/financials/?is_paid=false')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertFalse(response.data['results'][0]['is_paid'])
    
    def test_filter_by_paid_status_no_filter(self):
        """Test that without is_paid filter, all transactions are returned."""
        response = self.client.get('/api/financials/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
