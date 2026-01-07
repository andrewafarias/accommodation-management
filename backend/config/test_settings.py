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
        
        self.assertEqual(len(dirs), 1, "TEMPLATES DIRS should contain exactly one directory")
        
        frontend_dist_path = dirs[0]
        self.assertIsInstance(frontend_dist_path, Path, "DIRS path should be a Path object")
        
        # Check that the path ends with frontend/dist
        self.assertTrue(
            str(frontend_dist_path).endswith('frontend/dist') or 
            str(frontend_dist_path).endswith('frontend\\dist'),
            f"DIRS path should point to frontend/dist, got: {frontend_dist_path}"
        )
    
    def test_staticfiles_dirs_includes_frontend_dist(self):
        """Test that STATICFILES_DIRS includes the frontend dist directory."""
        staticfiles_dirs = settings.STATICFILES_DIRS
        
        self.assertEqual(len(staticfiles_dirs), 1, "STATICFILES_DIRS should contain exactly one directory")
        
        frontend_dist_path = staticfiles_dirs[0]
        self.assertIsInstance(frontend_dist_path, Path, "STATICFILES_DIRS path should be a Path object")
        
        # Check that the path ends with frontend/dist
        self.assertTrue(
            str(frontend_dist_path).endswith('frontend/dist') or 
            str(frontend_dist_path).endswith('frontend\\dist'),
            f"STATICFILES_DIRS path should point to frontend/dist, got: {frontend_dist_path}"
        )
    
    def test_templates_and_staticfiles_point_to_same_location(self):
        """Test that both TEMPLATES and STATICFILES_DIRS point to the same frontend dist location."""
        templates_path = settings.TEMPLATES[0]['DIRS'][0]
        staticfiles_path = settings.STATICFILES_DIRS[0]
        
        self.assertEqual(
            templates_path, 
            staticfiles_path,
            "TEMPLATES DIRS and STATICFILES_DIRS should point to the same frontend/dist location"
        )
    
    def test_cors_settings_for_development(self):
        """Test that CORS settings include development origins."""
        cors_origins = settings.CORS_ALLOWED_ORIGINS
        
        # Should include localhost ports for development
        self.assertIn("http://localhost:5173", cors_origins, "Should include Vite dev server port")
        self.assertIn("http://localhost:5174", cors_origins, "Should include alternative Vite port")
        self.assertIn("http://localhost:3000", cors_origins, "Should include React dev server port")
