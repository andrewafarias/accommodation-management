from django.test import TestCase
from django.conf import settings
from pathlib import Path


class SettingsConfigurationTest(TestCase):
    """
    Test suite for Django settings configuration.
    """
    
    def test_templates_dirs_includes_frontend_dist(self):
        """Test that TEMPLATES DIRS includes the frontend dist directory."""
        templates_config = settings.TEMPLATES[0]
        dirs = templates_config['DIRS']
        
        self.assertEqual(len(dirs), 2, "TEMPLATES DIRS should contain exactly two directories")
        
        # Check that one of the paths is the templates directory
        templates_path = dirs[0]
        self.assertIsInstance(templates_path, Path, "Templates path should be a Path object")
        self.assertEqual(
            templates_path.parts[-1],
            'templates',
            f"First DIRS path should point to templates, got: {templates_path}"
        )
        
        # Check that the second path is the frontend dist directory
        frontend_dist_path = dirs[1]
        self.assertIsInstance(frontend_dist_path, Path, "Frontend dist path should be a Path object")
        self.assertEqual(
            frontend_dist_path.parts[-2:],
            ('frontend', 'dist'),
            f"Second DIRS path should point to frontend/dist, got: {frontend_dist_path}"
        )
    
    def test_staticfiles_dirs_includes_frontend_dist(self):
        """Test that STATICFILES_DIRS includes the frontend dist directory."""
        staticfiles_dirs = settings.STATICFILES_DIRS
        
        self.assertEqual(len(staticfiles_dirs), 1, "STATICFILES_DIRS should contain exactly one directory")
        
        frontend_dist_path = staticfiles_dirs[0]
        self.assertIsInstance(frontend_dist_path, Path, "STATICFILES_DIRS path should be a Path object")
        
        # Check that the path ends with frontend/dist (cross-platform)
        self.assertEqual(
            frontend_dist_path.parts[-2:],
            ('frontend', 'dist'),
            f"STATICFILES_DIRS path should point to frontend/dist, got: {frontend_dist_path}"
        )
    
    def test_templates_and_staticfiles_point_to_same_location(self):
        """Test that TEMPLATES frontend/dist and STATICFILES_DIRS point to the same location."""
        # Get the frontend/dist path from TEMPLATES (second directory)
        templates_frontend_path = settings.TEMPLATES[0]['DIRS'][1]
        staticfiles_path = settings.STATICFILES_DIRS[0]
        
        # Both should point to frontend/dist
        self.assertEqual(
            templates_frontend_path.parts[-2:],
            ('frontend', 'dist'),
            "TEMPLATES should include frontend/dist"
        )
        self.assertEqual(
            staticfiles_path.parts[-2:],
            ('frontend', 'dist'),
            "STATICFILES_DIRS should point to frontend/dist"
        )
    
    def test_cors_settings_for_development(self):
        """Test that CORS settings include development origins."""
        cors_origins = settings.CORS_ALLOWED_ORIGINS
        
        # Should include localhost ports for development
        self.assertIn("http://localhost:5173", cors_origins, "Should include Vite dev server port")
        self.assertIn("http://localhost:5174", cors_origins, "Should include alternative Vite port")
        self.assertIn("http://localhost:3000", cors_origins, "Should include React dev server port")
