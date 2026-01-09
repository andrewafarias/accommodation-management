# Static Files Fix - Heroku Deployment

## Problem
After deploying to Heroku, the application failed to load with MIME type errors:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".
Refused to apply style from '...' because its MIME type ('text/html') is not a supported stylesheet MIME type.
```

## Root Cause
1. **Frontend not built**: The Vite/React frontend was not being built during Heroku deployment
2. **Missing static files**: Without the frontend build, `collectstatic` couldn't find the compiled JS/CSS assets
3. **Django catch-all route**: The SPA catch-all route was intercepting static file requests due to incorrect regex pattern
4. **Django collectstatic issue**: Django's built-in collectstatic command was not functioning correctly (possible version-specific bug)

## Solution

### 1. Build Frontend During Deployment
Updated `Procfile` to build the frontend before collecting static files:
```
release: npm run build && python collect_static.py && python backend/manage.py migrate
```

### 2. Custom Static Files Collection Script
Created `collect_static.py` to reliably collect static files from all finders to `STATIC_ROOT`. This script:
- Uses Django's static file finders to locate all static files
- Copies files from source locations to `STATIC_ROOT`
- Handles directory creation and file timestamps
- Provides detailed output for debugging

### 3. Fixed SPA Catch-All Route Regex
Updated the regex pattern in `backend/config/urls.py` to correctly exclude static and media paths:

**Before (INCORRECT):**
```python
re_path(r'^(?!static/)(?!media/).*$', spa_view, name='spa')
```
This pattern failed because Django URLs start with `/` (e.g., `/static/assets/index.css`).
The negative lookahead `(?!static/)` only prevents `static/...` but allows `/static/...`.

**After (CORRECT):**
```python
re_path(r'^(?!/(static|media)/).*$', spa_view, name='spa')
```
This pattern uses proper negative lookahead to prevent URLs starting with `/static/` or `/media/`.

### 4. WhiteNoise Configuration
WhiteNoise middleware (already configured) serves static files in production with:
- Correct MIME types
- Compression
- Caching headers
- Security headers

## Files Changed

### `Procfile`
- Added `npm run build` to build frontend before deployment
- Replaced `python backend/manage.py collectstatic --noinput` with `python collect_static.py`

### `collect_static.py` (NEW)
- Custom Python script that collects static files
- Workaround for Django collectstatic issues
- More reliable and provides better debugging output

### `backend/config/urls.py` (UPDATED)
- Fixed regex pattern for SPA catch-all route
- Changed from `^(?!static/)(?!media/).*$` to `^(?!/(static|media)/).*$`
- Correctly excludes `/static/` and `/media/` paths to allow WhiteNoise to serve them

### `.gitignore`
- Added build artifacts and generated directories:
  - `backend/staticfiles/`
  - `frontend/dist/`
  - `frontend/node_modules/`
  - `node_modules/`

## Verification

### Local Testing
```bash
# Build frontend
npm run build

# Collect static files
python collect_static.py

# Start server
cd backend
DEBUG=False python manage.py runserver

# Test static files
curl -I http://localhost:8000/static/assets/index-<hash>.css
curl -I http://localhost:8000/static/assets/index-<hash>.js
```

Expected: HTTP 200 with correct Content-Type headers:
- CSS: `Content-Type: text/css`
- JS: `Content-Type: text/javascript`

### Heroku Deployment
When you push to Heroku:
1. Heroku detects Node.js (via `package.json`) and Python (via `requirements.txt`)
2. Installs Node.js dependencies
3. Installs Python dependencies
4. Runs the `release` command in Procfile:
   - Builds frontend (`npm run build`)
   - Collects static files (`python collect_static.py`)
   - Runs migrations (`python backend/manage.py migrate`)
5. Starts the web server with Gunicorn
6. WhiteNoise middleware serves static files with correct MIME types

## Technical Details

### Why WhiteNoise?
WhiteNoise allows Django to serve static files efficiently in production:
- No need for a separate web server like Nginx
- Automatic compression (gzip/brotli)
- Far-future expiry headers for caching
- Works seamlessly with Django and Gunicorn
- Heroku-friendly

### Why Custom collect_static.py?
Django's `collectstatic` command had issues (possibly version-specific):
- Reported "0 files copied" even when files existed
- Failed to create the staticfiles directory
- No clear error messages or debug output

The custom script:
- Uses the same Django static file finders
- Provides clear, verbose output
- Handles edge cases (missing directories, permissions)
- More maintainable and debuggable

### Static Files Flow
```
1. Frontend build (Vite)
   frontend/src/* -> frontend/dist/*

2. Collect static (collect_static.py)
   frontend/dist/* -> backend/staticfiles/assets/*
   admin static -> backend/staticfiles/admin/*
   rest_framework -> backend/staticfiles/rest_framework/*

3. Serve (WhiteNoise middleware)
   Request: /static/assets/index-<hash>.js
   Response: backend/staticfiles/assets/index-<hash>.js
   MIME Type: text/javascript
```

## Future Improvements
- Consider using Django 5.x which has improved STORAGES configuration
- Investigate the root cause of collectstatic issues
- Add automated tests for static file serving
- Consider CDN for static files in production (optional)

## References
- [WhiteNoise Documentation](http://whitenoise.evans.io/)
- [Django Static Files](https://docs.djangoproject.com/en/4.2/howto/static-files/)
- [Heroku Django Deployment](https://devcenter.heroku.com/articles/django-app-configuration)
