# Authentication System Documentation

## Overview

This accommodation management system now includes a comprehensive authentication system to ensure that only authorized users can access the application and its data.

## Features

### Security
- **Token-based Authentication**: Uses Django REST Framework's built-in token authentication
- **Secure Session Cookies**: HttpOnly and SameSite=Lax flags enabled
- **XSS Protection**: Browser XSS filter enabled
- **CSRF Protection**: Cross-Site Request Forgery protection enabled
- **Password Validation**: Enforces minimum length and common password checking
- **Protected API Endpoints**: All API endpoints require authentication by default

### User Experience
- **Automatic Login Persistence**: Users remain logged in across sessions
- **Automatic Token Validation**: Token is validated on app load
- **Automatic Redirect**: Unauthenticated users are redirected to login
- **Error Handling**: 401 errors automatically redirect to login page
- **Portuguese UI**: Login page in Brazilian Portuguese

## Default Credentials

For testing and initial setup:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the default password in production!

## Creating Users

### Via Django Admin Panel

1. Start the Django server:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. Navigate to http://localhost:8000/admin/

3. Log in with superuser credentials

4. Go to "Users" and click "Add User"

5. Fill in username and password

### Via Django Shell

```bash
cd backend
python manage.py shell
```

```python
from django.contrib.auth.models import User

# Create a regular user
user = User.objects.create_user(
    username='username',
    password='password',
    email='user@example.com',
    first_name='First',
    last_name='Last'
)

# Create a superuser (admin)
superuser = User.objects.create_superuser(
    username='admin',
    password='securepassword',
    email='admin@example.com'
)
```

### Via Management Command

```bash
cd backend
python manage.py createsuperuser
```

Follow the prompts to create a superuser account.

## API Usage

### Login

**Endpoint**: `POST /api/auth/login/`

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response**:
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": "User"
  }
}
```

### Logout

**Endpoint**: `POST /api/auth/logout/`

**Headers**:
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Response**:
```json
{
  "message": "Successfully logged out"
}
```

### Get User Info

**Endpoint**: `GET /api/auth/user/`

**Headers**:
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Response**:
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "first_name": "Admin",
  "last_name": "User"
}
```

### Using Protected Endpoints

All API endpoints now require authentication. Include the token in the Authorization header:

```bash
curl -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" \
  http://localhost:8000/api/accommodations/
```

## Frontend Usage

The frontend automatically handles authentication:

1. **First Visit**: Users are redirected to the login page
2. **After Login**: Token is stored in localStorage and users can access all pages
3. **Logout**: Click the "Sair" button in the sidebar to logout
4. **Session Persistence**: Users remain logged in even after closing the browser
5. **Token Expiration**: If the token expires or becomes invalid, users are automatically redirected to login

## Environment Variables

For production deployment, set these environment variables:

```bash
# Security settings (recommended for production)
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Enable secure cookies (HTTPS only)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

## Security Best Practices

1. **Change Default Credentials**: Always change the default admin password in production
2. **Use HTTPS**: Enable HTTPS in production to protect tokens in transit
3. **Rotate Tokens**: Periodically regenerate user tokens for sensitive accounts
4. **Strong Passwords**: Enforce strong password policies for all users
5. **Monitor Access**: Review Django's authentication logs regularly
6. **Limit Attempts**: Consider adding rate limiting for login attempts (e.g., django-ratelimit)

## Troubleshooting

### "401 Unauthorized" Error

- Check that the token is being sent in the Authorization header
- Verify the token format: `Token <token-value>`
- Ensure the user exists and is active
- Try logging in again to get a fresh token

### Token Not Persisting

- Check browser localStorage (DevTools → Application → Local Storage)
- Verify the token key is `authToken`
- Check for JavaScript errors in the browser console

### Can't Login After First Setup

1. Create a superuser:
   ```bash
   cd backend
   python manage.py createsuperuser
   ```

2. Or create a regular user via Django shell as shown above

## Testing

Run the authentication test suite:

```bash
cd backend
python manage.py test core.test_auth
```

All 11 authentication tests should pass.

## Support

For issues or questions, please refer to:
- Django Authentication Documentation: https://docs.djangoproject.com/en/4.2/topics/auth/
- Django REST Framework Authentication: https://www.django-rest-framework.org/api-guide/authentication/
