'use client'

import { useState } from 'react'
import { Upload, X, Music, FileText, Languages, MessageSquare, CheckCircle } from 'lucide-react'

interface AudioUploadProps {
  onUpload: (file: File, type: 'translate' | 'audio' | 'dialogue' | 'srt') => void
  onCancel: () => void
  isUploading?: boolean
  credits?: number
}

type TabType = 'translate' | 'audio' | 'dialogue' | 'srt'

export default function AudioUpload({ 
  onUpload, 
  onCancel,
  isUploading = false,
  credits = 0
}: AudioUploadProps) {
  const [activeTab, setActiveTab] = useState<TabType>('audio')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const tabs = [
    { id: 'translate' as TabType, label: 'Translate', icon: Languages },
    { id: 'audio' as TabType, label: 'Upload Audio', icon: Music },
    { id: 'dialogue' as TabType, label: 'Replace Dialogue', icon: MessageSquare },
    { id: 'srt' as TabType, label: 'Upload SRT', icon: FileText },
  ]

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
      setSelectedFile(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  const handleContinue = () => {
    if (selectedFile) {
      onUpload(selectedFile, activeTab)
    }
  }

  const getAcceptedTypes = () => {
    switch (activeTab) {
      case 'audio':
        return 'audio/mp3,audio/wav,audio/m4a'
      case 'srt':
        return '.srt'
      default:
        return '*'
    }
  }

  const getDescription = () => {
    switch (activeTab) {
      case 'translate':
        return 'Automatically translate your video to a different language with AI lip-sync'
      case 'audio':
        return 'Upload an audio file to LipDub in your target language'
      case 'dialogue':
        return 'Replace the dialogue in your video with new text'
      case 'srt':
        return 'Upload an SRT subtitle file for precise timing control'
      default:
        return ''
    }
  }

  return (
    <div className="w-full max-w-2xl bg-bg-secondary rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-white">
          Please choose one of these dubbing options
        </h2>
        <button onClick={onCancel} className="p-2 hover:bg-bg-elevated rounded-lg">
          <X className="w-5 h-5 text-text-muted" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setSelectedFile(null)
              }}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors
                ${isActive 
                  ? 'text-accent border-b-2 border-accent' 
                  : 'text-text-secondary hover:text-white'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <p className="text-text-secondary">{getDescription()}</p>

        {/* Upload Zone */}
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center transition-all
              ${isDragging 
                ? 'border-accent bg-accent/5' 
                : 'border-border bg-black/20 hover:border-accent/50'
              }
            `}
          >
            <input
              type="file"
              accept={getAcceptedTypes()}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-bg-elevated flex items-center justify-center">
                <Upload className="w-8 h-8 text-text-secondary" />
              </div>

              <p className="text-lg text-white">
                Drop your {activeTab === 'audio' ? 'audio' : activeTab === 'srt' ? 'SRT' : 'file'} here or click to browse
              </p>
              
              <p className="text-sm text-text-muted">
                Supported {activeTab === 'audio' ? 'audio' : activeTab === 'srt' ? 'subtitle' : 'video'} formats
              </p>

              <button className="px-6 py-2.5 bg-bg-elevated hover:bg-border text-white rounded-lg font-medium transition-colors">
                Choose file
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-black/20 rounded-xl border border-border p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-accent/20 flex items-center justify-center">
                {activeTab === 'audio' ? (
                  <Music className="w-7 h-7 text-accent" />
                ) : activeTab === 'srt' ? (
                  <FileText className="w-7 h-7 text-accent" />
                ) : (
                  <CheckCircle className="w-7 h-7 text-accent" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-sm text-text-secondary">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="p-2 hover:bg-bg-elevated rounded-lg"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-6 border-t border-border">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-bg-elevated hover:bg-border text-white rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedFile || isUploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isUploading ? (
            'Uploading...'
          ) : (
            <>
              Continue
              <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                {credits} CREDITS
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
