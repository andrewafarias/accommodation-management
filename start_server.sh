#!/bin/bash

# Exit on error
set -e

echo "============================================"
echo "Starting Accommodation Management System"
echo "============================================"

# Get the script directory
if [ -n "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi
cd "$SCRIPT_DIR"

# Step 1: Build Frontend
echo ""
echo "[1/6] Building frontend..."
cd frontend

echo "  - Installing dependencies..."
# Use npm ci for faster, more reliable builds if package-lock.json exists
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

echo "  - Building production bundle..."
npm run build

# Step 2: Prepare Backend
echo ""
echo "[2/6] Preparing backend..."
cd ../backend

echo "  - Installing Python dependencies..."
# Use virtual environment if VIRTUAL_ENV is not set
if [ -z "$VIRTUAL_ENV" ]; then
    echo "  ⚠ Warning: No virtual environment detected. Consider using a virtualenv."
    echo "  - Installing to system Python..."
fi
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
    
    # Calculate workers based on CPU cores (2 * cores + 1)
    WORKERS="${GUNICORN_WORKERS:-$((2 * $(nproc 2>/dev/null || echo 2) + 1))}"
    
    # Step 6: Start Server with Gunicorn
    echo ""
    echo "[6/6] Starting server with Gunicorn on port $PORT..."
    echo "  - Workers: $WORKERS"
    echo "============================================"
    echo "Server running at http://0.0.0.0:$PORT"
    echo "Press Ctrl+C to stop"
    echo "============================================"
    
    gunicorn config.wsgi:application \
        --bind 0.0.0.0:$PORT \
        --workers $WORKERS \
        --worker-class sync \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
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
