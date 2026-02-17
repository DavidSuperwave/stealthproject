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

  // Upload file to signed URL via server-side proxy (GCS blocks browser CORS)
  async uploadFileToUrl(uploadUrl: string, file: File): Promise<void> {
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
