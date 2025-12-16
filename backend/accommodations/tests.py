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

