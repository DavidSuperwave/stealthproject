# LipDub API Documentation

**Base URL:** `https://api.lipdub.ai/v1`
**Authentication:** `x-api-key` header

---

## 📹 Video Endpoints

### POST /v1/video
Initiate a new video upload.

**Request Body:**
```json
{
  "file_name": "string",
  "content_type": "video/mp4",
  "project_name": "string",
  "scene_name": "string",
  "actor_name": "string"
}
```

**Response:**
```json
{
  "data": {
    "project_id": 12345,
    "scene_id": 67890,
    "actor_id": 11111,
    "video_id": "uuid-string",
    "upload_url": "https://storage.googleapis.com/...",
    "success_url": "/v1/video/success/{video_id}",
    "failure_url": "/v1/video/failure/{video_id}"
  }
}
```

**Flow:**
1. Call `POST /v1/video` to get upload URL
2. Upload file to `upload_url` (PUT request)
3. Call `POST success_url` to notify completion
4. Poll `GET /v1/video/status/{video_id}` for processing status

---

### GET /v1/video/status/{video_id}
Check video upload and processing status.

**Response:**
```json
{
  "data": {
    "shot_id": 746176,
    "upload_status": "completed",
    "shot_status": "finished",
    "ai_training_status": "finished"
  }
}
```

**Status Values:**
- `upload_status`: `uploading` | `completed` | `failed`
- `shot_status`: `running` | `finished` | `failed` | `not_started`
- `ai_training_status`: `not_started` | `processing` | `finished` | `failed`

---

### POST /v1/video/success/{video_id}
Notify LipDub that video upload completed successfully.

**Response:**
```json
{
  "data": {
    "shot_id": 746176,
    "asset_type": "dubbing-video"
  }
}
```

---

### POST /v1/video/failure/{video_id}
Notify LipDub that video upload failed.

---

## 🎵 Audio Endpoints

### POST /v1/audio
Initiate a new audio upload.

**Request Body:**
```json
{
  "file_name": "audio.MP3",
  "content_type": "audio/mpeg",
  "size_bytes": 1010257
}
```

**Response:**
```json
{
  "data": {
    "audio_id": "cc2c8712-da4c-4401-ad5d-dd1c83af210c",
    "upload_url": "https://storage.googleapis.com/...",
    "success_url": "/v1/audio/success/{audio_id}",
    "failure_url": "/v1/audio/failure/{audio_id}"
  }
}
```

---

### GET /v1/audio/status/{audio_id}
Check audio upload status.

**Response:**
```json
{
  "data": {
    "audio_id": "cc2c8712-da4c-4401-ad5d-dd1c83af210c",
    "upload_status": "completed"
  }
}
```

---

### POST /v1/audio/success/{audio_id}
Notify LipDub that audio upload completed.

**Response:** Empty object `{}`

---

### GET /v1/audio
List all uploaded audio files.

**Response:**
```json
{
  "data": [
    {
      "audio_id": "string",
      "upload_status": "completed",
      "content_type": "audio/mpeg",
      "file_name": "audio.MP3",
      "created_at": "2026-02-17T02:20:42Z"
    }
  ],
  "count": 1
}
```

---

## 🎯 Shot Endpoints

### GET /v1/shots
List all available shots.

**Response:**
```json
{
  "data": [
    {
      "shot_id": 746176,
      "shot_label": "string",
      "shot_project_id": 12345,
      "shot_scene_id": 67890,
      "shot_project_name": "string",
      "shot_scene_name": "string"
    }
  ],
  "count": 1
}
```

---

### GET /v1/shots/{shot_id}/status
Check shot processing and AI training status.

**Response:**
```json
{
  "data": {
    "shot_status": "running",
    "ai_training_status": "not_started"
  }
}
```

**Status Values:**
- `shot_status`: `running` | `finished` | `failed` | `not_started`
- `ai_training_status`: `not_started` | `processing` | `finished` | `failed`

**Important:** AI training only starts AFTER shot processing completes. Poll until both are `finished`.

---

## 🎬 Generation Endpoints

### POST /v1/shots/{shot_id}/generate
Generate a lip-synced video from a shot and audio.

**Request Body:**
```json
{
  "audio_id": "cc2c8712-da4c-4401-ad5d-dd1c83af210c",
  "output_filename": "generated_1234567890.mp4",
  "language": "es-MX",
  "maintain_expression": true
}
```

**Response:**
```json
{
  "data": {
    "generate_id": "string",
    "status": "processing"
  }
}
```

**Note:** The `generate_id` may be returned as `generate_id`, `generateId`, or `id` in the response.

---

### GET /v1/shots/{shot_id}/generate/{generate_id}
Check generation status.

**Response:**
```json
{
  "data": {
    "status": "running",
    "generate_id": 456
  }
}
```

**Status Values:**
- `not_started` - Job queued but not started
- `pending` - Job pending
- `running` - Generation in progress
- `finished` - Generation complete ✅
- `failed` - Generation failed ❌

---

### GET /v1/shots/{shot_id}/generate/{generate_id}/download
Get download URL for generated video.

**Response:**
```json
{
  "data": {
    "download_url": "https://storage.googleapis.com/..."
  }
}
```

**Note:** Only available when generation status is `finished`.

---

## 🔐 Authentication

All endpoints require the `x-api-key` header:

```
x-api-key: your-lipdub-api-key
```

---

## 📋 Complete Workflow

### Single Video Generation Flow:

1. **Upload Video**
   ```
   POST /v1/video → get upload_url
   PUT {upload_url} → upload file
   POST /v1/video/success/{video_id}
   ```

2. **Upload Audio**
   ```
   POST /v1/audio → get upload_url
   PUT {upload_url} → upload file
   POST /v1/audio/success/{audio_id}
   ```

3. **Wait for Shot Ready**
   ```
   GET /v1/video/status/{video_id} → check shot_id
   GET /v1/shots/{shot_id}/status → poll until finished
   ```

4. **Generate Video**
   ```
   POST /v1/shots/{shot_id}/generate → get generate_id
   GET /v1/shots/{shot_id}/generate/{generate_id} → poll until finished
   ```

5. **Download**
   ```
   GET /v1/shots/{shot_id}/generate/{generate_id}/download → get download_url
   ```

---

## ⚠️ Common Issues

1. **Shot status shows `running` for a long time**
   - Normal processing time: 5-30 minutes depending on video length
   - AI training starts only after shot processing completes

2. **CORS errors on upload**
   - Upload to GCS signed URLs must go through a proxy from browser
   - Use `/api/proxy-upload` pattern

3. **Missing `generate_id` in response**
   - LipDub may return it as `generateId` or `id` instead of `generate_id`
   - Check all three possible field names

4. **Generation stuck at `not_started`**
   - Check that audio status is `completed` before generating
   - Verify shot has `finished` status for both `shot_status` and `ai_training_status`

---

## 📝 Status Reference

### Video/Shot Status Values
| Value | Meaning |
|-------|---------|
| `not_started` | Not yet processed |
| `running` | Currently processing |
| `finished` | Complete ✅ |
| `failed` | Error occurred ❌ |

### Generation Status Values
| Value | Meaning |
|-------|---------|
| `not_started` | Queued, waiting to start |
| `pending` | Pending resources |
| `running` | Actively generating |
| `finished` | Complete ✅ |
| `failed` | Error occurred ❌ |

---

**Compiled from:** LipDub ReadMe.io reference + code analysis
**Last Updated:** 2026-02-17
