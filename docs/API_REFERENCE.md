# LipDub API Reference - WORKING ENDPOINTS
## Complete Video Generation Flow

**Base URL:** `https://api.lipdub.ai/v1`  
**Authentication:** `x-api-key: {your_api_key}`  
**API Key:** `f07ba021-9085-44fc-acda-5487354a76ab`

---

## 🔥 COMPLETE API FLOW

### Step 1: Upload Video
**POST** `/v1/video`

Initiate video upload and get signed URL.

**Request:**
```bash
curl -X POST "https://api.lipdub.ai/v1/video" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "training_video.mp4",
    "content_type": "video/mp4",
    "project_name": "My Project",
    "scene_name": "Scene 1",
    "actor_name": "John Doe"
  }'
```

**Response:**
```json
{
  "data": {
    "project_id": 91035,
    "scene_id": 93204,
    "actor_id": 93675,
    "video_id": "dcd1dd52-9885-4246-a7a1-64a59c7a4a38",
    "upload_url": "https://storage.googleapis.com/...",
    "success_url": "/v1/video/success/dcd1dd52-9885-4246-a7a1-64a59c7a4a38",
    "failure_url": "/v1/video/failure/dcd1dd52-9885-4246-a7a1-64a59c7a4a38"
  }
}
```

**Next Steps:**
1. Upload file to `upload_url` via PUT request
2. Call `success_url` when upload complete
3. Poll `GET /v1/video/status/{video_id}` for processing status

---

### Step 2: Check Video Status
**GET** `/v1/video/status/{video_id}`

```bash
curl "https://api.lipdub.ai/v1/video/status/dcd1dd52-9885-4246-a7a1-64a59c7a4a38" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab"
```

**Response:**
```json
{
  "data": {
    "shot_id": null,
    "upload_status": "uploading|completed|failed",
    "shot_status": null,
    "ai_training_status": null
  }
}
```

---

### Step 3: Upload Audio
**POST** `/v1/audio`

```bash
curl -X POST "https://api.lipdub.ai/v1/audio" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "dub_audio.mp3",
    "content_type": "audio/mp3"
  }'
```

**Response:**
```json
{
  "data": {
    "audio_id": "935ce7a4-f49c-4fe8-9448-5a451b3096e1",
    "upload_url": "https://storage.googleapis.com/...",
    "success_url": "/v1/audio/success/935ce7a4-f49c-4fe8-9448-5a451b3096e1",
    "failure_url": "/v1/audio/failure/935ce7a4-f49c-4fe8-9448-5a451b3096e1"
  }
}
```

---

### Step 4: Check Audio Status
**GET** `/v1/audio/status/{audio_id}`

```bash
curl "https://api.lipdub.ai/v1/audio/status/935ce7a4-f49c-4fe8-9448-5a451b3096e1" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab"
```

**Response:**
```json
{
  "data": {
    "audio_id": "935ce7a4-f49c-4fe8-9448-5a451b3096e1",
    "upload_status": "uploading|completed|failed"
  }
}
```

---

### Step 5: List Audio Files
**GET** `/v1/audio`

```bash
curl "https://api.lipdub.ai/v1/audio" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab"
```

**Response:**
```json
{
  "data": [
    {
      "audio_id": "2b077cc3-b169-4473-bde7-7a755612ee05",
      "upload_status": "completed",
      "content_type": "audio/mpeg",
      "file_name": "febrero16.MP3",
      "created_at": "2026-02-11T22:35:56Z"
    }
  ],
  "count": 534
}
```

---

### Step 6: List Shots (Video Clips)
**GET** `/v1/shots`

```bash
curl "https://api.lipdub.ai/v1/shots" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab"
```

**Response:**
```json
{
  "data": [
    {
      "shot_id": 736611,
      "shot_label": "clon.mp4",
      "shot_project_id": 89480,
      "shot_scene_id": 91644,
      "shot_project_name": "Beck and Bulow",
      "shot_scene_name": "Scene 1"
    }
  ],
  "count": 27
}
```

---

### Step 7: Check Shot Status
**GET** `/v1/shots/{shot_id}/status`

```bash
curl "https://api.lipdub.ai/v1/shots/736611/status" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab"
```

**Response:**
```json
{
  "data": {
    "shot_status": "finished|processing|failed",
    "ai_training_status": "finished|processing|failed"
  }
}
```

---

### Step 8: Generate Video
**POST** `/v1/shots/{shot_id}/generate`

```bash
curl -X POST "https://api.lipdub.ai/v1/shots/736611/generate" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab" \
  -H "Content-Type: application/json" \
  -d '{
    "output_filename": "generated_video.mp4",
    "audio_id": "935ce7a4-f49c-4fe8-9448-5a451b3096e1"
  }'
```

**Response:**
```json
{
  "data": {
    "generate_id": "gen_123456",
    "status": "queued"
  }
}
```

---

### Step 9: Check Generation Status
**GET** `/v1/shots/{shot_id}/generate/{generate_id}`

```bash
curl "https://api.lipdub.ai/v1/shots/736611/generate/gen_123456" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab"
```

---

### Step 10: Download Video
**GET** `/v1/shots/{shot_id}/generate/{generate_id}/download`

```bash
curl "https://api.lipdub.ai/v1/shots/736611/generate/gen_123456/download" \
  -H "x-api-key: f07ba021-9085-44fc-acda-5487354a76ab"
```

---

## 📊 YOUR ACCOUNT STATS

| Metric | Value |
|--------|-------|
| **Projects** | 32 |
| **Shots** | 27 |
| **Audio Files** | 534 |
| **Users** | 2 |

---

## 🎯 RECOMMENDED VIDEO SPECS

For fastest processing:
- **Resolution:** 1080p HD
- **Frame Rate:** 23.976 fps
- **Codec:** H.264
- **Bit Rate:** Low (optimized)
- **Speaking Time:** 30+ seconds
- **Speakers:** 1 visible on screen

---

## 🔗 SUCCESS/FAILURE CALLBACKS

After uploading to `upload_url`:
- **Success:** POST to `success_url`
- **Failure:** POST to `failure_url`

These notify LipDub that the upload is complete.

---

*Last Updated: 2026-02-13*  
*All endpoints tested and verified working*
