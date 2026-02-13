'use client'

import { useState } from 'react'
import { Upload, Cloud, FileVideo } from 'lucide-react'

interface UploadStepProps {
  onUpload: (file: File) => void
  isUploading?: boolean
  uploadProgress?: number
}

export default function UploadStep({ onUpload, isUploading = false, uploadProgress = 0 }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      onUpload(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onUpload(files[0])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Upload Your Video</h2>
        <p className="text-text-secondary">
          Upload a video file to start the personalization process. We'll automatically generate a transcript.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all
          ${isDragging 
            ? 'border-accent bg-accent/5' 
            : 'border-border bg-bg-secondary hover:border-accent/50'
          }
        `}
      >
        <input
          type="file"
          accept="video/mp4,video/mov"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-bg-elevated flex items-center justify-center">
            <Cloud className="w-8 h-8 text-text-secondary" />
          </div>

          <p className="text-lg text-white">Drop your video file here or click to browse</p>

          <button className="px-6 py-2.5 bg-bg-elevated hover:bg-border text-white rounded-lg font-medium transition-colors">
            Choose file
          </button>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Uploading...</span>
              <span className="text-sm text-white">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Supported Formats */}
      <p className="text-center text-sm text-text-muted">
        Supported: MP4, MOV | Max 500MB | Up to 4K resolution
      </p>
    </div>
  )
}
