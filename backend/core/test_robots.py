"""
Tests for robots.txt and search engine indexing prevention.
"""
from django.test import TestCase, Client, override_settings
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
import os


class RobotsTxtTestCase(TestCase):
    """Test cases for robots.txt and search engine indexing prevention."""

    def setUp(self):
        """Set up test client."""
        self.client = Client()

    def test_robots_txt_endpoint(self):
        """Test that /robots.txt endpoint returns correct content."""
        response = self.client.get('/robots.txt')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['content-type'], 'text/plain')
        content = response.content.decode()
        self.assertIn('User-agent: *', content)
        self.assertIn('Disallow: /', content)

    def test_x_robots_tag_header(self):
        """Test that X-Robots-Tag header is set on responses."""
        # Test on robots.txt endpoint (doesn't require frontend build)
        response = self.client.get('/robots.txt')
        self.assertEqual(response.status_code, 200)
        self.assertIn('X-Robots-Tag', response)
        self.assertEqual(response['X-Robots-Tag'], 'noindex, nofollow')

    def test_x_robots_tag_on_api_endpoints(self):
        """Test that X-Robots-Tag header is also set on API endpoints."""
        response = self.client.get('/api/clients/')
        # The endpoint will return 401/403 but should still have the header
        self.assertIn('X-Robots-Tag', response)
        self.assertEqual(response['X-Robots-Tag'], 'noindex, nofollow')

    def test_robots_txt_content(self):
        """Test that robots.txt contains the correct directives."""
        response = self.client.get('/robots.txt')
        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        # Check for standard disallow all directive
        self.assertIn('User-agent: *', content)
        self.assertIn('Disallow: /', content)
        # Ensure there are no Allow directives that would override the Disallow
        self.assertNotIn('Allow:', content)
