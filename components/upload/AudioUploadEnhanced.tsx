'use client'

import { useState } from 'react'
import { Upload, X, Music, FileText, Loader2, CheckCircle, Lock } from 'lucide-react'
import { lipdubApi } from '@/lib/lipdub-api'

interface AudioUploadEnhancedProps {
  videoId: string
  onComplete: (audioId: string, scriptText?: string) => void
  onCancel: () => void
}

type UploadStatus = 'idle' | 'initiating' | 'uploading' | 'processing' | 'complete' | 'error'

export default function AudioUploadEnhanced({ videoId, onComplete, onCancel }: AudioUploadEnhancedProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [audioId, setAudioId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'script'>('upload')

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setError(null)
    }
  }

  // Handle drag and drop
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
      const file = files[0]
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a)$/i.test(file.name)
      if (isAudio) {
        setSelectedFile(file)
        setError(null)
      }
    }
  }

  // Upload audio file
  const handleUploadAudio = async () => {
    if (!selectedFile) return

    setStatus('initiating')
    setProgress(10)
    setError(null)

    try {
      // Normalize content type — browser may report audio/mp3 but LipDub expects audio/mpeg
      let contentType = selectedFile.type
      if (contentType === 'audio/mp3') contentType = 'audio/mpeg'
      if (!contentType || !contentType.startsWith('audio/')) contentType = 'audio/mpeg'

      console.log('[Audio] Initiating upload:', {
        file_name: selectedFile.name,
        content_type: contentType,
        size_bytes: selectedFile.size,
      })

      // Step 1: Initiate upload with LipDub
      const upload = await lipdubApi.initiateAudioUpload({
        file_name: selectedFile.name,
        content_type: contentType,
        size_bytes: selectedFile.size,
      })

      console.log('[Audio] Initiate response:', JSON.stringify(upload))

      if (!upload.audio_id || !upload.upload_url) {
        throw new Error('LipDub no devolvió audio_id o upload_url válidos')
      }

      setAudioId(upload.audio_id)
      setStatus('uploading')
      setProgress(30)

      // Step 2: Upload to signed URL
      console.log('[Audio] Uploading file to signed URL...')
      await lipdubApi.uploadFileToUrl(upload.upload_url, selectedFile)
      console.log('[Audio] File uploaded successfully')
      setProgress(60)

      // Step 3: Notify success
      console.log('[Audio] Calling success callback:', upload.success_url)
      const successResult = await lipdubApi.notifyUploadSuccess(upload.success_url)
      console.log('[Audio] Success callback result:', JSON.stringify(successResult))
      setStatus('processing')
      setProgress(70)

      // Step 4: Poll for processing completion (check immediately, then every 5s)
      pollAudioStatus(upload.audio_id)

    } catch (err) {
      console.error('[Audio] Upload failed:', err)
      setError(err instanceof Error ? err.message : 'Error al subir el audio')
      setStatus('error')
    }
  }

  // Poll audio status
  const pollAudioStatus = async (id: string) => {
    const checkStatus = async (): Promise<boolean> => {
      try {
        const audioStatus = await lipdubApi.getAudioStatus(id)
        console.log('[Audio] Poll status:', JSON.stringify(audioStatus))

        if (audioStatus.upload_status === 'completed') {
          setProgress(100)
          setStatus('complete')
          onComplete(id)
          return true
        } else if (audioStatus.upload_status === 'failed') {
          setError('El procesamiento del audio falló en LipDub')
          setStatus('error')
          return true
        }

        // Still processing
        setProgress(prev => Math.min(prev + 3, 95))
        return false
      } catch (err) {
        console.error('[Audio] Poll error:', err)
        setError('Error al verificar estado del audio')
        setStatus('error')
        return true
      }
    }

    // Check immediately first
    const doneImmediately = await checkStatus()
    if (doneImmediately) return

    // Then poll every 5 seconds
    const interval = setInterval(async () => {
      const done = await checkStatus()
      if (done) clearInterval(interval)
    }, 5_000)
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'initiating':
        return { text: 'Iniciando subida...', icon: <Loader2 className="w-5 h-5 animate-spin" /> }
      case 'uploading':
        return { text: 'Subiendo audio...', icon: <Loader2 className="w-5 h-5 animate-spin" /> }
      case 'processing':
        return { text: 'Procesando audio...', icon: <Loader2 className="w-5 h-5 animate-spin" /> }
      case 'complete':
        return { text: '¡Audio listo!', icon: <CheckCircle className="w-5 h-5 text-green-400" /> }
      case 'error':
        return { text: error || 'Ocurrió un error', icon: <X className="w-5 h-5 text-red-400" /> }
      default:
        return null
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="w-full max-w-2xl bg-bg-secondary rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-white">Paso 3: Sube tu audio personalizado</h2>
          <p className="text-sm text-text-secondary">Este audio se combinará con tu video maestro</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-bg-elevated rounded-lg">
          <X className="w-5 h-5 text-text-muted" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors
            ${activeTab === 'upload' ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-white'}`}
        >
          <Music className="w-4 h-4" />
          Subir Audio
        </button>
        <button
          disabled
          className="flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-text-muted opacity-50 cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Escribir Guion
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-secondary border border-border text-[10px] text-text-muted font-medium">
            <Lock className="w-3 h-3" />
            Próximamente
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-6">
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-xl p-12 text-center transition-all
                ${isDragging ? 'border-accent bg-accent/5' : 'border-border bg-black/20 hover:border-accent/50'}
              `}
            >
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/m4a,audio/mp4,.mp3,.wav,.m4a"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-bg-elevated flex items-center justify-center">
                  <Upload className="w-8 h-8 text-text-secondary" />
                </div>
                <p className="text-lg text-white">Arrastra tu archivo de audio aquí o haz clic</p>
                <p className="text-sm text-text-muted">Formato MP3, WAV o M4A</p>
              </div>
            </div>
          ) : (
            <div className="bg-black/20 rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Music className="w-7 h-7 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-text-secondary">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                {status === 'idle' && (
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="p-2 hover:bg-bg-elevated rounded-lg"
                  >
                    <X className="w-5 h-5 text-text-muted" />
                  </button>
                )}
              </div>

              {/* Progress */}
              {status !== 'idle' && status !== 'error' && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-2">
                      {statusDisplay?.icon}
                      {statusDisplay?.text}
                    </span>
                    <span className="text-white">{progress}%</span>
                  </div>
                  <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {status === 'error' && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-6 border-t border-border">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-bg-elevated hover:bg-border text-white rounded-lg font-medium transition-colors"
        >
          Cancelar
        </button>
        
        <button
          onClick={handleUploadAudio}
          disabled={!selectedFile || status !== 'idle'}
          className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {status === 'idle' ? 'Subir Audio' : statusDisplay?.text}
        </button>
      </div>
    </div>
  )
}
