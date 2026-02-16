/**
 * LipDub API Client
 * Complete implementation of video/audio upload and generation flow
 */

const API_BASE = process.env.NEXT_PUBLIC_LIPDUB_API_URL || 'https://api.lipdub.ai/v1';
const API_KEY = process.env.NEXT_PUBLIC_LIPDUB_API_KEY || '';

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
  shot_status: 'finished' | 'processing' | 'failed';
  ai_training_status: 'finished' | 'processing' | 'failed';
}

export interface GenerateResponse {
  generate_id: string;
  status: string;
}

// API Client
class LipDubAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string = API_KEY, baseUrl: string = API_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      ...options.headers as Record<string, string>,
    };

    const res = await fetch(url, { ...options, headers });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`API Error ${res.status}: ${error}`);
    }

    return res.json();
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
    return data.data;
  }

  // Upload file to signed URL
  async uploadFileToUrl(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
  }

  // Notify upload success
  async notifyUploadSuccess(successUrl: string): Promise<void> {
    await this.request(successUrl, { method: 'POST' });
  }

  // Notify upload failure
  async notifyUploadFailure(failureUrl: string): Promise<void> {
    await this.request(failureUrl, { method: 'POST' });
  }

  // Get video status
  async getVideoStatus(videoId: string): Promise<VideoStatus> {
    const data = await this.request(`/video/status/${videoId}`);
    return data.data;
  }

  // Audio Upload
  async initiateAudioUpload(params: {
    file_name: string;
    content_type: string;
  }): Promise<AudioUploadResponse> {
    const data = await this.request('/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return data.data;
  }

  // Get audio status
  async getAudioStatus(audioId: string): Promise<AudioStatus> {
    const data = await this.request(`/audio/status/${audioId}`);
    return data.data;
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
    return data.data;
  }

  // Generate video from shot
  async generateVideo(shotId: number, params: {
    output_filename: string;
    audio_id?: string;
  }): Promise<GenerateResponse> {
    const data = await this.request(`/shots/${shotId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return data.data;
  }

  // Get generation status
  async getGenerationStatus(shotId: number, generateId: string): Promise<any> {
    return this.request(`/shots/${shotId}/generate/${generateId}`);
  }

  // Get download URL
  async getDownloadUrl(shotId: number, generateId: string): Promise<{ download_url: string }> {
    return this.request(`/shots/${shotId}/generate/${generateId}/download`);
  }
}

// Export singleton instance
export const lipdubApi = new LipDubAPI();

// Export class for custom instances
export { LipDubAPI };
