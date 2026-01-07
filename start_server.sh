#!/bin/bash

# Exit on error
set -e

echo "============================================"
echo "Starting Accommodation Management System"
echo "============================================"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Build Frontend
echo ""
echo "[1/6] Building frontend..."
cd frontend

echo "  - Installing dependencies..."
npm install

echo "  - Building production bundle..."
npm run build

# Step 2: Prepare Backend
echo ""
echo "[2/6] Preparing backend..."
cd ../backend

echo "  - Installing Python dependencies..."
pip install -r requirements.txt

# Step 3: Collect Static Files
echo ""
echo "[3/6] Collecting static files..."
python manage.py collectstatic --noinput

# Step 4: Run Database Migrations
echo ""
echo "[4/6] Running database migrations..."
python manage.py migrate

# Step 5: Determine execution mode
echo ""
echo "[5/6] Determining execution mode..."

# Check if PORT environment variable is set, default to 8000
PORT="${PORT:-8000}"

# Check if we should use Gunicorn (production) or runserver (development)
if [ "${USE_GUNICORN:-true}" = "true" ]; then
    echo "  - Using Gunicorn (production mode)"
    
    # Step 6: Start Server with Gunicorn
    echo ""
    echo "[6/6] Starting server with Gunicorn on port $PORT..."
    echo "============================================"
    echo "Server running at http://0.0.0.0:$PORT"
    echo "Press Ctrl+C to stop"
    echo "============================================"
    
    gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
else
    echo "  - Using Django development server"
    
    # Step 6: Start Server with Django runserver
    echo ""
    echo "[6/6] Starting Django development server on port $PORT..."
    echo "============================================"
    echo "Server running at http://0.0.0.0:$PORT"
    echo "Press Ctrl+C to stop"
    echo "============================================"
    
    python manage.py runserver 0.0.0.0:$PORT
fi
