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
            max_capacity=4,
            base_price=250.00,
            color_hex="#FF5733",
            status=AccommodationUnit.CLEAN
        )
        self.unit2 = AccommodationUnit.objects.create(
            name="Test Suite 2",
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
    
    
    def test_auto_dirty_days_default(self):
        """Test that auto_dirty_days has default value of 3."""
        unit = AccommodationUnit.objects.create(
            name="Test Default",
            max_capacity=2,
            base_price=100.00
        )
        self.assertEqual(unit.auto_dirty_days, 3)
    
    def test_status_change_to_clean_sets_last_cleaned_at(self):
        """Test that changing status to CLEAN sets last_cleaned_at."""
        # Unit2 is DIRTY
        self.assertIsNone(self.unit2.last_cleaned_at)
        
        # Change to CLEAN
        response = self.client.patch(
            f'/api/accommodations/{self.unit2.id}/',
            {'status': 'CLEAN'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check last_cleaned_at is set
        self.assertIsNotNone(response.data['last_cleaned_at'])
        self.unit2.refresh_from_db()
        self.assertIsNotNone(self.unit2.last_cleaned_at)
    
    def test_auto_dirty_after_days(self):
        """Test that a unit becomes DIRTY after auto_dirty_days."""
        # Create a clean unit with auto_dirty_days=2
        unit = AccommodationUnit.objects.create(
            name="Test Auto Dirty",
            max_capacity=2,
            base_price=100.00,
            status=AccommodationUnit.CLEAN,
            auto_dirty_days=2
        )
        
        # Set last_cleaned_at to 3 days ago
        unit.last_cleaned_at = timezone.now() - timedelta(days=3)
        unit.save()
        
        # List accommodations (triggers auto-dirty check)
        response = self.client.get('/api/accommodations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Unit should now be DIRTY
        unit.refresh_from_db()
        self.assertEqual(unit.status, AccommodationUnit.DIRTY)
    
    def test_auto_dirty_not_triggered_before_days(self):
        """Test that a unit stays CLEAN before auto_dirty_days."""
        # Create a clean unit with auto_dirty_days=5
        unit = AccommodationUnit.objects.create(
            name="Test Still Clean",
            max_capacity=2,
            base_price=100.00,
            status=AccommodationUnit.CLEAN,
            auto_dirty_days=5
        )
        
        # Set last_cleaned_at to 2 days ago (less than auto_dirty_days)
        unit.last_cleaned_at = timezone.now() - timedelta(days=2)
        unit.save()
        
        # List accommodations (triggers auto-dirty check)
        response = self.client.get('/api/accommodations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Unit should still be CLEAN
        unit.refresh_from_db()
        self.assertEqual(unit.status, AccommodationUnit.CLEAN)
    
    def test_create_with_auto_dirty_days(self):
        """Test creating an accommodation with custom auto_dirty_days."""
        data = {
            'name': 'Custom Days Chalet',
            'max_capacity': 4,
            'base_price': 200.00,
            'color_hex': '#FF00FF',
            'auto_dirty_days': 7
        }
        response = self.client.post('/api/accommodations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['auto_dirty_days'], 7)

