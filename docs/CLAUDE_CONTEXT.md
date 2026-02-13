# JAIME AI - CLAUDE API CONTEXT

## Quick Reference for AI Integration

### Base URL
```
https://api.lipdub.ai/v1
```

### Authentication Header
```
x-api-key: ${LIPDUB_API_KEY}
```
Set `LIPDUB_API_KEY` in your `.env.local` file.

---

## WORKING ENDPOINTS (2)

### 1. GET /shots
Returns: List of video clips
```json
{
  "data": [{
    "shot_id": 736611,
    "shot_label": "clon.mp4",
    "shot_project_id": 89480,
    "shot_project_name": "Beck and Bulow"
  }],
  "count": 27
}
```

### 2. GET /projects  
Returns: List of projects
```json
{
  "data": [{
    "project_id": 18770,
    "project_name": "Jaime Ramos",
    "user_email": "info@sinergialabs.biz",
    "created_at": "2025-04-09T16:34:44Z",
    "project_identity_type": "single_identity"
  }],
  "count": 32
}
```

---

## ACCOUNT STATS
- 32 Projects
- 27 Shots
- 2 User emails associated

---

## UNAVAILABLE ENDPOINTS (404)
POST /projects, /voices, /account, /credits, /languages, /scenes, /exports

**Note:** API is read-only. No creation or generation endpoints available.

---

## FRONTEND URL
http://localhost:3000 (Next.js dev server running)

---

*Use this context when helping with Jaime AI development*
