#!/usr/bin/env python
"""
Collects static files from STATICFILES_DIRS to STATIC_ROOT.
This is a workaround for issues with Django's collectstatic command.
"""
import os
import sys
import shutil
from pathlib import Path

# Logging configuration
LOG_FIRST_N_FILES = 10  # Log the first N files
LOG_EVERY_N_FILES = 50  # Then log every Nth file

# Add backend to Python path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib.staticfiles import finders
from django.conf import settings

def collect_static():
    """Collect static files from finders to STATIC_ROOT."""
    static_root = Path(settings.STATIC_ROOT)
    
    # Create STATIC_ROOT if it doesn't exist
    static_root.mkdir(parents=True, exist_ok=True)
    
    print(f"Collecting static files to {static_root}")
    
    count = 0
    skipped = 0
    for finder in finders.get_finders():
        for path, storage in finder.list([]):
            try:
                # Get source file path - some storage backends don't support path()
                try:
                    source = storage.path(path)
                except (NotImplementedError, AttributeError):
                    # Storage backend doesn't support local file paths (e.g., cloud storage)
                    print(f"  Skipped: {path} (storage backend doesn't support local paths)")
                    skipped += 1
                    continue
                
                # Check if source file exists before proceeding
                if not os.path.exists(source):
                    print(f"  Skipped: {path} (source file not found)")
                    skipped += 1
                    continue
                
                dest = static_root / path
                
                # Create parent directories
                dest.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy file if it doesn't exist or is newer
                # Wrap mtime checks in try-except to handle race conditions
                try:
                    should_copy = not dest.exists()
                    if not should_copy:
                        source_mtime = os.path.getmtime(source)
                        dest_mtime = os.path.getmtime(str(dest))
                        should_copy = source_mtime > dest_mtime
                    
                    if should_copy:
                        shutil.copy2(source, dest)
                        count += 1
                        if count <= LOG_FIRST_N_FILES or count % LOG_EVERY_N_FILES == 0:
                            print(f"  Copied: {path}")
                except (OSError, IOError) as e:
                    print(f"  Warning: Could not check/copy {path}: {e}")
                    skipped += 1
                    
            except Exception as e:
                print(f"  Error processing {path}: {e}")
                skipped += 1
    
    print(f"\n{count} static files collected to '{static_root}'.")
    if skipped > 0:
        print(f"{skipped} files skipped or had errors.")
    return count

if __name__ == '__main__':
    try:
        collect_static()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
