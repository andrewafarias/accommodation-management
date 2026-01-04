from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token


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
