from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Package
from accommodations.models import AccommodationUnit


class PackageAPITest(TestCase):
    """
    Test suite for Package API endpoints.
    """
    
    def setUp(self):
        """Set up test client and sample data."""
        self.client = APIClient()
        
        # Create test accommodation units
        self.unit1 = AccommodationUnit.objects.create(
            name="Test Chalet 1",
            max_capacity=4,
            base_price=250.00,
            color_hex="#FF5733",
        )
        self.unit2 = AccommodationUnit.objects.create(
            name="Test Suite 2",
            max_capacity=2,
            base_price=150.00,
            color_hex="#3366FF",
        )
        self.unit3 = AccommodationUnit.objects.create(
            name="Test Villa 3",
            max_capacity=6,
            base_price=400.00,
            color_hex="#00FF00",
        )
        
        # Create a test package
        self.package1 = Package.objects.create(
            name="Family Package",
            description="Perfect for families",
            package_price=600.00,
            is_active=True
        )
        self.package1.accommodation_units.add(self.unit1, self.unit2)
    
    def test_list_packages(self):
        """Test listing all packages."""
        response = self.client.get('/api/packages/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_package(self):
        """Test creating a new package."""
        data = {
            'name': 'Luxury Package',
            'description': 'High-end luxury experience',
            'accommodation_unit_ids': [self.unit2.id, self.unit3.id],
            'package_price': 900.00,
            'is_active': True
        }
        response = self.client.post('/api/packages/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Luxury Package')
        self.assertEqual(Package.objects.count(), 2)
        
        # Verify the units are associated
        new_package = Package.objects.get(name='Luxury Package')
        self.assertEqual(new_package.accommodation_units.count(), 2)
    
    def test_create_package_without_units_fails(self):
        """Test that creating a package without units fails."""
        data = {
            'name': 'Empty Package',
            'description': 'Should fail',
            'accommodation_unit_ids': [],
            'package_price': 100.00,
        }
        response = self.client.post('/api/packages/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_get_package(self):
        """Test retrieving a specific package."""
        response = self.client.get(f'/api/packages/{self.package1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Family Package')
        # Check that accommodation units are included
        self.assertIn('accommodation_units', response.data)
        self.assertEqual(len(response.data['accommodation_units']), 2)
    
    def test_update_package(self):
        """Test updating a package."""
        data = {
            'package_price': 700.00,
            'is_active': False
        }
        response = self.client.patch(
            f'/api/packages/{self.package1.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.package1.refresh_from_db()
        self.assertEqual(float(self.package1.package_price), 700.00)
        self.assertFalse(self.package1.is_active)
    
    def test_update_package_units(self):
        """Test updating package accommodation units."""
        data = {
            'accommodation_unit_ids': [self.unit1.id, self.unit3.id]
        }
        response = self.client.patch(
            f'/api/packages/{self.package1.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.package1.refresh_from_db()
        self.assertEqual(self.package1.accommodation_units.count(), 2)
        self.assertIn(self.unit3, self.package1.accommodation_units.all())
    
    def test_delete_package(self):
        """Test deleting a package."""
        response = self.client.delete(f'/api/packages/{self.package1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Package.objects.count(), 0)
        # Verify units still exist (cascade delete should not affect units)
        self.assertEqual(AccommodationUnit.objects.count(), 3)
    
    def test_filter_active_packages(self):
        """Test filtering packages by active status."""
        # Create an inactive package
        inactive_package = Package.objects.create(
            name="Inactive Package",
            package_price=100.00,
            is_active=False
        )
        inactive_package.accommodation_units.add(self.unit3)
        
        response = self.client.get('/api/packages/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Family Package')
    
    def test_get_active_packages_endpoint(self):
        """Test the active packages custom endpoint."""
        # Create an inactive package
        inactive_package = Package.objects.create(
            name="Inactive Package",
            package_price=100.00,
            is_active=False
        )
        inactive_package.accommodation_units.add(self.unit3)
        
        response = self.client.get('/api/packages/active/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Family Package')
    
    def test_package_properties(self):
        """Test package model properties."""
        self.assertEqual(self.package1.unit_count, 2)
        expected_capacity = self.unit1.max_capacity + self.unit2.max_capacity
        self.assertEqual(self.package1.total_capacity, expected_capacity)


class BulkPriceUpdateAPITest(TestCase):
    """
    Test suite for bulk price update functionality.
    """
    
    def setUp(self):
        """Set up test client and sample data."""
        self.client = APIClient()
        
        # Create test accommodation units
        self.unit1 = AccommodationUnit.objects.create(
            name="Test Chalet 1",
            max_capacity=4,
            base_price=250.00,
            weekend_price=300.00,
            holiday_price=350.00,
        )
        self.unit2 = AccommodationUnit.objects.create(
            name="Test Suite 2",
            max_capacity=2,
            base_price=150.00,
            weekend_price=180.00,
        )
        self.unit3 = AccommodationUnit.objects.create(
            name="Test Villa 3",
            max_capacity=6,
            base_price=400.00,
        )
    
    def test_bulk_update_base_price(self):
        """Test bulk updating base prices."""
        data = {
            'unit_ids': [self.unit1.id, self.unit2.id],
            'price_updates': {
                'base_price': 200.00
            }
        }
        response = self.client.post(
            '/api/accommodations/bulk_update_prices/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated'], 2)
        
        # Verify prices were updated
        self.unit1.refresh_from_db()
        self.unit2.refresh_from_db()
        self.assertEqual(float(self.unit1.base_price), 200.00)
        self.assertEqual(float(self.unit2.base_price), 200.00)
    
    def test_bulk_update_multiple_prices(self):
        """Test bulk updating multiple price fields."""
        data = {
            'unit_ids': [self.unit1.id, self.unit3.id],
            'price_updates': {
                'base_price': 300.00,
                'weekend_price': 400.00,
                'holiday_price': 500.00
            }
        }
        response = self.client.post(
            '/api/accommodations/bulk_update_prices/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated'], 2)
        
        # Verify all prices were updated
        self.unit1.refresh_from_db()
        self.unit3.refresh_from_db()
        self.assertEqual(float(self.unit1.base_price), 300.00)
        self.assertEqual(float(self.unit1.weekend_price), 400.00)
        self.assertEqual(float(self.unit1.holiday_price), 500.00)
        self.assertEqual(float(self.unit3.base_price), 300.00)
        self.assertEqual(float(self.unit3.weekend_price), 400.00)
    
    def test_bulk_update_without_unit_ids_fails(self):
        """Test that bulk update without unit_ids fails."""
        data = {
            'price_updates': {
                'base_price': 200.00
            }
        }
        response = self.client.post(
            '/api/accommodations/bulk_update_prices/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('unit_ids', response.data['error'])
    
    def test_bulk_update_without_price_updates_fails(self):
        """Test that bulk update without price_updates fails."""
        data = {
            'unit_ids': [self.unit1.id]
        }
        response = self.client.post(
            '/api/accommodations/bulk_update_prices/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price_updates', response.data['error'])
    
    def test_bulk_update_with_invalid_fields_fails(self):
        """Test that bulk update with invalid price fields fails."""
        data = {
            'unit_ids': [self.unit1.id],
            'price_updates': {
                'invalid_field': 200.00
            }
        }
        response = self.client.post(
            '/api/accommodations/bulk_update_prices/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Campos inválidos', response.data['error'])
    
    def test_bulk_update_with_nonexistent_units(self):
        """Test bulk update with non-existent unit IDs."""
        data = {
            'unit_ids': [9999, 9998],
            'price_updates': {
                'base_price': 200.00
            }
        }
        response = self.client.post(
            '/api/accommodations/bulk_update_prices/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_bulk_update_partial_valid_ids(self):
        """Test bulk update with mix of valid and invalid IDs."""
        data = {
            'unit_ids': [self.unit1.id, 9999],
            'price_updates': {
                'base_price': 250.00
            }
        }
        response = self.client.post(
            '/api/accommodations/bulk_update_prices/',
            data,
            format='json'
        )
        # Should succeed and update only valid units
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated'], 1)
        
        self.unit1.refresh_from_db()
        self.assertEqual(float(self.unit1.base_price), 250.00)
