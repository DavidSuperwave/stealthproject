/**
 * LipDub API Client
 * Routes all requests through /api/lipdub server-side proxy to avoid CORS
 * and keep the API key secure (never exposed to the browser).
 */

// Client-side proxy base — all requests go through our Next.js API route
const PROXY_BASE = '/api/lipdub';

// The external LipDub base URL, used only to strip absolute callback URLs
const LIPDUB_ORIGIN = 'https://api.lipdub.ai/v1';

// Types
export interface VideoUploadResponse {
  project_id: number;
  scene_id: number;
  actor_id: number;
  video_id: string;
  upload_url: string;
  success_url: string;
  failure_url: string;
}

export interface VideoStatus {
  shot_id: number | null;
  upload_status: 'uploading' | 'completed' | 'failed';
  shot_status: string | null;
  ai_training_status: string | null;
}

export interface AudioUploadResponse {
  audio_id: string;
  upload_url: string;
  success_url: string;
  failure_url: string;
}

export interface AudioStatus {
  audio_id: string;
  upload_status: 'uploading' | 'completed' | 'failed';
}

export interface AudioFile {
  audio_id: string;
  upload_status: string;
  content_type: string;
  file_name: string;
  created_at: string;
}

export interface Shot {
  shot_id: number;
  shot_label: string;
  shot_project_id: number;
  shot_scene_id: number;
  shot_project_name: string;
  shot_scene_name: string;
}

export interface ShotStatus {
  shot_status: 'pending' | 'running' | 'finished' | 'failed' | 'not_started';
  ai_training_status: 'not_started' | 'processing' | 'finished' | 'failed';
}

export interface GenerateResponse {
  generate_id: string;
  status: string;
}

// API Client
class LipDubAPI {
  private proxyBase: string;

  constructor(proxyBase: string = PROXY_BASE) {
    this.proxyBase = proxyBase;
  }

  /**
   * Convert a LipDub endpoint to a proxy URL with query parameter.
   * Handles three formats returned by the API:
   *   - Absolute URL: "https://api.lipdub.ai/v1/video/success/abc" → path=video/success/abc
   *   - Versioned path: "/v1/video/success/abc" → path=video/success/abc
   *   - Relative path: "/video" → path=video
   */
  private toProxyUrl(urlOrPath: string): string {
    let apiPath: string;
    
    if (urlOrPath.startsWith('http')) {
      // Full URL - extract pathname and strip /v1/
      const url = new URL(urlOrPath);
      apiPath = url.pathname.replace(/^\/v1\//, '');
    } else if (urlOrPath.startsWith('/v1/')) {
      // LipDub returns paths with /v1/ prefix - strip it
      apiPath = urlOrPath.slice(4); // Remove '/v1/'
    } else if (urlOrPath.startsWith('/')) {
      // Regular path without /v1
      apiPath = urlOrPath.slice(1);
    } else {
      // No leading slash
      apiPath = urlOrPath;
    }
    
    return `${this.proxyBase}?path=${encodeURIComponent(apiPath)}`;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = this.toProxyUrl(endpoint);
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`API Error ${res.status}: ${error}`);
    }

