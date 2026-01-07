"""
Custom storage backends for static files.
"""

from django.contrib.staticfiles.storage import ManifestStaticFilesStorage


class NonStrictManifestStaticFilesStorage(ManifestStaticFilesStorage):
    """
    Custom storage backend that gracefully handles missing files during post-processing.
    
    This prevents collectstatic from failing when CSS files reference other files
    that have already been hashed or don't exist. This is particularly useful for
    Django admin CSS files that reference each other (e.g., forms.css referencing widgets.css).
    
    The storage class sets manifest_strict to False and overrides hashed_name() to catch
    ValueError exceptions when files cannot be found, returning the original filename
    instead of raising an error.
    """
    
    manifest_strict = False
    
    def hashed_name(self, name, content=None, filename=None):
        """
        Override to prevent failures when files don't exist.
        
        Catches ValueError exceptions when files can't be found and returns the original
        name if manifest_strict is False. This allows collectstatic to complete successfully
        even when CSS files reference other files that don't exist at their unhashed paths.
        
        Args:
            name: The base name to construct the new hashed filename from
            content: Optional file content (if None, file will be opened from storage)
            filename: Optional filename to hash (if None, uses name)
            
        Returns:
            The hashed filename if successful, or the original name if the file doesn't exist
            and manifest_strict is False
            
        Raises:
            ValueError: If file cannot be found and manifest_strict is True
        """
        try:
            return super().hashed_name(name, content, filename)
        except ValueError as e:
            # Check if this is a "file not found" error
            # We check for specific indicators in the exception rather than just catching all
            error_message = str(e)
            if "could not be found" in error_message.lower():
                if not self.manifest_strict:
                    # Return the original name instead of failing
                    return name
            # Re-raise if it's a different ValueError or if manifest_strict is True
            raise
