"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseVideoUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
  onSuccess?: (url: string, path: string) => void;
}

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload videos directly to Supabase Storage (bypasses Vercel 4.5MB limit)
 * 
 * Usage:
 * const { upload, isUploading, progress, error } = useVideoUpload({
 *   onProgress: (p) => console.log(`${p.percentage}%`),
 *   onSuccess: (url) => console.log('Uploaded:', url)
 * });
 * 
 * const result = await upload(file);
 */
export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      if (!file) {
        const err = new Error("No file provided");
        setError(err);
        options.onError?.(err);
        return null;
      }

      // Validate file type
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi'];
      if (!allowedTypes.includes(file.type)) {
        const err = new Error(`Invalid file type: ${file.type}. Allowed: MP4, MOV, WebM, AVI`);
        setError(err);
        options.onError?.(err);
        return null;
      }

      // Validate file size (85MB max)
      const maxSize = 85 * 1024 * 1024;
      if (file.size > maxSize) {
        const err = new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 85MB`);
        setError(err);
        options.onError?.(err);
        return null;
      }

      setIsUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: file.size, percentage: 0 });

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Generate unique file path: userId/timestamp-filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${timestamp}-${sanitizedName}`;

        // Upload with progress tracking
        const { data, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (event) => {
              const loaded = event.loaded;
              const total = event.total || file.size;
              const percentage = Math.round((loaded / total) * 100);
              
              const progressData = { loaded, total, percentage };
              setProgress(progressData);
              options.onProgress?.(progressData);
            },
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(data.path);

        const result = { url: publicUrl, path: data.path };
        options.onSuccess?.(publicUrl, data.path);
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
        setProgress(null);
      }
    },
    [supabase, options]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  };
}

/**
 * Delete a video from Supabase Storage
 */
export function useVideoDelete() {
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();

  const deleteVideo = useCallback(
    async (path: string): Promise<boolean> => {
      setIsDeleting(true);
      try {
        const { error } = await supabase.storage
          .from('videos')
          .remove([path]);

        if (error) {
          throw new Error(`Delete failed: ${error.message}`);
        }

        return true;
      } catch (err) {
        console.error('Failed to delete video:', err);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [supabase]
  );

  return { deleteVideo, isDeleting };
}

/**
 * List user's uploaded videos
 */
export function useUserVideos() {
  const [videos, setVideos] = useState<Array<{ name: string; url: string; created_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.storage
        .from('videos')
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const videosWithUrls = (data || [])
        .filter(file => !file.name.endsWith('/')) // Exclude folders
        .map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('videos')
            .getPublicUrl(`${user.id}/${file.name}`);
          
          return {
            name: file.name,
            url: publicUrl,
            created_at: file.created_at,
          };
        });

      setVideos(videosWithUrls);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return { videos, isLoading, fetchVideos };
}
