# AccommodationManager Backend

Django-based backend for the AccommodationManager Property Management System.

## Setup

1. **Create and activate virtual environment:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run migrations:**
```bash
python manage.py migrate
```

4. **Create superuser (optional):**
```bash
python manage.py createsuperuser
```

5. **Run development server:**
```bash
python manage.py runserver
```

The server will start at http://127.0.0.1:8000/

## Project Structure

```
backend/
├── config/              # Django project settings
├── core/               # Core app for shared utilities
├── accommodations/     # Accommodation units management
├── reservations/       # Reservation system with overlap validation
├── clients/            # Client/guest management
├── financials/         # Financial transactions
└── housekeeping/       # Housekeeping management
```

## Models

### Client (clients/models.py)
- Manages guest information
- Unique identifier: CPF (Brazilian taxpayer ID)
- Fields: full_name, cpf, phone, email, address, notes, tags

### AccommodationUnit (accommodations/models.py)
- Manages physical rental spaces (chalets, suites, rooms)
- Fields: name, type, max_capacity, base_price, color_hex, status
- Status options: CLEAN, DIRTY, INSPECTING

### Reservation (reservations/models.py)
- **CRITICAL FEATURE**: Overlap validation prevents double bookings
- ForeignKeys: accommodation_unit, client
- Fields: check_in, check_out, guest_count_adults, guest_count_children, status
- Status options: PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED
- Auto-marks unit as DIRTY on checkout

### Transaction (financials/models.py)
- Manages income and expenses
- Optional link to reservations
- Fields: amount, transaction_type, category, payment_method, due_date, paid_date
- Property: is_paid (based on paid_date)

## Key Features

### 1. Reservation Overlap Prevention
The Reservation model includes a `clean()` method that validates:
- Check-out is after check-in
- No overlapping reservations for the same unit
- Cancelled reservations are excluded from conflict checks
- Updates to existing reservations don't conflict with themselves

### 2. Auto-Dirty Status
When a reservation status changes to CHECKED_OUT, the accommodation unit's status automatically changes to DIRTY.

### 3. Brazilian Localization
- Timezone: America/Sao_Paulo
- Language: pt-br
- Currency: BRL (Brazilian Reais)
- CPF field for client identification

## Running Tests

Run all tests:
```bash
python manage.py test
```

Run specific app tests:
```bash
python manage.py test reservations
python manage.py test clients
python manage.py test accommodations
python manage.py test financials
```

Run with verbose output:
```bash
python manage.py test -v 2
```

## Admin Interface

Access the Django admin at http://127.0.0.1:8000/admin/

All models are registered with appropriate list displays, filters, and search fields.

## API (Coming Soon)

Django REST Framework is installed and configured. API endpoints will be added in the next phase.

## Technologies

- **Django** 4.2+ - Web framework
- **Django REST Framework** - API framework
- **django-cors-headers** - CORS support for frontend
- **holidays** - Brazilian holiday support
- **pandas** - Financial analytics
- **reportlab** - PDF generation
- **SQLite** - Development database (PostgreSQL for production)
