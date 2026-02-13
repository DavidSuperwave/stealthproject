# LipDub API Reference
## Working Endpoints for Jaime AI Integration

**Base URL:** `https://api.lipdub.ai/v1`  
**Authentication:** `x-api-key: {your_api_key}`
**API Key:** Set via `LIPDUB_API_KEY` environment variable

---

## ✅ WORKING ENDPOINTS (Read-Only)

### 1. GET /shots
List all video shots (clips) in your account.

**Request:**
```bash
curl -X GET "https://api.lipdub.ai/v1/shots" \
  -H "x-api-key: $LIPDUB_API_KEY"
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

### 2. GET /projects
List all projects in your account.

**Request:**
```bash
curl -X GET "https://api.lipdub.ai/v1/projects" \
  -H "x-api-key: $LIPDUB_API_KEY"
```

**Response:**
```json
{
  "data": [
    {
      "project_id": 18770,
      "project_name": "Jaime Ramos",
      "user_email": "info@sinergialabs.biz",
      "created_at": "2025-04-09T16:34:44Z",
      "project_identity_type": "single_identity",
      "source_language": {
        "language_id": 1,
        "name": "Afar",
        "supported": true
      }
    }
  ],
  "count": 32
}
```

---

## ❌ UNAVAILABLE ENDPOINTS (404)

These endpoints returned 404 errors with current API key:

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/voices` | GET | List available voices | ❌ 404 |
| `/account` | GET | Account info & credits | ❌ 404 |
| `/credits` | GET | Credit balance | ❌ 404 |
| `/languages` | GET | Supported languages | ❌ 404 |
| `/scenes` | GET | List scenes | ❌ 404 |
| `/identities` | GET | Voice clones/identities | ❌ 404 |
| `/exports` | GET | Export/download links | ❌ 404 |
| `/upload` | POST | Upload video/audio | ❌ 404 |
| `/status` | GET | Check processing status | ❌ 404 |
| `/clones` | POST | Create voice clone | ❌ 404 |

**Note:** These require different authentication or a higher-tier plan.

---

## 🎯 RECOMMENDED WORKFLOW (UI-Based)

Since API is read-only, implement this flow using the **LipDub web interface** + **status polling**:

### Phase 1: Create Project
1. **User uploads video** via web UI
2. **System shows confirmation dialog** (30+ sec speaking requirement)
3. **Video preview** displays (filename, duration, size)
4. **User selects dubbing option:**
   - Translate (auto-translate + lip-sync)
   - Upload Audio (custom audio file)
   - Replace Dialogue (new script)
   - Upload SRT (subtitle file)

### Phase 2: Voice Cloning (if Upload Audio selected)
1. **Upload audio file** for voice cloning
2. **System processes** the clone
3. **Status polling** for completion
4. **Clone ready** for use in projects

### Phase 3: Generation & Status
1. **User confirms** generation
2. **System queues** the job
3. **Status API** (when available) tracks progress:
   - `queued` → `processing` → `completed`/`failed`
4. **Download** the final video

---

## 📊 YOUR ACCOUNT DATA

**Current Stats:**
- **32 Projects**
- **27 Shots** (video clips)
- **2 Users:**
  - `info@sinergialabs.biz`
  - `jaime@ailegalgrowth.com`

**Project Types:**
- `single_identity` — One speaker
- `multi_identity` — Multiple speakers
- `personalization` — Dynamic variable insertion

---

## 🔧 INTEGRATION APPROACH

### Option 1: UI-Embedded (Recommended)
Embed LipDub web UI in iframe or redirect users:
```typescript
const openLipDubProject = (projectId: number) => {
  window.open(`https://app.lipdub.ai/projects/${projectId}`, '_blank');
};
```

### Option 2: Webhook Polling
1. User creates project in LipDub UI
2. Your backend polls `/projects` endpoint
3. Detect new projects and sync to your DB
4. Track status changes via polling

### Option 3: Manual Export
1. User generates video in LipDub
2. Downloads MP4 manually
3. Uploads to your platform
4. You process/store the final video

---

## 📞 SUPPORT

**LipDub Support:** info@lipdub.ai  
**API Documentation:** https://lipdub.readme.io/

---

*Last Updated: 2026-02-13*
