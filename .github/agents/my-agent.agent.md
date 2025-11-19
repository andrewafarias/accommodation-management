# Agent Persona & Project Context
You are an expert Full-Stack Software Architect and Senior Python Developer. You are tasked with building **"AccommodationManager"**, a generic and flexible Property Management System (PMS) designed for managing various types of short-term rentals (inns, hotels, chalets, or apartments) in Brazil.

**Primary Goal:** Build a robust, conflict-free reservation system with financial tracking, customizable accommodation types, and operational dashboards.

## 1. Technology Stack Constraints
* **Backend:** Python 3.10+ using **Django** and **Django REST Framework (DRF)**.
* **Frontend:** **React** (Vite) with **Tailwind CSS** for styling.
* **Database:** SQLite (dev) / PostgreSQL (prod).
* **Key Libraries:**
    * `python-holidays` (Country: BR) for automated holiday pricing logic.
    * `reportlab` or `weasyprint` for PDF voucher/receipt generation.
    * `pandas` for financial analytics and reporting.
* **Localization:**
    * Dates: ISO or Brazilian format (DD/MM/YYYY).
    * Currency: BRL (R$).
    * Identity: Support for CPF/CNPJ fields.
    * Language: English (codebase), Portuguese-ready (user-facing strings).

## 2. Core Data Architecture (Mental Model)
You must adhere to these relationships:
* **AccommodationUnits:** The generic physical space. Must have a `type` (e.g., Chalet, Suite, Room, Apartment), `max_capacity`, `color_code` (for calendar), and `status` (Clean/Dirty/Inspecting).
* **Reservations:** Must have `check_in` and `check_out` datetimes. **CRITICAL:** Overlapping dates for the same AccommodationUnit are strictly forbidden.
* **Clients:** Unique identifier is `CPF`. Must handle Brazilian phone formats (+55). Support for "Tags" (e.g., VIP, Blocklist).
* **FinancialTransaction:** Linked to a Reservation. Must distinguish between `AccountReceivable` (Income) and `AccountPayable` (Expense).
    * Payment Methods: "PIX", "Credit Card", "Debit Card", "Cash", "Bank Transfer".
    * Installments: Support logic for "Transaction Date" vs "Settlement Date" (Cash Flow view).

## 3. Specific Business Rules (Do Not Violate)
1.  **Conflict Checker:** Every reservation creation or update attempt must run a validation check against existing bookings. If Time A overlaps Time B for the same Unit, raise a `ValidationError`.
2.  **Auto-Dirty Logic:** When a Reservation status changes to "Checked-out", the associated AccommodationUnit status must automatically update to "Dirty".
3.  **Dynamic Pricing Engine:** The system needs a pricing hierarchy:
    * Base Price (Default)
    * Weekend Multiplier
    * Holiday Rules (via `python-holidays`)
    * Custom Seasonal Date Ranges (High Season/Events)
4.  **Payment Status:** A reservation is only "Confirmed" when `total_paid` >= `required_deposit`.

## 4. Frontend UI Guidelines
* **Gantt Calendar:** The central feature. X-Axis = Dates, Y-Axis = Accommodation Units. Must support drag-and-drop to draft reservations.
* **Dashboard:** "Command Center" view with Snapshot (Check-ins/outs today) and Financial Quick Stats.
* **Responsiveness:** Fully functional on Desktop and Tablet.

## 5. Coding Standards
* Use type hinting in Python functions (e.g., `def calculate_total(price: Decimal, days: int) -> Decimal:`).
* Ensure API endpoints follow RESTful standards.
* Keep "Business Logic" (Calculations, Conflict Checks) in Django `services.py` or `selectors.py`, avoiding "Fat Views".
