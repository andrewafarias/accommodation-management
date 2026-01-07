# Deployment Guide

This guide explains how to deploy the Accommodation Management System on a single server.

## Quick Start

The `start_server.sh` script automates the entire deployment process:

```bash
./start_server.sh
```

## What the Script Does

The script performs the following steps in order:

1. **Build Frontend** - Navigates to `frontend/` and runs:
   - `npm ci` (or `npm install` if no package-lock.json) - Installs all Node.js dependencies
   - `npm run build` - Creates production build in `frontend/dist/`

2. **Install Backend Dependencies** - Navigates to `backend/` and runs:
   - `pip install -r requirements.txt` - Installs all Python dependencies

3. **Collect Static Files** - Runs:
   - `python manage.py collectstatic --noinput` - Gathers admin static files and frontend assets into `staticfiles/`

4. **Run Database Migrations** - Runs:
   - `python manage.py migrate` - Applies all database migrations

5. **Start Server** - Starts the application server:
   - **Production (default)**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
   - **Development**: `python manage.py runserver 0.0.0.0:$PORT`

## Configuration

### Environment Variables

- **`PORT`** (default: `8000`) - The port number the server will listen on
  ```bash
  PORT=3000 ./start_server.sh
  ```

- **`USE_GUNICORN`** (default: `true`) - Whether to use Gunicorn or Django's development server
  ```bash
  # Use Django development server
  USE_GUNICORN=false ./start_server.sh
  ```

- **`GUNICORN_WORKERS`** (default: auto-calculated as `2 * CPU_CORES + 1`) - Number of Gunicorn worker processes
  ```bash
  GUNICORN_WORKERS=4 ./start_server.sh
  ```

- **`VIRTUAL_ENV`** - If set, indicates a virtual environment is active. The script will warn if not using a virtualenv.

### Other Environment Variables

The application also respects these Django environment variables:

- `SECRET_KEY` - Django secret key (required in production)
- `DEBUG` - Set to `True` for development (default: `True`)
- `ALLOWED_HOSTS` - Comma-separated list of allowed hostnames
- `DATABASE_URL` - Database connection string (defaults to SQLite)
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Cloudinary configuration for media storage

## Examples

### Using Virtual Environment (Recommended)

Create and activate a virtual environment before running the script:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it (Linux/Mac)
source venv/bin/activate

# Activate it (Windows)
# venv\Scripts\activate

# Run the script
./start_server.sh
```

### Development Mode

Run with Django's development server on port 8000:

```bash
USE_GUNICORN=false ./start_server.sh
```

### Production Mode

Run with Gunicorn on port 80:

```bash
PORT=80 ./start_server.sh
```

### With Environment File

Create a `.env` file in the `backend/` directory with your configuration:

```env
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
PORT=8000
```

Then run:

```bash
./start_server.sh
```

## Manual Deployment Steps

If you prefer to run the steps manually:

```bash
# 0. Set up virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 1. Build frontend
cd frontend
npm ci  # or npm install if no package-lock.json
npm run build

# 2. Install backend dependencies
cd ../backend
pip install -r requirements.txt

# 3. Collect static files
python manage.py collectstatic --noinput

# 4. Run migrations
python manage.py migrate

# 5. Start server (choose one)
# Production with Gunicorn (with optimized settings):
gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --worker-class sync \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -

# Development with Django:
python manage.py runserver 0.0.0.0:8000
```

## Prerequisites

Before running the script, ensure you have:

- **Node.js** (v18+) and **npm** installed
- **Python** (3.11+) and **pip** installed (Python 3.8 reached EOL in 2024)
- **Git** (if cloning from repository)
- **Virtual Environment** (recommended): Create and activate a Python virtual environment before running the script

## Troubleshooting

### Port Already in Use

If you get an error that the port is already in use:

```bash
# Use a different port
PORT=8080 ./start_server.sh
```

### Permission Denied

If you get a permission denied error:

```bash
chmod +x start_server.sh
./start_server.sh
```

### Frontend Build Fails

If the frontend build fails, try:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Backend Dependencies Fail

If Python dependencies fail to install, ensure you have:

- PostgreSQL development headers (for `psycopg2-binary`)
- Python development headers

On Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install python3-dev libpq-dev
```

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `DEBUG=False` in environment variables
- [ ] Set a strong `SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Set up PostgreSQL database (update `DATABASE_URL`)
- [ ] Configure HTTPS/SSL settings
- [ ] Set up Cloudinary credentials for media storage
- [ ] Configure CORS origins for your frontend domain
- [ ] Set up process manager (systemd, supervisor) to keep server running
- [ ] Configure reverse proxy (nginx, Apache) for serving static files and SSL termination

## Systemd Service (Optional)

To run the application as a systemd service:

Create `/etc/systemd/system/accommodation-mgmt.service`:

```ini
[Unit]
Description=Accommodation Management System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/accommodation-management
Environment="PATH=/path/to/venv/bin"
Environment="PORT=8000"
ExecStart=/path/to/accommodation-management/start_server.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable accommodation-mgmt
sudo systemctl start accommodation-mgmt
```
