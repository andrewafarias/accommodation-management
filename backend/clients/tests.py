from django.test import TestCase
from .models import Client


class ClientModelTest(TestCase):
    """Test suite for Client model."""
    
    def test_create_client(self):
        """Test creating a client with all required fields."""
        client = Client.objects.create(
            full_name="Maria Santos",
            cpf="987.654.321-00",
            phone="+55 (21) 98765-4321",
            email="maria@example.com",
            address="Rua das Flores, 123",
            notes="Prefers quiet rooms"
        )
        
        self.assertIsNotNone(client.pk)
        self.assertEqual(client.full_name, "Maria Santos")
        self.assertEqual(client.cpf, "987.654.321-00")
        
    def test_cpf_unique(self):
        """Test that CPF must be unique."""
        Client.objects.create(
            full_name="João Silva",
            cpf="123.456.789-00",
            phone="+55 (11) 98765-4321"
        )
        
        # Try to create another client with same CPF
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Client.objects.create(
                full_name="Pedro Silva",
                cpf="123.456.789-00",
                phone="+55 (11) 99999-9999"
            )
    
    def test_tags_field(self):
        """Test that tags field works as JSONField."""
        client = Client.objects.create(
            full_name="VIP Customer",
            cpf="111.222.333-44",
            phone="+55 (11) 91111-1111",
            tags=["VIP", "Frequent Guest", "Corporate"]
        )
        
        self.assertIsInstance(client.tags, list)
        self.assertIn("VIP", client.tags)
        self.assertEqual(len(client.tags), 3)

