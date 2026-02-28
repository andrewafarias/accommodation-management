# Setup Complete! 🎉

Your Accommodation Management app is now ready to run on your machine.

## Quick Start

### Option 1: Development Server (Recommended)
```bash
cd /home/andrew/Codespace/accommodation-management
./run_app.sh
```

The app will start at: http://localhost:8000

### Option 2: Run with Different Port
```bash
./run_app.sh 3000
```

### Option 3: Manual Start
```bash
cd /home/andrew/Codespace/accommodation-management
source .venv/bin/activate
cd backend
python manage.py runserver 0.0.0.0:8000
```

## What Was Installed

✅ **Backend Dependencies**
- Django 4.2.28
- Django REST Framework
- PostgreSQL adapter (psycopg2)
- And 13 other Python packages

✅ **Frontend**
- React 19
- Vite 7 (bundler)
- Tailwind CSS
- All dependencies compiled and ready

✅ **Database**
- SQLite database initialized
- All migrations applied
- Ready for data

## Access Points

| Component | URL | Purpose |
|-----------|-----|---------|
| **Frontend** | http://localhost:8000 | Main app interface |
| **API** | http://localhost:8000/api | REST API endpoints |
| **Admin** | http://localhost:8000/admin | Django admin panel |

## Default Admin Access

To create an admin user and access the admin panel:
```bash
cd backend
source ../.venv/bin/activate
python manage.py createsuperuser
```

Then login at: http://localhost:8000/admin

## Frontend Development

To run ONLY the frontend in development mode with hot reload:
```bash
cd frontend
npm run dev
```
The frontend dev server will run at http://localhost:5173

## Building for Production

To rebuild the frontend for production:
```bash
cd frontend
npm run build
```

Then collect static files:
```bash
cd backend
python manage.py collectstatic --noinput
```

## Next Steps

1. **Start the server**: `./run_app.sh`
2. **Open browser**: http://localhost:8000
3. **Create admin user**: `python manage.py createsuperuser` (only first time)
4. **Access admin panel**: http://localhost:8000/admin

## Troubleshooting

### Port Already in Use
If port 8000 is busy, use a different port:
```bash
./run_app.sh 3000
```

### Virtual Environment Issues
Activate the venv manually:
```bash
source .venv/bin/activate
```

### Need to Rebuild Frontend?
```bash
cd frontend && npm run build && cd ../backend && python manage.py collectstatic --noinput
```

## Project Structure

- **`backend/`** - Django REST API
- **`frontend/`** - React + Vite app
- **`.venv/`** - Python virtual environment
- **`start_server.sh`** - Full deployment script
- **`run_app.sh`** - Quick development start script

Enjoy! 🚀
