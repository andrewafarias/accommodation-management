#!/bin/bash

# Quick start script for Accommodation Management app
set -e

VENV_PATH="$(dirname "$0")/.venv"
BACKEND_PATH="$(dirname "$0")/backend"

if [ ! -d "$VENV_PATH" ]; then
    echo "Error: Virtual environment not found at $VENV_PATH"
    exit 1
fi

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Default port
PORT=${1:-8000}

echo "============================================"
echo "Starting Accommodation Management System"
echo "============================================"
echo "Backend URL: http://localhost:$PORT"
echo "Admin URL:  http://localhost:$PORT/admin"
echo ""

cd "$BACKEND_PATH"
python manage.py runserver 0.0.0.0:$PORT
