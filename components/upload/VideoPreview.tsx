'use client'

import { Play, Trash2, FileVideo } from 'lucide-react'

interface VideoPreviewProps {
  filename: string
  duration: string
  size: string
  thumbnailUrl?: string
  onDelete?: () => void
  onPlay?: () => void
}

export default function VideoPreview({ 
  filename, 
  duration, 
  size, 
  thumbnailUrl,
  onDelete,
  onPlay
}: VideoPreviewProps) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex gap-6">
        {/* Thumbnail */}
        <div className="relative w-64 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-bg-elevated">
              <FileVideo className="w-12 h-12 text-text-muted" />
            </div>
          )}
          
          {/* Play Button Overlay */}
          <button 
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-sm text-text-secondary mb-1">Filename:</p>
            <p className="text-white font-medium">{filename}</p>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-1">Duration:</p>
            <p className="text-white">{duration}</p>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-1">Size:</p>
            <p className="text-white">{size}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button 
            onClick={onDelete}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Delete video"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
