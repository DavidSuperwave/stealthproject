'use client'

import { useState } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Video, FileVideo, RefreshCw } from 'lucide-react'
import {
  uploadCardPadded,
  uploadDropzone,
  uploadIconBadge,
  uploadPanelPadded,
  uploadPrimaryButton,
  uploadProgressBar,
  uploadProgressTrack,
  uploadSecondaryButton,
} from './uploadStyles'

interface VideoUploadProps {
  onUpload: (file: File) => void
  onContinue?: () => void
  onCancel: () => void
  isUploading?: boolean
  uploadProgress?: number
  uploadComplete?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function VideoUpload({ 
  onUpload, 
  onContinue,
  onCancel, 
  isUploading = false, 
  uploadProgress = 0,
  uploadComplete = false,
  error = null,
  onRetry,
}: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

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
    if (files.length > 0 && files[0].type.startsWith('video/')) {
      setSelectedFile(files[0])
      setShowConfirmation(true)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setShowConfirmation(true)
    }
  }

  const handleConfirm = () => {
    if (selectedFile) {
      onUpload(selectedFile)
      setShowConfirmation(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${uploadCardPadded} text-center`}>
        <p className="text-sm font-semibold uppercase text-accent">Master video</p>
        <h2 className="mt-2 text-2xl font-semibold text-text-primary">Paso 2: Sube tu video maestro</h2>
        <p className="text-text-secondary mb-4">Este video se usará para crear los clones</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-accent shadow-sm">
              <Video className="w-6 h-6 text-accent" />
            </div>
            <span className="mt-3 block text-xs font-semibold text-text-secondary">30 segundos hablando</span>
          </div>
          <div className="rounded-2xl border border-border bg-bg-elevated/70 p-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-accent shadow-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="mt-3 block text-xs font-semibold text-text-secondary">Mejor calidad</span>
          </div>
          <div className="rounded-2xl border border-border bg-bg-elevated/70 p-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-accent shadow-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="mt-3 block text-xs font-semibold text-text-secondary">1 persona visible</span>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            ${uploadDropzone}
            ${isDragging 
              ? 'border-accent bg-accent/10 shadow-[0_18px_60px_rgba(8,122,75,0.10)]' 
              : 'border-border bg-white hover:border-accent/50 hover:bg-bg-elevated/50'
            }
          `}
        >
          <input
            type="file"
            accept="video/mp4,video/mov,video/avi"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="space-y-4">
            <div className={`${uploadIconBadge} mx-auto h-16 w-16`}>
              <Upload className="w-8 h-8 text-text-secondary" />
            </div>

            <p className="text-lg font-semibold text-text-primary">Arrastra tu video aquí o haz clic para buscar</p>
            <p className="text-sm text-text-muted">Formatos de video soportados</p>

            <button className={uploadSecondaryButton}>
              Elegir archivo
            </button>
          </div>
        </div>
      ) : (
        <div className={uploadPanelPadded}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent/15 bg-accent/10">
              <FileVideo className="w-8 h-8 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary">{selectedFile.name}</p>
              <p className="text-sm text-text-secondary">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button 
              onClick={() => setSelectedFile(null)}
              className="rounded-full p-2 text-text-muted transition hover:bg-white hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${uploadCardPadded}`}>
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  ¡Espera! Antes de subir, confirma:
                </h3>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={true}
                  readOnly
                  className="w-5 h-5 rounded border-border bg-bg-elevated text-accent focus:ring-accent"
                />
                <span className="text-text-primary">
                  Tu actor habla en pantalla por al menos 30 segundos
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-5 h-5 rounded border-border bg-bg-elevated text-accent focus:ring-accent"
                />
                <span className="text-text-secondary">No mostrar este mensaje de nuevo</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className={`flex-1 ${uploadSecondaryButton}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 ${uploadPrimaryButton}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className={uploadPanelPadded}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-text-primary">Subiendo...</span>
            <span className="font-semibold text-accent">{uploadProgress}%</span>
          </div>
          <div className={uploadProgressTrack}>
            <div 
              className={uploadProgressBar}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Error */}
      {error && !isUploading && (
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-700 flex-shrink-0" />
            <div>
              <p className="text-text-primary font-medium">Error al subir el video</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                onRetry?.()
                setSelectedFile(null)
              }}
              className={`flex-1 ${uploadSecondaryButton}`}
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Upload Complete - Continue Button */}
      {uploadComplete && !isUploading && !error && (
        <div className="rounded-[24px] border border-accent/25 bg-accent/10 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle className="w-6 h-6 text-accent" />
            <span className="text-text-primary font-semibold">¡Video subido exitosamente!</span>
          </div>
          <button
            onClick={onContinue}
            className={`w-full ${uploadPrimaryButton}`}
          >
            Continuar al Paso 3: Subir Audio
          </button>
        </div>
      )}
    </div>
  )
}
