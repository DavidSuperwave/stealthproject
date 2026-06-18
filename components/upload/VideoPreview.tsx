'use client'

import { Play, Trash2, FileVideo } from 'lucide-react'
import { uploadCardPadded } from './uploadStyles'

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
    <div className={uploadCardPadded}>
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Thumbnail */}
        <div className="relative w-full overflow-hidden rounded-[24px] bg-black md:w-72 md:flex-shrink-0" style={{ aspectRatio: '16 / 9' }}>
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-bg-elevated/80">
              <FileVideo className="w-12 h-12 text-text-muted" />
            </div>
          )}
          
          {/* Play Button Overlay */}
          <button 
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
          >
            <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur flex items-center justify-center group-hover:bg-white/35 transition-colors">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="grid flex-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <div>
            <p className="text-sm text-text-secondary mb-1">Filename</p>
            <p className="font-semibold text-text-primary">{filename}</p>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-1">Duration</p>
            <p className="text-text-primary">{duration}</p>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-1">Size</p>
            <p className="text-text-primary">{size}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button 
            onClick={onDelete}
            className="rounded-full border border-red-200 bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100"
            title="Delete video"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
