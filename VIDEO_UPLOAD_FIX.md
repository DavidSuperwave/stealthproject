# Video Upload Fix - Supabase Storage

## Problem
Vercel serverless functions have a **4.5MB payload limit**. Video uploads larger than this fail with:
```
413 - Request Entity Too Large
FUNCTION_PAYLOAD_TOO_LARGE
```

## Solution
Upload videos directly to **Supabase Storage** from the browser, bypassing Vercel entirely. Then send the storage URL to LipDub API.

## Architecture

```
Before (Broken for >4.5MB):
Frontend → Vercel API (/api/proxy-upload) → GCS → LipDub
         ↑ 4.5MB limit here

After (Works up to 50MB):
Frontend → Supabase Storage (direct) → LipDub API
         (no Vercel limit)
```

## Setup

### 1. Run Database Migration

```bash
# Apply the storage bucket and policies
psql $DATABASE_URL -f supabase/migrations/20250217_storage_videos.sql

# Or use Supabase CLI
supabase db push
```

### 2. Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For server-side

LIPDUB_API_KEY=your-lipdub-key
LIPDUB_API_URL=https://api.lipdub.ai/v1
```

## Usage

### Using the Component

```tsx
import { VideoUpload } from "@/components/video-upload";

function MyPage() {
  return (
    <VideoUpload
      onUploadComplete={(videoUrl, videoId) => {
        console.log("Video uploaded:", videoUrl);
        console.log("LipDub ID:", videoId);
      }}
      onError={(error) => {
        console.error("Upload failed:", error);
      }}
    />
  );
}
```

### Using the Hook Directly

```tsx
import { useVideoUpload } from "@/hooks/use-video-upload";

function MyComponent() {
  const { upload, isUploading, progress, error } = useVideoUpload({
    onSuccess: (url, path) => console.log("Uploaded to:", url),
    onError: (err) => console.error("Failed:", err),
  });

  const handleFile = async (file: File) => {
    const result = await upload(file);
    if (result) {
      // result.url - Supabase public URL
      // result.path - Storage path
    }
  };
}
```

## API Reference

### POST /api/video-upload

Submit a video URL to LipDub for processing.

**Request:**
```json
{
  "videoUrl": "https://your-project.supabase.co/storage/v1/object/public/videos/userId/filename.mp4",
  "projectId": "optional-project-id",
  "options": {
    // LipDub-specific options
  }
}
```

**Response:**
```json
{
  "success": true,
  "videoId": "lipdub-video-id",
  "status": "processing",
  "url": "https://...",
  "lipdubResponse": { ... }
}
```

### GET /api/video-upload?videoId=xxx

Check video processing status.

## Limits

| Limit | Value |
|-------|-------|
| Max file size | 85MB |
| Allowed types | MP4, MOV, WebM, AVI |
| Storage | Public bucket with user isolation |

## Security

- Videos are stored in user-specific folders: `userId/filename`
- RLS policies ensure users can only access their own videos
- Public URLs are generated but contain random timestamps to prevent guessing

## Troubleshooting

### "User not authenticated"
Make sure the user is logged in before uploading.

### "Invalid file type"
Only MP4, MOV, WebM, and AVI are allowed.

### "File too large"
Compress the video or increase the limit in the migration file (currently 50MB).

## Migration from Old Upload

Replace old upload code:
```tsx
// OLD - Hits 4.5MB limit
const res = await fetch('/api/proxy-upload', {
  method: 'PUT',
  body: file, // Large file fails here
});
```

With new upload:
```tsx
// NEW - Bypasses Vercel limit
const { upload } = useVideoUpload();
const result = await upload(file); // Direct to Supabase
```
