'use client'

import { useState } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Video, FileVideo } from 'lucide-react'

interface VideoUploadProps {
  onUpload: (file: File) => void
  onContinue?: () => void
  onCancel: () => void
  isUploading?: boolean
  uploadProgress?: number
  uploadComplete?: boolean
}

export default function VideoUpload({ 
  onUpload, 
  onContinue,
  onCancel, 
  isUploading = false, 
  uploadProgress = 0,
  uploadComplete = false
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
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-2">Paso 2: Sube tu video maestro</h2>
        <p className="text-text-secondary mb-4">Este video se usará para crear los clones</p>
        <div className="flex items-center justify-center gap-8 mt-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Video className="w-6 h-6 text-accent" />
            </div>
            <span className="text-xs text-text-secondary">30 segundos hablando</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-text-muted" />
            </div>
            <span className="text-xs text-text-secondary">Mejor calidad</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-text-muted" />
            </div>
            <span className="text-xs text-text-secondary">1 persona visible</span>
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
            relative border-2 border-dashed rounded-xl p-16 text-center transition-all
            ${isDragging 
              ? 'border-accent bg-accent/5' 
              : 'border-border bg-bg-secondary hover:border-accent/50'
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
            <div className="w-16 h-16 mx-auto rounded-full bg-bg-elevated flex items-center justify-center">
              <Upload className="w-8 h-8 text-text-secondary" />
            </div>

            <p className="text-lg text-white">Arrastra tu video aquí o haz clic para buscar</p>
            <p className="text-sm text-text-muted">Formatos de video soportados</p>

            <button className="px-6 py-2.5 bg-bg-elevated hover:bg-border text-white rounded-lg font-medium transition-colors">
              Elegir archivo
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-bg-elevated flex items-center justify-center">
              <FileVideo className="w-8 h-8 text-accent" />
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

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-bg-secondary rounded-xl border border-border p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
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
                <span className="text-white">
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
                className="flex-1 px-4 py-3 bg-bg-elevated hover:bg-border text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white">Subiendo...</span>
            <span className="text-white">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Complete - Continue Button */}
      {uploadComplete && !isUploading && (
        <div className="bg-bg-secondary rounded-xl border border-accent p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <span className="text-white font-medium">¡Video subido exitosamente!</span>
          </div>
          <button
            onClick={onContinue}
            className="w-full px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
          >
            Continuar al Paso 3: Subir Audio
          </button>
        </div>
      )}
    </div>
  )
}
