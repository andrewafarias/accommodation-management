from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import AccommodationUnit


class AccommodationUnitAPITest(TestCase):
    """
    Test suite for AccommodationUnit API endpoints.
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
        data = {'max_capacity': 6}
        response = self.client.patch(
            f'/api/accommodations/{self.unit1.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.unit1.refresh_from_db()
        self.assertEqual(self.unit1.max_capacity, 6)
    
    def test_delete_accommodation(self):
        """Test deleting an accommodation unit."""
        response = self.client.delete(f'/api/accommodations/{self.unit1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AccommodationUnit.objects.count(), 1)
    
    def test_default_display_order(self):
        """Test that new accommodations have default display_order of 0."""
        unit = AccommodationUnit.objects.create(
            name="Test Order",
            max_capacity=2,
            base_price=100.00
        )
        self.assertEqual(unit.display_order, 0)
    
    def test_reorder_accommodations(self):
        """Test reordering accommodations via API."""
        # Create a third unit
        unit3 = AccommodationUnit.objects.create(
            name="Test Unit 3",
            max_capacity=3,
            base_price=200.00
        )
        
        # Reorder: unit3, unit1, unit2
        new_order = [unit3.id, self.unit1.id, self.unit2.id]
        response = self.client.post(
            '/api/accommodations/reorder/',
            {'unit_ids': new_order},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated'], 3)
        
        # Verify order was updated
        unit3.refresh_from_db()
        self.unit1.refresh_from_db()
        self.unit2.refresh_from_db()
        
        self.assertEqual(unit3.display_order, 0)
        self.assertEqual(self.unit1.display_order, 1)
        self.assertEqual(self.unit2.display_order, 2)
        
        # Verify list returns them in the correct order
        response = self.client.get('/api/accommodations/')
        results = response.data['results']
        self.assertEqual(results[0]['id'], unit3.id)
        self.assertEqual(results[1]['id'], self.unit1.id)
        self.assertEqual(results[2]['id'], self.unit2.id)
    
    def test_reorder_with_invalid_data(self):
        """Test reorder endpoint with invalid data."""
        response = self.client.post(
            '/api/accommodations/reorder/',
            {'unit_ids': 'not a list'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_with_new_fields(self):
        """Test creating accommodation with new description and photo fields."""
        data = {
            'name': 'Chalet with Details',
            'max_capacity': 6,
            'base_price': 400.00,
            'color_hex': '#AABBCC',
            'short_description': '# Chalé Luxo\nDescobra o conforto!',
            'long_description': '# Descrição Completa\n\n## Comodidades\n- Wi-Fi\n- Piscina',
            'rules': '# Regras\n\n1. Não fumar\n2. Check-out às 12h',
            'album_photos': [
                'https://example.com/photo1.jpg',
                'https://example.com/photo2.jpg'
            ]
        }
        response = self.client.post('/api/accommodations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['short_description'], '# Chalé Luxo\nDescobra o conforto!')
        self.assertEqual(response.data['long_description'], '# Descrição Completa\n\n## Comodidades\n- Wi-Fi\n- Piscina')
        self.assertEqual(response.data['rules'], '# Regras\n\n1. Não fumar\n2. Check-out às 12h')
        self.assertEqual(len(response.data['album_photos']), 2)
        self.assertEqual(response.data['album_photos'][0], 'https://example.com/photo1.jpg')
    
    def test_update_new_fields(self):
        """Test updating accommodation with new fields."""
        data = {
            'short_description': 'Nova descrição curta',
            'long_description': 'Nova descrição longa detalhada',
            'rules': 'Novas regras aqui',
            'album_photos': ['https://example.com/new-photo.jpg']
        }
        response = self.client.patch(
            f'/api/accommodations/{self.unit1.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['short_description'], 'Nova descrição curta')
        self.assertEqual(response.data['long_description'], 'Nova descrição longa detalhada')
        self.assertEqual(response.data['rules'], 'Novas regras aqui')
        self.assertEqual(len(response.data['album_photos']), 1)
    
    def test_get_accommodation_includes_new_fields(self):
        """Test that GET request includes all new fields."""
        response = self.client.get(f'/api/accommodations/{self.unit1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('short_description', response.data)
        self.assertIn('long_description', response.data)
        self.assertIn('rules', response.data)
        self.assertIn('album_photos', response.data)
        self.assertIn('images', response.data)
        self.assertIn('location', response.data)


class UnitImageAPITest(TestCase):
    """
    Test suite for UnitImage API endpoints.
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
        
        self.unit = AccommodationUnit.objects.create(
            name="Test Chalet",
            max_capacity=4,
            base_price=250.00,
            color_hex="#FF5733",
        )
    
    def test_list_images_for_unit(self):
        """Test listing images for a specific accommodation unit."""
        from .models import UnitImage
        
        # Create some test images
        image1 = UnitImage.objects.create(
            accommodation_unit=self.unit,
            order=0,
            caption="Test Image 1"
        )
        image2 = UnitImage.objects.create(
            accommodation_unit=self.unit,
            order=1,
            caption="Test Image 2"
        )
        
        response = self.client.get(f'/api/unit-images/?accommodation_unit={self.unit.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)
    
    def test_delete_image(self):
        """Test deleting an image."""
        from .models import UnitImage
        
        image = UnitImage.objects.create(
            accommodation_unit=self.unit,
            order=0,
            caption="Test Image"
        )
        
        response = self.client.delete(f'/api/unit-images/{image.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify image was deleted
        self.assertFalse(UnitImage.objects.filter(id=image.id).exists())
    
    def test_reorder_images(self):
        """Test reordering images."""
        from .models import UnitImage
        
        image1 = UnitImage.objects.create(
            accommodation_unit=self.unit,
            order=0
        )
        image2 = UnitImage.objects.create(
            accommodation_unit=self.unit,
            order=1
        )
        image3 = UnitImage.objects.create(
            accommodation_unit=self.unit,
            order=2
        )
        
        # Reorder: swap image1 and image3
        response = self.client.post('/api/unit-images/reorder/', {
            'image_ids': [image3.id, image2.id, image1.id]
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated'], 3)
        
        # Verify order was updated
        image1.refresh_from_db()
        image2.refresh_from_db()
        image3.refresh_from_db()
        
        self.assertEqual(image3.order, 0)
        self.assertEqual(image2.order, 1)
        self.assertEqual(image1.order, 2)


