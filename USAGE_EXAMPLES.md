# Model Examples and Usage

## Quick Start Examples

### 1. Client Model Usage

```python
from clients.models import Client

# Create a client
client = Client.objects.create(
    full_name="Maria Santos",
    cpf="123.456.789-00",
    phone="+55 (21) 98765-4321",
    email="maria@example.com",
    address="Rua das Flores, 123, Rio de Janeiro",
    tags=["VIP", "Frequent Guest"]
)

# Query clients
vip_clients = Client.objects.filter(tags__contains="VIP")
client_by_cpf = Client.objects.get(cpf="123.456.789-00")
```

### 2. AccommodationUnit Model Usage

```python
from accommodations.models import AccommodationUnit

# Create a chalet
chalet = AccommodationUnit.objects.create(
    name="Chalet Premium Vista Mar",
    type=AccommodationUnit.CHALET,
    max_capacity=6,
    base_price=350.00,
    color_hex="#FF5733",
    status=AccommodationUnit.CLEAN
)

# Query available units
clean_units = AccommodationUnit.objects.filter(status=AccommodationUnit.CLEAN)
large_units = AccommodationUnit.objects.filter(max_capacity__gte=4)
```

### 3. Reservation Model Usage (with Overlap Validation)

```python
from reservations.models import Reservation
from django.utils import timezone
from datetime import timedelta

# Create a reservation (validation happens automatically)
try:
    reservation = Reservation.objects.create(
        accommodation_unit=chalet,
        client=client,
        check_in=timezone.now(),
        check_out=timezone.now() + timedelta(days=3),
        guest_count_adults=2,
        guest_count_children=1,
        status=Reservation.CONFIRMED
    )
    print("Reservation created successfully!")
except ValidationError as e:
    print(f"Validation failed: {e}")

# This will FAIL if there's an overlapping reservation:
# ValidationError: {'check_in': 'This accommodation unit is already 
# reserved for the selected dates. Conflict with reservation #1: 
# 19/11/2025 14:00 - 22/11/2025 14:00 (Client: Maria Santos)'}

# Check out a guest (auto-marks unit as dirty)
reservation.status = Reservation.CHECKED_OUT
reservation.save()
# chalet.status is now 'DIRTY'
```

### 4. Transaction Model Usage

```python
from financials.models import Transaction
from datetime import date

# Create income transaction (linked to reservation)
income = Transaction.objects.create(
    reservation=reservation,
    amount=1050.00,  # 3 days * 350.00
    transaction_type=Transaction.INCOME,
    category=Transaction.LODGING,
    payment_method=Transaction.PIX,
    due_date=date.today(),
    description="3-night stay at Chalet Premium Vista Mar"
)

# Create expense transaction (not linked to reservation)
expense = Transaction.objects.create(
    amount=150.00,
    transaction_type=Transaction.EXPENSE,
    category=Transaction.MAINTENANCE,
    payment_method=Transaction.CASH,
    due_date=date.today(),
    description="Pool cleaning service"
)

# Mark as paid
income.paid_date = date.today()
income.save()
print(income.is_paid)  # True

# Query transactions
unpaid = Transaction.objects.filter(paid_date__isnull=True)
this_month_income = Transaction.objects.filter(
    transaction_type=Transaction.INCOME,
    due_date__month=date.today().month
)
```

## Admin Interface Examples

### Access Admin
```bash
python manage.py createsuperuser
python manage.py runserver
# Visit: http://127.0.0.1:8000/admin/
```

### Admin Features
- **Clients**: Search by name, CPF, email, phone
- **Accommodations**: Filter by type and status
- **Reservations**: Filter by status, date hierarchy by check-in
- **Transactions**: Filter by type, category, payment method

## Testing Examples

### Run Specific Tests
```bash
# Test overlap validation
python manage.py test reservations.tests.ReservationOverlapValidationTest.test_exact_overlap_fails

# Test all reservation tests
python manage.py test reservations

# Test with verbose output
python manage.py test -v 2
```

## Common Queries

### Dashboard Queries

```python
from django.utils import timezone
from datetime import timedelta

# Today's check-ins
today = timezone.now().date()
todays_checkins = Reservation.objects.filter(
    check_in__date=today,
    status__in=[Reservation.CONFIRMED, Reservation.CHECKED_IN]
)

# Units that need cleaning
dirty_units = AccommodationUnit.objects.filter(status=AccommodationUnit.DIRTY)

# This month's revenue
from django.db.models import Sum
this_month_revenue = Transaction.objects.filter(
    transaction_type=Transaction.INCOME,
    paid_date__month=today.month
).aggregate(total=Sum('amount'))

# Unpaid invoices
unpaid_invoices = Transaction.objects.filter(
    transaction_type=Transaction.INCOME,
    paid_date__isnull=True,
    due_date__lte=today
)
```

### Availability Check

```python
def check_availability(unit, check_in, check_out):
    """Check if a unit is available for the given dates."""
    conflicts = Reservation.objects.filter(
        accommodation_unit=unit,
        check_in__lt=check_out,
        check_out__gt=check_in
    ).exclude(
        status=Reservation.CANCELLED
    )
    return not conflicts.exists()

# Usage
is_available = check_availability(chalet, start_date, end_date)
```

## Data Migration Examples

### Import Clients from CSV
```python
import csv
from clients.models import Client

with open('clients.csv', 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        Client.objects.create(
            full_name=row['name'],
            cpf=row['cpf'],
            phone=row['phone'],
            email=row['email']
        )
```

### Bulk Create Units
```python
from accommodations.models import AccommodationUnit

units_data = [
    {"name": "Chalet 1", "type": "CHALET", "capacity": 4, "price": 250.00},
    {"name": "Suite 101", "type": "SUITE", "capacity": 2, "price": 150.00},
    {"name": "Suite 102", "type": "SUITE", "capacity": 2, "price": 150.00},
]

units = [
    AccommodationUnit(
        name=data["name"],
        type=data["type"],
        max_capacity=data["capacity"],
        base_price=data["price"]
    )
    for data in units_data
]

AccommodationUnit.objects.bulk_create(units)
```

## Brazilian Date/Currency Formatting

```python
# In templates or views
from django.utils.formats import date_format

# Format dates
formatted_date = date_format(reservation.check_in, "d/m/Y H:i")
# Output: "19/11/2025 14:00"

# Format currency
from django.contrib.humanize.templatetags.humanize import intcomma
formatted_price = f"R$ {intcomma(chalet.base_price)}"
# Output: "R$ 350.00"
```

## Validation Examples

```python
# Attempt to create invalid reservation
from django.core.exceptions import ValidationError

# This will fail: check-out before check-in
try:
    bad_reservation = Reservation(
        accommodation_unit=chalet,
        client=client,
        check_in=timezone.now(),
        check_out=timezone.now() - timedelta(days=1),  # Invalid!
        guest_count_adults=2
    )
    bad_reservation.save()  # Will raise ValidationError
except ValidationError as e:
    print(e.message_dict)
    # {'check_out': ['Check-out date must be after check-in date.']}
```

## Next Steps

For Phase 2 (REST API), you'll be able to access these models via endpoints:
- `GET /api/clients/` - List all clients
- `POST /api/reservations/` - Create reservation (with validation)
- `GET /api/accommodations/available/?check_in=...&check_out=...` - Check availability
- `GET /api/financials/revenue-report/?month=11&year=2025` - Financial reports

Stay tuned for the next phase!