    // Some endpoints (success/failure callbacks) may return empty bodies
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  // Video Upload
  async initiateVideoUpload(params: {
    file_name: string;
    content_type: string;
    project_name: string;
    scene_name: string;
    actor_name: string;
  }): Promise<VideoUploadResponse> {
    const data = await this.request('/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return data.data ?? data;
  }

  /**
   * Upload file to signed URL - tries direct first (for large files), falls back to proxy
   * ⚠️ DEPRECATED: For files > 4.5MB, use uploadViaSupabase instead to avoid Vercel limits
   */
  async uploadFileToUrl(uploadUrl: string, file: File): Promise<void> {
    // For files > 3MB, try direct upload to avoid Vercel payload limits
    // Vercel Hobby = 4.5MB limit, Pro = 100MB limit
    // Direct upload works in production if GCS CORS is configured, fails in dev (localhost)
    const LARGE_FILE_THRESHOLD = 3 * 1024 * 1024; // 3MB - below Vercel Hobby limit
    const isLargeFile = file.size > LARGE_FILE_THRESHOLD;

    if (isLargeFile) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          console.log('[LipDub] Large file uploaded directly to GCS (bypassing proxy)');
          return;
        }
        // If direct upload fails with non-OK, fall through to proxy
        console.warn('[LipDub] Direct upload failed, falling back to proxy:', res.status);
      } catch (err) {
        // CORS error or network failure - fall through to proxy
        console.warn('[LipDub] Direct upload error (likely CORS), falling back to proxy:', err);
      }
    }

    // Proxy upload for smaller files or when direct fails
    const proxyUrl = `/api/proxy-upload?url=${encodeURIComponent(uploadUrl)}`;
    const res = await fetch(proxyUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(`Upload failed: ${res.status} — ${errorData}`);
    }
  }

  /**
   * Upload video via Supabase Storage (bypasses Vercel 4.5MB limit)
   * 
   * Flow:
   * 1. Create video in LipDub first (get video_id, success_url, failure_url, upload_url)
   * 2. Upload file directly to Supabase Storage from browser
   * 3. Server streams from Supabase to LipDub GCS URL (/api/video-transfer)
   * 4. Returns LipDub response
   * 
   * Use this for files > 4.5MB instead of uploadFileToUrl
   */
  async uploadViaSupabase(
    file: File,
    projectName: string,
    onProgress?: (percentage: number) => void
  ): Promise<VideoUploadResponse> {
    onProgress?.(5);
    
    // Step 1: Create video in LipDub first to get metadata
    const lipdubCreate = await this.initiateVideoUpload({
      file_name: file.name,
      content_type: file.type,
      project_name: projectName,
      scene_name: 'Scene 1',
      actor_name: 'Actor',
    });

    console.log('[LipDub] Created video:', lipdubCreate.video_id);
    onProgress?.(15);
    
    // Step 2: Upload directly to Supabase Storage (bypasses Vercel limit)
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${timestamp}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    console.log('[Supabase] Uploaded to:', publicUrl);
    onProgress?.(40);

    // Step 3: Server streams from Supabase to LipDub GCS
    console.log('[Transfer] Starting server-side transfer...');
    const transferRes = await fetch('/api/video-transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supabaseUrl: publicUrl,
        lipdubUploadUrl: lipdubCreate.upload_url,
        videoId: lipdubCreate.video_id,
        successUrl: lipdubCreate.success_url,
        failureUrl: lipdubCreate.failure_url,
      }),
    });

    if (!transferRes.ok) {
      const error = await transferRes.text();
      throw new Error(`Transfer failed: ${error}`);
    }

    const transferData = await transferRes.json();
    console.log('[Transfer] Complete:', transferData);
    onProgress?.(100);

    // Return the original LipDub response with Supabase URL for reference
    return {
      ...lipdubCreate,
      upload_url: publicUrl, // Keep Supabase URL for reference
    };
  }

  // Notify upload success (callback URL routed through proxy)
  // Returns the response which may contain shot_id for video callbacks
  async notifyUploadSuccess(successUrl: string): Promise<{ shot_id?: number; asset_type?: string; [key: string]: unknown }> {
    const data = await this.request(successUrl, { method: 'POST' });
    console.log('[LipDub] notifyUploadSuccess response:', JSON.stringify(data));
    return data?.data ?? data ?? {};
  }

  // Notify upload failure (callback URL routed through proxy)
  async notifyUploadFailure(failureUrl: string): Promise<void> {
    await this.request(failureUrl, { method: 'POST' });
  }

  // Get video status
  async getVideoStatus(videoId: string): Promise<VideoStatus> {
    const data = await this.request(`/video/status/${videoId}`);
    return data.data ?? data;
  }

  /**
   * Upload audio via Supabase Storage (bypasses Vercel 4.5MB limit)
   * 
   * Same flow as video upload:
   * 1. Create audio in LipDub first
   * 2. Upload to Supabase Storage
   * 3. Server streams to LipDub GCS
   */
  async uploadAudioViaSupabase(
    file: File,
    onProgress?: (percentage: number) => void
  ): Promise<AudioUploadResponse> {
    onProgress?.(5);

    // Normalize content type
    let contentType = file.type;
    if (contentType === 'audio/mp3') contentType = 'audio/mpeg';
    if (!contentType || !contentType.startsWith('audio/')) contentType = 'audio/mpeg';

    // Step 1: Create audio in LipDub
    const lipdubCreate = await this.initiateAudioUpload({
      file_name: file.name,
      content_type: contentType,
      size_bytes: file.size,
    });

    console.log('[LipDub] Created audio:', lipdubCreate.audio_id);
    onProgress?.(15);

    // Step 2: Upload to Supabase Storage
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/audio/${timestamp}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('videos') // Use same bucket or create 'audio' bucket
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    console.log('[Supabase] Audio uploaded to:', publicUrl);
    onProgress?.(40);

    // Step 3: Server streams from Supabase to LipDub GCS
    console.log('[Transfer] Starting audio transfer...');
    const transferRes = await fetch('/api/video-transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supabaseUrl: publicUrl,
        lipdubUploadUrl: lipdubCreate.upload_url,
        videoId: lipdubCreate.audio_id, // Using audio_id as videoId for compatibility
        successUrl: lipdubCreate.success_url,
        failureUrl: lipdubCreate.failure_url,
      }),
    });

    if (!transferRes.ok) {
      const error = await transferRes.text();
      throw new Error(`Transfer failed: ${error}`);
    }

    const transferData = await transferRes.json();
    console.log('[Transfer] Audio transfer complete:', transferData);
    onProgress?.(100);

    return lipdubCreate;
  }

  // Audio Upload
  async initiateAudioUpload(params: {
    file_name: string;
    content_type: string;
    size_bytes: number;
  }): Promise<AudioUploadResponse> {
    const data = await this.request('/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return data.data ?? data;
  }

  // Get audio status
  async getAudioStatus(audioId: string): Promise<AudioStatus> {
    const data = await this.request(`/audio/status/${audioId}`);
    return data.data ?? data;
  }

  // List all audio files
  async listAudio(): Promise<{ data: AudioFile[]; count: number }> {
    return this.request('/audio');
  }

  // List all shots
  async listShots(): Promise<{ data: Shot[]; count: number }> {
    return this.request('/shots');
  }

  // Get shot status
  async getShotStatus(shotId: number): Promise<ShotStatus> {
    const data = await this.request(`/shots/${shotId}/status`);
    return data.data ?? data;
  }

  // Generate video from shot — POST /v1/shots/{shot_id}/generate
  async generateVideo(shotId: number, params: {
    audio_id: string;
    output_filename: string;
    language?: string;
  }): Promise<GenerateResponse> {
    const data = await this.request(`/shots/${shotId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    console.log('[LipDub] generateVideo raw response:', JSON.stringify(data));
    // LipDub may return { generate_id } directly or nested under { data: { generate_id } }
    const result = data?.data ?? data ?? {};
    const genId = result.generate_id ?? result.generateId ?? result.id;
    if (genId == null) {
      console.error('[LipDub] Unexpected generate response — no generate_id found:', JSON.stringify(data));
      throw new Error('LipDub no devolvió un generate_id válido');
    }
    return { generate_id: String(genId), status: result.status ?? 'processing' };
  }

  // Get generation status (unwrap { data } wrapper)
  async getGenerationStatus(shotId: number, generateId: string): Promise<{ status: string; [key: string]: unknown }> {
    const data = await this.request(`/shots/${shotId}/generate/${generateId}`);
    console.log('[LipDub] getGenerationStatus raw response:', JSON.stringify(data));
    const result = data?.data ?? data ?? {};
    return { status: result.status ?? 'processing', ...result };
  }

  // Get download URL (unwrap { data } wrapper)
  async getDownloadUrl(shotId: number, generateId: string): Promise<{ download_url: string }> {
    const data = await this.request(`/shots/${shotId}/generate/${generateId}/download`);
    console.log('[LipDub] getDownloadUrl raw response:', JSON.stringify(data));
    const result = data?.data ?? data ?? {};
    return { download_url: result.download_url ?? '' };
  }
}

// Export singleton instance
export const lipdubApi = new LipDubAPI();

// Export class for custom instances
export { LipDubAPI };
