# Image Upload Feature - Implementation Guide

## Overview

This implementation replaces URL-based image storage with proper file uploads for accommodation units. Images are now stored locally in the `backend/media/` directory.

## What Changed

### Before
- Accommodation units used `album_photos` field (JSONField) to store image URLs
- Users had to manually enter image URLs in a textarea
- Images were hosted externally (e.g., Cloudinary)

### After
- New `UnitImage` model stores uploaded images with proper file management
- Users can upload images directly via drag-and-drop interface
- Images are stored locally in `backend/media/unit_images/`
- Each image has:
  - Image file
  - Order (for display sequence)
  - Caption (optional description)
- Backward compatible: `album_photos` URLs still work

## Key Features

### Backend

1. **UnitImage Model** (`backend/accommodations/models.py`)
   - Stores image files with automatic path generation
   - Supports ordering and captions
   - Related to AccommodationUnit via ForeignKey

2. **API Endpoints** (`/api/unit-images/`)
   - `GET /api/unit-images/?accommodation_unit=<id>` - List images for a unit
   - `POST /api/unit-images/bulk_upload/` - Upload multiple images at once
   - `PATCH /api/unit-images/<id>/` - Update caption or order
   - `DELETE /api/unit-images/<id>/` - Delete an image
   - `POST /api/unit-images/reorder/` - Reorder images

3. **Settings Changes** (`backend/config/settings.py`)
   - Switched from Cloudinary to local file storage
   - `MEDIA_ROOT = BASE_DIR / 'media'`
   - `MEDIA_URL = '/media/'`

### Frontend

1. **ImageUploadManager Component**
   - Drag-and-drop file upload interface
   - Image preview grid with actions
   - Reorder images with up/down buttons
   - Delete images with confirmation

2. **ImageManagementModal Component**
   - Dedicated modal for managing unit images
   - Accessible via purple "Images" icon button in accommodation list

3. **Backward Compatibility**
   - `InquiryModal` component checks for both `images` and `album_photos`
   - Prefers uploaded images, falls back to URLs
   - Helper function `getUnitPhotos()` handles the logic

## How to Use

### For Users

1. **Navigate to Accommodations Page**
2. **Click the purple Images icon** next to any accommodation unit
3. **Upload Images:**
   - Click "Select Images" or drag files into the upload area
   - Multiple images can be uploaded at once
   - Supported formats: JPEG, PNG, GIF, WebP
4. **Manage Images:**
   - Reorder: Use up/down arrows on each image
   - Delete: Click red trash icon
   - Order is shown with blue badge (1, 2, 3...)

### For Developers

#### Upload Images via API

```python
import requests

# Prepare files
files = [
    ('images', open('photo1.jpg', 'rb')),
    ('images', open('photo2.jpg', 'rb')),
]

# Upload
response = requests.post(
    'http://localhost:8000/api/unit-images/bulk_upload/',
    files=files,
    data={'accommodation_unit': 1},
    headers={'Authorization': f'Token {your_token}'}
)

print(response.json())
# Output: {"created": 2, "images": [...]}
```

#### Reorder Images

```python
import requests

response = requests.post(
    'http://localhost:8000/api/unit-images/reorder/',
    json={'image_ids': [3, 1, 2]},
    headers={'Authorization': f'Token {your_token}'}
)

print(response.json())
# Output: {"updated": 3, "message": "..."}
```

## File Storage

Images are stored in:
```
backend/
  media/
    unit_images/
      <unit_id>/
        <timestamp>_<filename>.jpg
```

Example:
```
backend/media/unit_images/1/1704747894123_beach-view.jpg
```

## Migration Notes

- Migration `0009_unitimage.py` creates the UnitImage table
- Existing `album_photos` data is preserved for backward compatibility
- No data migration needed - units can have both URLs and uploaded images

## Environment Variables

For production, you may want to use cloud storage. To enable Cloudinary:

1. Uncomment Cloudinary settings in `backend/config/settings.py`
2. Set environment variables:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

## Testing

Run tests:
```bash
cd backend
python manage.py test accommodations
```

All 26 tests should pass:
- 17 accommodation unit tests
- 3 unit image tests
- 6 date price/package tests

## Security

- CodeQL scan: 0 vulnerabilities
- File uploads are validated by Django
- Image files are served through Django's static file handler in development
- For production, configure proper media file serving (nginx, CDN, etc.)
