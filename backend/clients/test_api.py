from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from .models import Client
import os


class ClientAPITest(TestCase):
    """
    Test suite for Client API endpoints.
    """
    
    def setUp(self):
        """Set up test client and sample data."""
        self.client = APIClient()
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
    
    def test_create_client_with_files(self):
        """Test creating a client with profile picture and document."""
        # Create test image file (1x1 pixel PNG)
        image_content = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
            b'\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01'
            b'\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        profile_picture = SimpleUploadedFile(
            "test_photo.png",
            image_content,
            content_type="image/png"
        )
        
        # Create test document file
        document_file = SimpleUploadedFile(
            "test_doc.pdf",
            b"PDF content here",
            content_type="application/pdf"
        )
        
        data = {
            'full_name': 'Test Client',
            'cpf': '555.666.777-88',
            'phone': '+55 (11) 99999-9999',
            'email': 'test@example.com',
            'profile_picture': profile_picture,
            'document_file': document_file,
        }
        
        response = self.client.post('/api/clients/', data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('profile_picture', response.data)
        self.assertIn('document_file', response.data)
        
        # Verify files were saved
        created_client = Client.objects.get(cpf='555.666.777-88')
        self.assertTrue(created_client.profile_picture)
        self.assertTrue(created_client.document_file)
        
        # Clean up uploaded files
        if created_client.profile_picture:
            if os.path.exists(created_client.profile_picture.path):
                os.remove(created_client.profile_picture.path)
        if created_client.document_file:
            if os.path.exists(created_client.document_file.path):
                os.remove(created_client.document_file.path)
