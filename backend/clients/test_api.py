from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Client
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io


class ClientAPITest(TestCase):
    """
    Test suite for Client API endpoints.
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
        
        self.client1 = Client.objects.create(
            full_name="João Silva",
            cpf="123.456.789-00",
            phone="+55 (11) 98765-4321",
            email="joao@example.com"
        )
        self.client2 = Client.objects.create(
            full_name="Maria Santos",
            cpf="987.654.321-00",
            phone="+55 (21) 91234-5678",
            email="maria@example.com"
        )
    
    def test_list_clients(self):
        """Test listing all clients."""
        response = self.client.get('/api/clients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_create_client(self):
        """Test creating a new client."""
        data = {
            'full_name': 'Carlos Oliveira',
            'cpf': '111.222.333-44',
            'phone': '+55 (31) 99999-8888',
            'email': 'carlos@example.com'
        }
        response = self.client.post('/api/clients/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['full_name'], 'Carlos Oliveira')
        self.assertEqual(Client.objects.count(), 3)
    
    def test_create_client_without_cpf(self):
        """Test creating a new client without CPF (optional field)."""
        data = {
            'full_name': 'Ana Costa',
            'phone': '+55 (21) 98888-7777',
            'email': 'ana@example.com'
        }
        response = self.client.post('/api/clients/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['full_name'], 'Ana Costa')
        self.assertIsNone(response.data['cpf'])
        self.assertEqual(Client.objects.count(), 3)
    
    def test_get_client(self):
        """Test retrieving a specific client."""
        response = self.client.get(f'/api/clients/{self.client1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'João Silva')
    
    def test_update_client(self):
        """Test updating a client."""
        data = {'email': 'joao.new@example.com'}
        response = self.client.patch(
            f'/api/clients/{self.client1.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client1.refresh_from_db()
        self.assertEqual(self.client1.email, 'joao.new@example.com')
    
    def test_delete_client(self):
        """Test deleting a client."""
        response = self.client.delete(f'/api/clients/{self.client1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Client.objects.count(), 1)
    
    def test_search_clients(self):
        """Test searching clients by name."""
        response = self.client.get('/api/clients/?search=João')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['full_name'], 'João Silva')
    
    def test_create_client_with_profile_picture(self):
        """Test creating a client with a profile picture."""
        # Create a simple test image
        image = Image.new('RGB', (100, 100), color='red')
        image_io = io.BytesIO()
        image.save(image_io, format='JPEG')
        image_io.seek(0)
        
        image_file = SimpleUploadedFile(
            "test_profile.jpg",
            image_io.read(),
            content_type="image/jpeg"
        )
        
        data = {
            'full_name': 'Test User',
            'cpf': '55544433322',
            'phone': '+5511987654321',
            'email': 'test@example.com',
            'profile_picture': image_file
        }
        
        response = self.client.post('/api/clients/', data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data['profile_picture'])
        self.assertIn('clients/photos/', response.data['profile_picture'])
    
    def test_update_client_profile_picture(self):
        """Test updating a client's profile picture."""
        # Create a simple test image
        image = Image.new('RGB', (100, 100), color='blue')
        image_io = io.BytesIO()
        image.save(image_io, format='JPEG')
        image_io.seek(0)
        
        image_file = SimpleUploadedFile(
            "updated_profile.jpg",
            image_io.read(),
            content_type="image/jpeg"
        )
        
        data = {'profile_picture': image_file}
        response = self.client.patch(
            f'/api/clients/{self.client1.id}/',
            data,
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['profile_picture'])
        self.client1.refresh_from_db()
        self.assertTrue(self.client1.profile_picture)

