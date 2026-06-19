# Active Platform Workflows

This inventory marks the current production readiness of the Doble Labs app after the platform foundation migration.

## Ready

- Auth: signup, login, Supabase callback, protected app routes.
- Admin basics: user list, credit grants, suspend/restore/delete actions.
- Credit balance: active subscription balance lookup and generation credit checks.

## Partial

- Onboarding: required creator/business intake is persisted on `profiles` and visible in admin.
- Billing: credit packages are database-backed and Stripe checkout is wired; production Stripe keys/webhooks still need real values.
- Video creation: project creation, video upload, audio upload, LipDub polling, credit deduction/refund, and download handoff are wired through `generation_jobs`.
- Notifications: generation cron can create completion/failure notifications when configured with `CRON_SECRET`.
- Script workflow: script chat and script-to-video handoff exist; long-term script persistence/brand memory needs hardening.
- Admin segmentation: onboarding fields are visible in the users table; deeper filtering/export is not built yet.

## Mock Or Local

- Dashboard video status test: uses `/api/generation/jobs` to create a mock `generation_jobs` row without calling LipDub.
- Video library: browser/local upload organization UI is present; generated/source asset persistence needs full storage integration.
- Campaign planning: screens exist, but campaign records and brand workflow need more end-to-end integration.
- Performance tracking: manual status/metric capture UI exists; imports, automated learning, and reporting are still partial.

## LipDub Production Checklist

- Use `POST /v1/video` to create upload metadata, then `PUT` the source file to `upload_url`.
- Call the video `success_url` after upload so LipDub can process/train and return or eventually expose `shot_id`.
- Use `POST /v1/audio`, upload audio to `upload_url`, then call the audio `success_url`.
- Wait for video, shot, AI training, and audio statuses before generation.
- Call `POST /v1/shots/{shot_id}/generate` with `audio_id` and `output_filename`.
- Poll `GET /v1/shots/{shot_id}/generate/{generate_id}` until `completed` or `finished`.
- Fetch `GET /v1/shots/{shot_id}/generate/{generate_id}/download` and only then mark the Doble Labs job completed.
