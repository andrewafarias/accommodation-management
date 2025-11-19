from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from .models import AccommodationUnit


class AccommodationUnitAPITest(TestCase):
    """
    Test suite for AccommodationUnit API endpoints.
    """
    
    def setUp(self):
        """Set up test client and sample data."""
        self.client = APIClient()
        self.unit1 = AccommodationUnit.objects.create(
            name="Test Chalet 1",
            type=AccommodationUnit.CHALET,
            max_capacity=4,
            base_price=250.00,
            color_hex="#FF5733",
            status=AccommodationUnit.CLEAN
        )
        self.unit2 = AccommodationUnit.objects.create(
            name="Test Suite 2",
            type=AccommodationUnit.SUITE,
            max_capacity=2,
            base_price=150.00,
            color_hex="#3366FF",
            status=AccommodationUnit.DIRTY
        )
    
    def test_list_accommodations(self):
        """Test listing all accommodation units."""
        response = self.client.get('/api/accommodations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_create_accommodation(self):
        """Test creating a new accommodation unit."""
        data = {
            'name': 'New Chalet',
            'type': 'CHALET',
            'max_capacity': 6,
            'base_price': 300.00,
            'color_hex': '#00FF00'
        }
        response = self.client.post('/api/accommodations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Chalet')
        self.assertEqual(AccommodationUnit.objects.count(), 3)
    
    def test_get_accommodation(self):
        """Test retrieving a specific accommodation unit."""
        response = self.client.get(f'/api/accommodations/{self.unit1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Chalet 1')
    
    def test_update_accommodation(self):
        """Test updating an accommodation unit."""
        data = {'status': 'DIRTY'}
        response = self.client.patch(
            f'/api/accommodations/{self.unit1.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.unit1.refresh_from_db()
        self.assertEqual(self.unit1.status, 'DIRTY')
    
    def test_delete_accommodation(self):
        """Test deleting an accommodation unit."""
        response = self.client.delete(f'/api/accommodations/{self.unit1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AccommodationUnit.objects.count(), 1)
    
    def test_filter_by_status(self):
        """Test filtering accommodations by status."""
        response = self.client.get('/api/accommodations/?status=CLEAN')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Test Chalet 1')
    
    def test_filter_by_type(self):
        """Test filtering accommodations by type."""
        response = self.client.get('/api/accommodations/?type=SUITE')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Test Suite 2')
