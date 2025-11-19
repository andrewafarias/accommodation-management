from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from .models import Reservation
from accommodations.models import AccommodationUnit
from clients.models import Client


class ReservationOverlapValidationTest(TestCase):
    """
    Test suite for reservation overlap validation.
    CRITICAL: Ensures no double bookings are possible.
    """
    
    def setUp(self):
        """Create test data for all tests."""
        # Create a test accommodation unit
        self.unit = AccommodationUnit.objects.create(
            name="Test Chalet 1",
            type=AccommodationUnit.CHALET,
            max_capacity=4,
            base_price=250.00,
            color_hex="#FF5733"
        )
        
        # Create a test client
        self.client = Client.objects.create(
            full_name="João Silva",
            cpf="123.456.789-00",
            phone="+55 (11) 98765-4321",
            email="joao@example.com"
        )
        
        # Base dates for testing
        self.base_date = timezone.now().replace(hour=14, minute=0, second=0, microsecond=0)
        
    def test_create_valid_reservation(self):
        """Test creating a valid reservation without conflicts."""
        check_in = self.base_date
        check_out = self.base_date + timedelta(days=3)
        
        reservation = Reservation(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=2,
            guest_count_children=1,
            status=Reservation.CONFIRMED
        )
        
        # Should not raise any validation errors
        reservation.save()
        self.assertIsNotNone(reservation.pk)
        
    def test_checkout_before_checkin_fails(self):
        """Test that check-out before check-in raises validation error."""
        check_in = self.base_date
        check_out = self.base_date - timedelta(days=1)  # Before check-in
        
        reservation = Reservation(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=2
        )
        
        with self.assertRaises(ValidationError) as context:
            reservation.save()
        
        self.assertIn('check_out', context.exception.message_dict)
        
    def test_exact_overlap_fails(self):
        """Test that exactly overlapping dates are rejected."""
        check_in = self.base_date
        check_out = self.base_date + timedelta(days=3)
        
        # Create first reservation
        Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # Try to create overlapping reservation
        overlapping_reservation = Reservation(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=1
        )
        
        with self.assertRaises(ValidationError) as context:
            overlapping_reservation.save()
        
        self.assertIn('check_in', context.exception.message_dict)
        self.assertIn('already reserved', str(context.exception.message_dict['check_in']))
        
    def test_partial_overlap_at_start_fails(self):
        """Test that reservation starting during existing reservation is rejected."""
        # Existing reservation: days 0-3
        existing_check_in = self.base_date
        existing_check_out = self.base_date + timedelta(days=3)
        
        Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=existing_check_in,
            check_out=existing_check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # New reservation: days 2-5 (overlaps at the start)
        new_check_in = self.base_date + timedelta(days=2)
        new_check_out = self.base_date + timedelta(days=5)
        
        new_reservation = Reservation(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=new_check_in,
            check_out=new_check_out,
            guest_count_adults=1
        )
        
        with self.assertRaises(ValidationError):
            new_reservation.save()
            
    def test_partial_overlap_at_end_fails(self):
        """Test that reservation ending during existing reservation is rejected."""
        # Existing reservation: days 3-6
        existing_check_in = self.base_date + timedelta(days=3)
        existing_check_out = self.base_date + timedelta(days=6)
        
        Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=existing_check_in,
            check_out=existing_check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # New reservation: days 0-4 (overlaps at the end)
        new_check_in = self.base_date
        new_check_out = self.base_date + timedelta(days=4)
        
        new_reservation = Reservation(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=new_check_in,
            check_out=new_check_out,
            guest_count_adults=1
        )
        
        with self.assertRaises(ValidationError):
            new_reservation.save()
            
    def test_encompassing_overlap_fails(self):
        """Test that reservation encompassing existing reservation is rejected."""
        # Existing reservation: days 2-4
        existing_check_in = self.base_date + timedelta(days=2)
        existing_check_out = self.base_date + timedelta(days=4)
        
        Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=existing_check_in,
            check_out=existing_check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # New reservation: days 0-6 (encompasses existing)
        new_check_in = self.base_date
        new_check_out = self.base_date + timedelta(days=6)
        
        new_reservation = Reservation(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=new_check_in,
            check_out=new_check_out,
            guest_count_adults=1
        )
        
        with self.assertRaises(ValidationError):
            new_reservation.save()
            
    def test_back_to_back_reservations_allowed(self):
        """Test that back-to-back reservations (checkout = checkin) are allowed."""
        # First reservation: days 0-3
        first_check_in = self.base_date
        first_check_out = self.base_date + timedelta(days=3)
        
        Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=first_check_in,
            check_out=first_check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # Second reservation: days 3-6 (starts when first ends)
        second_check_in = self.base_date + timedelta(days=3)
        second_check_out = self.base_date + timedelta(days=6)
        
        second_reservation = Reservation(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=second_check_in,
            check_out=second_check_out,
            guest_count_adults=1,
            status=Reservation.CONFIRMED
        )
        
        # Should not raise validation error
        second_reservation.save()
        self.assertIsNotNone(second_reservation.pk)
        
    def test_different_units_no_conflict(self):
        """Test that overlapping dates on different units don't conflict."""
        # Create second unit
        unit2 = AccommodationUnit.objects.create(
            name="Test Chalet 2",
            type=AccommodationUnit.CHALET,
            max_capacity=4,
            base_price=250.00,
            color_hex="#3366FF"
        )
        
        check_in = self.base_date
        check_out = self.base_date + timedelta(days=3)
        
        # Reservation on first unit
        Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # Overlapping reservation on second unit - should be allowed
        second_reservation = Reservation(
            accommodation_unit=unit2,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=1,
            status=Reservation.CONFIRMED
        )
        
        second_reservation.save()
        self.assertIsNotNone(second_reservation.pk)
        
    def test_cancelled_reservations_dont_conflict(self):
        """Test that cancelled reservations don't prevent new bookings."""
        check_in = self.base_date
        check_out = self.base_date + timedelta(days=3)
        
        # Create cancelled reservation
        Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=2,
            status=Reservation.CANCELLED
        )
        
        # New reservation with overlapping dates - should be allowed
        new_reservation = Reservation(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=1,
            status=Reservation.CONFIRMED
        )
        
        new_reservation.save()
        self.assertIsNotNone(new_reservation.pk)
        
    def test_update_existing_reservation_no_conflict(self):
        """Test that updating an existing reservation doesn't conflict with itself."""
        check_in = self.base_date
        check_out = self.base_date + timedelta(days=3)
        
        reservation = Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # Update the reservation
        reservation.guest_count_adults = 3
        reservation.save()  # Should not raise validation error
        
        # Verify update
        reservation.refresh_from_db()
        self.assertEqual(reservation.guest_count_adults, 3)
        
    def test_auto_dirty_on_checkout(self):
        """Test that accommodation unit status changes to DIRTY on checkout."""
        check_in = self.base_date
        check_out = self.base_date + timedelta(days=3)
        
        # Ensure unit starts clean
        self.unit.status = AccommodationUnit.CLEAN
        self.unit.save()
        
        reservation = Reservation.objects.create(
            accommodation_unit=self.unit,
            client=self.client,
            check_in=check_in,
            check_out=check_out,
            guest_count_adults=2,
            status=Reservation.CONFIRMED
        )
        
        # Change to checked out
        reservation.status = Reservation.CHECKED_OUT
        reservation.save()
        
        # Refresh unit from database
        self.unit.refresh_from_db()
        self.assertEqual(self.unit.status, 'DIRTY')

