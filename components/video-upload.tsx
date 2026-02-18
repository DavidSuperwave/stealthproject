"use client";

import { useState, useCallback } from "react";
import { useVideoUpload } from "@/hooks/use-video-upload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Film, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  onUploadComplete?: (videoUrl: string, videoId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
}

/**
 * Video Upload Component
 * 
 * Uploads videos directly to Supabase Storage (bypassing Vercel's 4.5MB limit),
 * then sends the URL to LipDub for processing.
 */
export function VideoUpload({
  onUploadComplete,
  onError,
  className,
  accept = "video/mp4,video/quicktime,video/webm",
  maxSizeMB = 50,
}: VideoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle");
  const [lipdubVideoId, setLipdubVideoId] = useState<string | null>(null);

  const {
    upload,
    isUploading,
    progress,
    error: uploadError,
    reset,
  } = useVideoUpload({
    onProgress: (p) => {
      console.log(`Upload progress: ${p.percentage}%`);
    },
    onSuccess: async (url, path) => {
      setUploadStage("processing");
      
      // Send URL to LipDub
      try {
        const res = await fetch('/api/video-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: url,
            options: {
              // Add any LipDub-specific options here
            },
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to process video');
        }

        const data = await res.json();
        setLipdubVideoId(data.videoId);
        setUploadStage("complete");
        onUploadComplete?.(url, data.videoId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setUploadStage("error");
        onError?.(error);
      }
    },
    onError: (err) => {
      setUploadStage("error");
      onError?.(err);
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        setSelectedFile(file);
        handleUpload(file);
      }
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handleUpload(file);
    }
  }, []);

  const handleUpload = async (file: File) => {
    setUploadStage("uploading");
    await upload(file);
  };

  const handleCancel = () => {
    reset();
    setSelectedFile(null);
    setUploadStage("idle");
    setLipdubVideoId(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Upload Area */}
      {uploadStage === "idle" && (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragActive
              ? "border-blue-500 bg-blue-500/10"
              : "border-border bg-muted/50 hover:bg-muted"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-muted">
              <Film className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <p className="text-sm font-medium">
              Drop your video here, or click to browse
            </p>
            
            <p className="text-xs text-muted-foreground">
              MP4, MOV, WebM up to 85MB
            </p>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {uploadStage === "uploading" && selectedFile && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Film className="h-5 w-5 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Progress value={progress?.percentage || 0} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading to storage...</span>
              <span>{progress?.percentage || 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {uploadStage === "processing" && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin">
              <Upload className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Processing video...</p>
              <p className="text-xs text-muted-foreground">
                LipDub is analyzing your video
              </p>
            </div>
          </div>
          
          <Progress value={100} className="animate-pulse" />
        </div>
      )}

      {/* Complete State */}
      {uploadStage === "complete" && lipdubVideoId && (
        <div className="border rounded-lg p-6 space-y-4 bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">Upload complete!</p>
              <p className="text-xs text-muted-foreground">
                Video ID: {lipdubVideoId}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
          >
            Upload another video
          </Button>
        </div>
      )}

      {/* Error State */}
      {uploadStage === "error" && (
        <div className="border rounded-lg p-6 space-y-4 bg-red-500/5 border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium">Upload failed</p>
              <p className="text-xs text-muted-foreground">
                {uploadError?.message || "Please try again"}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
