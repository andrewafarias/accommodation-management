from datetime import timedelta

from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from core.models import LoginAttempt


class AuthenticationTest(TestCase):
    """
    Test suite for authentication endpoints.
    """
    
    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.username = 'testuser'
        self.password = 'testpass123'
        self.email = 'test@example.com'
        
        # Create a test user
        self.user = User.objects.create_user(
            username=self.username,
            password=self.password,
            email=self.email,
            first_name='Test',
            last_name='User'
        )
    
    def test_login_success(self):
        """Test successful login with valid credentials."""
        response = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': self.password
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], self.username)
        self.assertEqual(response.data['user']['email'], self.email)
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        response = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': 'wrongpassword'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)
    
    def test_login_missing_fields(self):
        """Test login with missing required fields."""
        response = self.client.post('/api/auth/login/', {
            'username': self.username
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_login_inactive_user(self):
        """Test login with inactive user account."""
        self.user.is_active = False
        self.user.save()
        
        response = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': self.password
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)
    
    def test_logout_success(self):
        """Test successful logout."""
        # First login to get token
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        # Logout
        response = self.client.post('/api/auth/logout/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        
        # Verify token is deleted
        self.assertFalse(Token.objects.filter(user=self.user).exists())
    
    def test_logout_without_authentication(self):
        """Test logout without authentication token."""
        response = self.client.post('/api/auth/logout/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_info_success(self):
        """Test getting user info with valid token."""
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        response = self.client.get('/api/auth/user/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.username)
        self.assertEqual(response.data['email'], self.email)
        self.assertEqual(response.data['first_name'], 'Test')
        self.assertEqual(response.data['last_name'], 'User')
    
    def test_user_info_without_authentication(self):
        """Test getting user info without authentication token."""
        response = self.client.get('/api/auth/user/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_protected_endpoint_requires_authentication(self):
        """Test that protected endpoints require authentication."""
        # Try to access accommodations without token
        response = self.client.get('/api/accommodations/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_protected_endpoint_with_valid_token(self):
        """Test that protected endpoints work with valid token."""
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        # Access accommodations with token
        response = self.client.get('/api/accommodations/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_token_persistence(self):
        """Test that the same token is returned for multiple logins."""
        # First login
        response1 = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': self.password
        }, format='json')
        token1 = response1.data['token']
        
        # Second login
        response2 = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': self.password
        }, format='json')
        token2 = response2.data['token']
        
        # Should return the same token
        self.assertEqual(token1, token2)


class ExponentialBackoffTest(TestCase):
    """
    Test suite for exponential backoff on failed login attempts.
    """

    def setUp(self):
        self.client = APIClient()
        self.username = 'backoffuser'
        self.password = 'securepass456'
        self.user = User.objects.create_user(
            username=self.username,
            password=self.password,
        )

    # ------------------------------------------------------------------
    # LoginAttempt model unit tests
    # ------------------------------------------------------------------

    def test_no_backoff_on_zero_failures(self):
        """No lock when there are no recorded failures."""
        attempt = LoginAttempt(username=self.username, failure_count=0)
        self.assertFalse(attempt.is_locked())
        self.assertEqual(attempt.get_wait_seconds(), 0)

    def test_wait_seconds_doubles_with_each_failure(self):
        """Wait time must be 2^(failures-1) seconds."""
        attempt = LoginAttempt(username=self.username)
        for n in range(1, 7):
            attempt.failure_count = n
            self.assertEqual(attempt.get_wait_seconds(), 2 ** (n - 1))

    def test_wait_seconds_capped_at_max(self):
        """Wait time must not exceed MAX_BACKOFF_SECONDS regardless of failure count."""
        attempt = LoginAttempt(username=self.username, failure_count=9999)
        self.assertEqual(attempt.get_wait_seconds(), LoginAttempt.MAX_BACKOFF_SECONDS)

    def test_is_locked_during_backoff_window(self):
        """is_locked() returns True when last_failure is within the backoff window."""
        attempt = LoginAttempt(
            username=self.username,
            failure_count=3,  # wait = 2^2 = 4 seconds
            last_failure=timezone.now() - timedelta(seconds=1),
        )
        self.assertTrue(attempt.is_locked())

    def test_is_not_locked_after_backoff_window(self):
        """is_locked() returns False once the backoff window has elapsed."""
        attempt = LoginAttempt(
            username=self.username,
            failure_count=2,  # wait = 2^1 = 2 seconds
            last_failure=timezone.now() - timedelta(seconds=3),
        )
        self.assertFalse(attempt.is_locked())

    def test_reset_clears_failure_count(self):
        """reset() clears the failure counter and last_failure timestamp."""
        attempt = LoginAttempt.objects.create(
            username=self.username,
            failure_count=5,
            last_failure=timezone.now(),
        )
        attempt.reset()
        attempt.refresh_from_db()
        self.assertEqual(attempt.failure_count, 0)
        self.assertIsNone(attempt.last_failure)

    # ------------------------------------------------------------------
    # Integration tests – login endpoint
    # ------------------------------------------------------------------

    def test_first_failure_is_not_blocked(self):
        """The very first failed attempt is never blocked (no prior backoff)."""
        response = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': 'wrongpassword',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_second_failure_within_backoff_returns_429(self):
        """A second rapid failure triggers the backoff (429)."""
        # First failure – records failure_count=1 → wait=1s
        self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': 'wrongpassword',
        }, format='json')

        # Immediately try again – should be blocked
        response = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': 'wrongpassword',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('retry_after', response.data)
        self.assertGreaterEqual(response.data['retry_after'], 0)

    def test_successful_login_resets_backoff(self):
        """A successful login clears the failure counter."""
        # Seed a failure record
        LoginAttempt.objects.create(
            username=self.username,
            failure_count=3,
            last_failure=timezone.now() - timedelta(seconds=100),
        )

        response = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': self.password,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        attempt = LoginAttempt.objects.get(username=self.username)
        self.assertEqual(attempt.failure_count, 0)
        self.assertIsNone(attempt.last_failure)

    def test_blocked_request_returns_retry_after_field(self):
        """429 response includes the 'retry_after' field with seconds to wait."""
        # Manually create a locked record
        LoginAttempt.objects.create(
            username=self.username,
            failure_count=4,  # wait = 2^3 = 8 seconds
            last_failure=timezone.now() - timedelta(seconds=1),
        )

        response = self.client.post('/api/auth/login/', {
            'username': self.username,
            'password': 'wrongpassword',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('retry_after', response.data)
        self.assertGreater(response.data['retry_after'], 0)
