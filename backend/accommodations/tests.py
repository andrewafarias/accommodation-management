from django.test import TestCase
from .models import AccommodationUnit


class AccommodationUnitModelTest(TestCase):
    """Test suite for AccommodationUnit model."""
    
    def test_create_accommodation_unit(self):
        """Test creating an accommodation unit."""
        unit = AccommodationUnit.objects.create(
            name="Chalet Premium",
            max_capacity=6,
            base_price=350.00,
            color_hex="#FF5733"
        )
        
        self.assertIsNotNone(unit.pk)
        self.assertEqual(unit.name, "Chalet Premium")
        self.assertEqual(unit.status, AccommodationUnit.CLEAN)  # Default status
        
    def test_default_status_is_clean(self):
        """Test that default status is CLEAN."""
        unit = AccommodationUnit.objects.create(
            name="Suite 101",
            max_capacity=2,
            base_price=150.00
        )
        
        self.assertEqual(unit.status, AccommodationUnit.CLEAN)
        
    def test_status_choices(self):
        """Test all status choices."""
        unit = AccommodationUnit.objects.create(
            name="Room 201",
            max_capacity=2,
            base_price=100.00
        )
        
        # Test each status
        for status, _ in AccommodationUnit.STATUS_CHOICES:
            unit.status = status
            unit.save()
            unit.refresh_from_db()
            self.assertEqual(unit.status, status)
    
    def test_new_description_fields(self):
        """Test new description and rules fields."""
        unit = AccommodationUnit.objects.create(
            name="Chalet Deluxe",
            max_capacity=8,
            base_price=450.00,
            short_description="# Breve descrição\nUma descrição curta em markdown.",
            long_description="# Descrição Completa\n\n## Características\n- Item 1\n- Item 2",
            rules="# Regras\n\n1. Não fumar\n2. Não permitido animais"
        )
        
        self.assertEqual(unit.short_description, "# Breve descrição\nUma descrição curta em markdown.")
        self.assertEqual(unit.long_description, "# Descrição Completa\n\n## Características\n- Item 1\n- Item 2")
        self.assertEqual(unit.rules, "# Regras\n\n1. Não fumar\n2. Não permitido animais")
    
    def test_album_photos_field(self):
        """Test album_photos JSONField."""
        unit = AccommodationUnit.objects.create(
            name="Chalet Panorama",
            max_capacity=6,
            base_price=400.00,
            album_photos=[
                "https://example.com/photo1.jpg",
                "https://example.com/photo2.jpg",
                "https://example.com/photo3.jpg"
            ]
        )
        
        self.assertEqual(len(unit.album_photos), 3)
        self.assertEqual(unit.album_photos[0], "https://example.com/photo1.jpg")
        
    def test_default_values_for_new_fields(self):
        """Test that new fields have proper default values."""
        unit = AccommodationUnit.objects.create(
            name="Simple Unit",
            max_capacity=2,
            base_price=150.00
        )
        
        self.assertEqual(unit.short_description, '')
        self.assertEqual(unit.long_description, '')
        self.assertEqual(unit.rules, '')
        self.assertEqual(unit.album_photos, [])

