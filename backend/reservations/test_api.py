from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from .models import Reservation
from accommodations.models import AccommodationUnit
from clients.models import Client


class ReservationAPITest(TestCase):
    """
    Test suite for Reservation API endpoints.
    """
    
    def setUp(self):
        """Set up test client and sample data."""
        self.client = APIClient()
        
        # Create accommodation units
        self.unit1 = AccommodationUnit.objects.create(
            name="Test Chalet 1",
            type=AccommodationUnit.CHALET,
            max_capacity=4,
            base_price=250.00,
            color_hex="#FF5733"
        )
        self.unit2 = AccommodationUnit.objects.create(
            name="Test Suite 2",
            type=AccommodationUnit.SUITE,
            max_capacity=2,
            base_price=150.00,
            color_hex="#3366FF"
        )
        
        # Create clients
        self.guest1 = Client.objects.create(
            full_name="João Silva",
            cpf="123.456.789-00",
            phone="+55 (11) 98765-4321"
        )
        self.guest2 = Client.objects.create(
            full_name="Maria Santos",
            cpf="987.654.321-00",
            phone="+55 (21) 91234-5678"
        )
        
        # Create base reservation
        self.base_date = timezone.now().replace(hour=14, minute=0, second=0, microsecond=0)
        self.reservation1 = Reservation.objects.create(
            accommodation_unit=self.unit1,
            client=self.guest1,
            check_in=self.base_date,
            check_out=self.base_date + timedelta(days=3),
            guest_count_adults=2,
            guest_count_children=1,
            status=Reservation.CONFIRMED
        )
    
    def test_list_reservations(self):
        """Test listing all reservations."""
        response = self.client.get('/api/reservations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_reservation(self):
        """Test creating a new reservation with write-only IDs."""
        data = {
            'accommodation_unit': self.unit2.id,
            'client': self.guest2.id,
            'check_in': (self.base_date + timedelta(days=10)).isoformat(),
            'check_out': (self.base_date + timedelta(days=13)).isoformat(),
            'guest_count_adults': 2,
            'guest_count_children': 0,
            'status': 'CONFIRMED'
        }
        response = self.client.post('/api/reservations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reservation.objects.count(), 2)
        
        # Verify nested objects are returned on read
        self.assertIn('client', response.data)
        self.assertIsInstance(response.data['client'], dict)
        self.assertEqual(response.data['client']['full_name'], 'Maria Santos')
        
        self.assertIn('accommodation_unit', response.data)
        self.assertIsInstance(response.data['accommodation_unit'], dict)
        self.assertEqual(response.data['accommodation_unit']['name'], 'Test Suite 2')
    
    def test_get_reservation_with_nested_objects(self):
        """Test retrieving a reservation returns nested client and unit details."""
        response = self.client.get(f'/api/reservations/{self.reservation1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify nested client object
        self.assertIn('client', response.data)
        self.assertIsInstance(response.data['client'], dict)
        self.assertEqual(response.data['client']['full_name'], 'João Silva')
        
        # Verify nested accommodation_unit object
        self.assertIn('accommodation_unit', response.data)
        self.assertIsInstance(response.data['accommodation_unit'], dict)
        self.assertEqual(response.data['accommodation_unit']['name'], 'Test Chalet 1')
    
    def test_create_overlapping_reservation_fails(self):
        """Test that creating an overlapping reservation fails with validation error."""
        # Try to create a reservation that overlaps with existing one
        data = {
            'accommodation_unit': self.unit1.id,  # Same unit
            'client': self.guest2.id,
            'check_in': (self.base_date + timedelta(days=1)).isoformat(),
            'check_out': (self.base_date + timedelta(days=4)).isoformat(),
            'guest_count_adults': 2,
            'status': 'CONFIRMED'
        }
        response = self.client.post('/api/reservations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('check_in', response.data)
    
    def test_update_reservation(self):
        """Test updating a reservation."""
        data = {'guest_count_adults': 3}
        response = self.client.patch(
            f'/api/reservations/{self.reservation1.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.reservation1.refresh_from_db()
        self.assertEqual(self.reservation1.guest_count_adults, 3)
    
    def test_delete_reservation(self):
        """Test deleting a reservation."""
        response = self.client.delete(f'/api/reservations/{self.reservation1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Reservation.objects.count(), 0)
    
    def test_filter_by_status(self):
        """Test filtering reservations by status."""
        # Create cancelled reservation
        Reservation.objects.create(
            accommodation_unit=self.unit2,
            client=self.guest2,
            check_in=self.base_date + timedelta(days=10),
            check_out=self.base_date + timedelta(days=13),
            guest_count_adults=1,
            status=Reservation.CANCELLED
        )
        
        response = self.client.get('/api/reservations/?status=CONFIRMED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_by_check_in_range(self):
        """Test filtering reservations by check_in date range."""
        start_date = self.base_date.date().isoformat()
        end_date = (self.base_date + timedelta(days=5)).date().isoformat()
        
        response = self.client.get(
            f'/api/reservations/?check_in_start={start_date}&check_in_end={end_date}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_check_availability_action(self):
        """Test the check_availability custom action."""
        # Check availability for dates that don't overlap with existing reservation
        # Format datetime properly for API (remove microseconds, use Z for UTC)
        check_in_dt = self.base_date + timedelta(days=10)
        check_out_dt = self.base_date + timedelta(days=13)
        
        # Format as ISO string without microseconds, use Z instead of +00:00 for URL safety
        check_in = check_in_dt.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
        check_out = check_out_dt.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
        
        response = self.client.get(
            f'/api/reservations/check_availability/?check_in={check_in}&check_out={check_out}'
        )
        if response.status_code != status.HTTP_200_OK:
            print(f"Error response: {response.data}")
            print(f"check_in format: {check_in}")
            print(f"check_out format: {check_out}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('available_units', response.data)
        self.assertEqual(len(response.data['available_units']), 2)  # Both units available
    
    def test_check_availability_with_conflict(self):
        """Test check_availability when there's a conflicting reservation."""
        # Check availability for dates that overlap with existing reservation
        check_in_dt = self.base_date + timedelta(days=1)
        check_out_dt = self.base_date + timedelta(days=4)
        
        # Format as ISO string without microseconds, use Z instead of +00:00 for URL safety
        check_in = check_in_dt.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
        check_out = check_out_dt.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
        
        response = self.client.get(
            f'/api/reservations/check_availability/?check_in={check_in}&check_out={check_out}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('available_units', response.data)
        # Only unit2 should be available (unit1 is occupied)
        self.assertEqual(len(response.data['available_units']), 1)
        self.assertEqual(response.data['available_units'][0]['name'], 'Test Suite 2')
    
    def test_check_availability_missing_params(self):
        """Test check_availability returns error when params are missing."""
        response = self.client.get('/api/reservations/check_availability/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
