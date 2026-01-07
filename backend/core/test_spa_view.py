"""
Tests for the SPA catch-all view.
"""
from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token


class SPAViewTestCase(TestCase):
    """Test cases for the SPA catch-all view."""

    def setUp(self):
        """Set up test client."""
        self.client = Client()
        # Create a test user for authenticated API tests
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        self.token = Token.objects.create(user=self.user)

    def test_spa_view_serves_index_html_for_root(self):
        """Test that the root URL serves the SPA index.html."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '<div id="root"></div>')
        self.assertContains(response, 'Chalés Jasmim')

    def test_spa_view_serves_index_html_for_arbitrary_paths(self):
        """Test that arbitrary paths serve the SPA index.html for client-side routing."""
        paths = [
            '/dashboard',
            '/reservations',
            '/clients',
            '/settings',
            '/some/nested/path',
        ]
        for path in paths:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, f"Failed for path: {path}")
            self.assertContains(response, '<div id="root"></div>', msg_prefix=f"Failed for path: {path}")

    def test_spa_view_has_csrf_cookie(self):
        """Test that the SPA view includes CSRF cookie."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        # Check that CSRF cookie is set
        self.assertIn('csrftoken', response.cookies)

    def test_admin_route_not_blocked(self):
        """Test that admin routes are not caught by the SPA view."""
        response = self.client.get('/admin/')
        # Should redirect to login (302) or show admin page (200), not serve SPA
        self.assertIn(response.status_code, [200, 302])
        # Should not contain the SPA root div
        self.assertNotContains(response, '<div id="root"></div>', status_code=response.status_code)

    def test_api_routes_not_blocked(self):
        """Test that API routes are not caught by the SPA view."""
        # Test API route without authentication (should return 401 or 403)
        response = self.client.get('/api/clients/')
        self.assertIn(response.status_code, [401, 403])
        # Should not contain the SPA HTML
        self.assertNotIn('<div id="root"></div>', response.content.decode())

    def test_api_login_not_blocked(self):
        """Test that API login endpoint is not caught by the SPA view."""
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        # Should return JSON, not HTML
        self.assertEqual(response['content-type'], 'application/json')
        self.assertIn('token', response.json())

    def test_authenticated_api_access(self):
        """Test that authenticated API access works correctly."""
        response = self.client.get(
            '/api/clients/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}'
        )
        self.assertEqual(response.status_code, 200)
        # Should return JSON, not HTML
        self.assertEqual(response['content-type'], 'application/json')
        self.assertNotIn('<div id="root"></div>', response.content.decode())
