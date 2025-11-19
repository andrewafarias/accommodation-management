# API Usage Guide

This document provides examples of how to use the AccommodationManager API.

## Base URL

```
http://localhost:8000/api/
```

## Endpoints

### 1. Accommodations API

**Endpoint:** `/api/accommodations/`

#### List all accommodations
```bash
GET /api/accommodations/
```

#### Filter by status
```bash
GET /api/accommodations/?status=CLEAN
```

#### Filter by type
```bash
GET /api/accommodations/?type=CHALET
```

#### Create a new accommodation
```bash
POST /api/accommodations/
Content-Type: application/json

{
  "name": "Chalet Paradise",
  "type": "CHALET",
  "max_capacity": 6,
  "base_price": "350.00",
  "color_hex": "#FF5733",
  "status": "CLEAN"
}
```

#### Update an accommodation
```bash
PATCH /api/accommodations/1/
Content-Type: application/json

{
  "status": "DIRTY"
}
```

#### Delete an accommodation
```bash
DELETE /api/accommodations/1/
```

---

### 2. Clients API

**Endpoint:** `/api/clients/`

#### List all clients
```bash
GET /api/clients/
```

#### Search clients
```bash
GET /api/clients/?search=João
```

#### Create a new client
```bash
POST /api/clients/
Content-Type: application/json

{
  "full_name": "João da Silva",
  "cpf": "123.456.789-00",
  "phone": "+55 (11) 98765-4321",
  "email": "joao@example.com"
}
```

---

### 3. Reservations API

**Endpoint:** `/api/reservations/`

#### List all reservations
```bash
GET /api/reservations/
```

#### Filter by status
```bash
GET /api/reservations/?status=CONFIRMED
```

#### Filter by check-in date range
```bash
GET /api/reservations/?check_in_start=2025-11-01&check_in_end=2025-11-30
```

#### Create a new reservation
```bash
POST /api/reservations/
Content-Type: application/json

{
  "accommodation_unit": 1,
  "client": 1,
  "check_in": "2025-11-26T14:00:00Z",
  "check_out": "2025-11-29T10:00:00Z",
  "guest_count_adults": 4,
  "guest_count_children": 2,
  "status": "CONFIRMED",
  "notes": "Early check-in requested"
}
```

**Response:**
```json
{
  "id": 1,
  "accommodation_unit": {
    "id": 1,
    "name": "Chalet Paradise",
    "type": "CHALET",
    "max_capacity": 6,
    "base_price": "350.00",
    "color_hex": "#FF5733",
    "status": "CLEAN"
  },
  "client": {
    "id": 1,
    "full_name": "João da Silva",
    "cpf": "123.456.789-00",
    "phone": "+55 (11) 98765-4321",
    "email": "joao@example.com"
  },
  "check_in": "2025-11-26T14:00:00Z",
  "check_out": "2025-11-29T10:00:00Z",
  "guest_count_adults": 4,
  "guest_count_children": 2,
  "status": "CONFIRMED",
  "notes": "Early check-in requested"
}
```

#### Check availability
```bash
GET /api/reservations/check_availability/?check_in=2025-12-01T14:00:00Z&check_out=2025-12-05T10:00:00Z
```

**Response:**
```json
{
  "check_in": "2025-12-01T14:00:00Z",
  "check_out": "2025-12-05T10:00:00Z",
  "available_units": [
    {
      "id": 1,
      "name": "Chalet Paradise",
      "type": "CHALET",
      "max_capacity": 6,
      "base_price": "350.00",
      "color_hex": "#FF5733",
      "status": "CLEAN"
    }
  ]
}
```

---

### 4. Financials API

**Endpoint:** `/api/financials/`

#### List all transactions
```bash
GET /api/financials/
```

#### Filter by transaction type
```bash
GET /api/financials/?transaction_type=INCOME
```

#### Filter by due date range
```bash
GET /api/financials/?due_date_start=2025-11-01&due_date_end=2025-11-30
```

#### Create a new transaction
```bash
POST /api/financials/
Content-Type: application/json

{
  "reservation": 1,
  "amount": "1050.00",
  "transaction_type": "INCOME",
  "category": "LODGING",
  "payment_method": "PIX",
  "due_date": "2025-11-27",
  "description": "Payment for reservation #1"
}
```

#### Mark transaction as paid
```bash
PATCH /api/financials/1/
Content-Type: application/json

{
  "paid_date": "2025-11-27"
}
```

---

## Special Features

### Nested Serialization

The Reservations API returns nested objects for `client` and `accommodation_unit` on read operations, but accepts IDs on write operations. This provides:

- **Better UX**: Frontend gets all necessary data in one request
- **Simpler writes**: Only need to send IDs when creating/updating

### Automatic Validation

The API automatically enforces business rules:

1. **No overlapping reservations**: Attempting to create a conflicting reservation returns a 400 error with details
2. **Check-out after check-in**: Validates date logic
3. **Auto-dirty status**: Checking out sets the accommodation to DIRTY status

Example validation error:
```json
{
  "check_in": [
    "This accommodation unit is already reserved for the selected dates. Conflict with reservation #1: 26/11/2025 14:00 - 29/11/2025 10:00 (Client: João da Silva)"
  ]
}
```

### Pagination

All list endpoints support pagination:

```bash
GET /api/accommodations/?page=2
```

Default page size is 100 items.

---

## Testing the API

### Using curl

```bash
# List accommodations
curl http://localhost:8000/api/accommodations/

# Create a client
curl -X POST http://localhost:8000/api/clients/ \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Maria Santos",
    "cpf": "987.654.321-00",
    "phone": "+55 (21) 91234-5678",
    "email": "maria@example.com"
  }'

# Check availability
curl "http://localhost:8000/api/reservations/check_availability/?check_in=2025-12-01T14:00:00Z&check_out=2025-12-05T10:00:00Z"
```

### Using Python requests

```python
import requests

# Create an accommodation
response = requests.post(
    "http://localhost:8000/api/accommodations/",
    json={
        "name": "Suite Deluxe",
        "type": "SUITE",
        "max_capacity": 2,
        "base_price": "200.00",
        "color_hex": "#3366FF",
        "status": "CLEAN"
    }
)
accommodation = response.json()

# Create a reservation
response = requests.post(
    "http://localhost:8000/api/reservations/",
    json={
        "accommodation_unit": accommodation["id"],
        "client": 1,
        "check_in": "2025-12-10T14:00:00Z",
        "check_out": "2025-12-13T10:00:00Z",
        "guest_count_adults": 2,
        "status": "CONFIRMED"
    }
)
reservation = response.json()
print(f"Created reservation: {reservation['id']}")
```

---

## Error Handling

The API returns appropriate HTTP status codes:

- **200 OK**: Successful GET/PATCH/PUT
- **201 Created**: Successful POST
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Validation errors
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

Error responses include details:

```json
{
  "field_name": [
    "Error message"
  ]
}
```
