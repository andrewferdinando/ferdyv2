# Content Library System

## Overview

The Content Library system provides a complete asset management workflow for the Ferdy application. Users can upload images and videos, tag them, and organize them into "Ready to Use" and "Needs Attention" categories.

## Workflow

### 1. Upload Flow
- User clicks "Upload Content" button
- File is validated (type and size limits)
- Asset ID is generated using `crypto.randomUUID()`
- File is uploaded to Supabase Storage at path: `brands/{brandId}/originals/{assetId}.{ext}`
- Asset record is created in the `assets` table with:
  - `id`: Generated UUID
  - `brand_id`: Current brand ID
  - `title`: Original filename
  - `storage_path`: Storage path
  - `aspect_ratio`: 'original'
  - `tags`: Empty array
  - `width`/`height`: Image dimensions (if available)

### 2. Asset States
- **Needs Attention**: Assets with no tags (`tags.length === 0`)
- **Ready to Use**: Assets with at least one tag (`tags.length > 0`)

### 3. Asset Management
- **Edit**: Update title, tags, aspect ratio, and crop windows
- **Delete**: Remove from both storage and database
- **View**: Display with signed URLs for secure access

## Technical Implementation

### Storage
- **Bucket**: `ferdy-assets` (private)
- **Path Convention**: `brands/{brandId}/originals/{assetId}.{ext}`
- **Signed URLs**: 10-minute expiration with session caching

### Database Schema
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id),
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT 'original',
  tags TEXT[] DEFAULT '{}',
  crop_windows JSONB,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Components
- `UploadAsset`: Handles file upload with drag & drop
- `AssetCard`: Displays individual asset with actions
- `EditAssetModal`: Modal for editing asset properties
- `AssetDetailView`: Detailed view for tagging workflow

### Hooks
- `useAssets`: Fetch and manage assets list
- `useUploadAsset`: Handle file upload process
- `useUpdateAsset`: Update asset properties
- `useDeleteAsset`: Delete assets from storage and database

## Security

- All operations are scoped to the current `brandId`
- Private storage bucket with signed URLs
- User authentication required for all operations
- File type and size validation

## File Support

### Images
- JPEG, PNG, GIF, WebP
- Automatic dimension detection
- Aspect ratio selection (original, 1:1, 4:5, 1.91:1)

### Videos
- MP4, MOV, AVI
- Thumbnail generation (future enhancement)

## Future Enhancements

### TODO: Crop UI
- Visual crop editor for different aspect ratios
- Real-time preview of crop windows
- Batch crop operations

### TODO: Asset Variants
- Generate multiple sizes/formats
- Automatic optimization
- CDN integration

### TODO: Advanced Features
- Bulk operations
- Asset collections/folders
- Usage analytics
- AI-powered tagging

## Usage

1. Navigate to `/brands/{brandId}/content-library`
2. Click "Upload Content" to add new assets
3. Assets appear in "Needs Attention" tab
4. Click on an asset to tag and configure it
5. Tagged assets move to "Ready to Use" tab
6. Use search to find specific assets
7. Edit or delete assets as needed

## Error Handling

- File validation errors are shown to user
- Network errors trigger retry mechanisms
- Storage errors are logged and handled gracefully
- Database errors rollback storage operations
