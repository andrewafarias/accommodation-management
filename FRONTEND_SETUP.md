# Frontend Setup Guide

## Overview
This document describes the React frontend application setup for AccommodationManager.

## Technology Stack
- **Framework:** React 19 with Vite 7
- **Styling:** Tailwind CSS 3
- **Routing:** React Router DOM 6
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Charts:** Recharts
- **Date Handling:** date-fns

## Getting Started

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev
```
The application will be available at http://localhost:5173

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── services/
│   │   └── api.js              # Axios API configuration
│   ├── lib/
│   │   └── utils.js            # Shared utility functions
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Card.jsx
│   │   │   └── Button.jsx
│   │   └── layout/
│   │       └── Layout.jsx      # Main layout with sidebar
│   ├── pages/                  # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Calendar.jsx
│   │   └── Clients.jsx
│   ├── App.jsx                 # Main app with routing
│   ├── main.jsx                # Entry point
│   └── index.css               # Tailwind directives
├── public/
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## API Integration

The frontend connects to the Django backend API at `http://127.0.0.1:8000/api/`

### API Service (src/services/api.js)
- Configured Axios instance with base URL
- Request/response interceptors
- Ready for authentication token integration

### Endpoints Used
- `GET /api/accommodations/` - Fetch accommodation units
- `GET /api/reservations/` - Fetch reservations
- `GET /api/financials/` - Fetch financial transactions

## Components

### Layout (components/layout/Layout.jsx)
Main application layout with:
- Sidebar navigation
- Active route highlighting
- Responsive design

**Navigation Links:**
- Dashboard (/)
- Calendar (/calendar)
- Reservations (/reservations)
- Clients (/clients)
- Financials (/financials)

### Dashboard (pages/Dashboard.jsx)
Displays key business metrics and charts:

**Stats Cards:**
1. Units Available - Clean accommodation units
2. Check-ins Today - Reservations checking in today
3. Pending Payments - Unpaid transactions
4. Total Revenue - Sum of paid income

**Chart:**
- Income vs Expenses bar chart (mock data)

### UI Components (components/ui/)
Reusable components built with Tailwind CSS:
- **Card:** Container with header, title, and content sections
- **Button:** Customizable button with variants (default, outline, ghost)

### Utility Functions (lib/utils.js)
- `cn()` - Merges Tailwind classes using clsx and tailwind-merge

## Styling

### Tailwind CSS
- Configured to scan `src/**/*.{js,jsx,ts,tsx}`
- Custom utility classes can be added in `tailwind.config.js`
- Global styles in `src/index.css`

### Color Scheme
- Primary: Blue (#3b82f6)
- Sidebar: White with gray borders
- Background: Gray-100
- Text: Gray-900, Gray-600, Gray-500

## Data Flow

1. **Dashboard loads**
2. **Fetches data from API:**
   - Accommodations → Calculate units available
   - Reservations → Count today's check-ins
   - Financials → Count pending payments, calculate revenue
3. **Displays stats in cards**
4. **Renders chart with mock data**

## Brazilian Localization

- Currency formatting: R$ 1.050,00
- Date handling via date-fns
- Ready for pt-BR locale integration

## Future Enhancements

### Phase 4 (Suggested):
- [ ] Implement Gantt calendar view
- [ ] Add reservation creation/editing
- [ ] Build client management CRUD
- [ ] Complete financial transactions interface
- [ ] Add authentication
- [ ] Implement real-time updates
- [ ] Add data aggregation for charts
- [ ] Create reservation conflict visualization
- [ ] Add search and filtering
- [ ] Implement pagination

## Development Notes

### CORS Configuration
The backend is configured to allow CORS from:
- http://localhost:5173 (Vite dev server)
- http://localhost:3000 (Alternative React port)

### Environment Variables
For production, update the API base URL:
```javascript
// src/services/api.js
baseURL: process.env.VITE_API_URL || 'http://127.0.0.1:8000/api/'
```

Then create `.env`:
```
VITE_API_URL=https://your-api-domain.com/api/
```

## Troubleshooting

### API Not Responding
1. Ensure Django backend is running: `cd backend && python manage.py runserver`
2. Check CORS settings in `backend/config/settings.py`
3. Verify API endpoints in browser: http://127.0.0.1:8000/api/

### Build Issues
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear build cache: `rm -rf dist`
3. Update dependencies: `npm update`

### Styling Not Applying
1. Ensure Tailwind content paths are correct in `tailwind.config.js`
2. Restart dev server after config changes
3. Check browser console for CSS loading errors

## Testing

### Manual Testing
1. Start backend: `cd backend && python manage.py runserver`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to http://localhost:5173
4. Verify:
   - Dashboard loads with correct stats
   - Navigation works between pages
   - API calls complete successfully (check Network tab)

### Linting
```bash
npm run lint
```

### Build Test
```bash
npm run build
```

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Router Documentation](https://reactrouter.com/)
- [Recharts Documentation](https://recharts.org/)
