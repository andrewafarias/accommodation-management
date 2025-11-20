from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from clients.models import Client


class ClientPhoneSearchTest(TestCase):
    """Test that client phone search works without formatting"""
    
    def setUp(self):
        """Create test clients with different phone formats"""
        self.client_api = APIClient()
        
        # Create clients with different phone formats
        self.client1 = Client.objects.create(
            full_name="João Silva",
            cpf="123.456.789-01",
            phone="+55 (11) 99999-1111"
        )
        
        self.client2 = Client.objects.create(
            full_name="Maria Santos",
            cpf="123.456.789-02",
            phone="+55 (21) 98888-2222"
        )
        
        self.client3 = Client.objects.create(
            full_name="Pedro Oliveira",
            cpf="123.456.789-03",
            phone="+55 (11) 97777-3333"
        )
    
    def test_search_phone_without_formatting(self):
        """Test searching for phone number without formatting characters"""
        # Search for "1199999" should find client1
        response = self.client_api.get('/api/clients/?search=1199999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data.get('results', response.data)
        # Should find at least client1
        cpfs = [client['cpf'] for client in results]
        self.assertIn(self.client1.cpf, cpfs)
    
    def test_search_phone_partial_match(self):
        """Test searching with partial phone number"""
        # Search for "119" should find clients with (11) area code
        response = self.client_api.get('/api/clients/?search=119')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data.get('results', response.data)
        cpfs = [client['cpf'] for client in results]
        
        # Should find both client1 and client3 (both have area code 11)
        self.assertIn(self.client1.cpf, cpfs)
        self.assertIn(self.client3.cpf, cpfs)
    
    def test_search_phone_full_number_digits_only(self):
        """Test searching with full phone number (digits only)"""
        # Search for "5521988882222" should find client2
        response = self.client_api.get('/api/clients/?search=5521988882222')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data.get('results', response.data)
        cpfs = [client['cpf'] for client in results]
        self.assertIn(self.client2.cpf, cpfs)
    
    def test_search_name_still_works(self):
        """Test that name search still works normally"""
        response = self.client_api.get('/api/clients/?search=João')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data.get('results', response.data)
        # Should find client1 by name
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['full_name'], self.client1.full_name)
