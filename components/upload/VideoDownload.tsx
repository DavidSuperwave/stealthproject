'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, FileVideo, CheckCircle, ExternalLink, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { lipdubApi } from '@/lib/lipdub-api'

interface VideoDownloadProps {
  shotId: number
  generateId: string
  filename?: string
  onDownload?: () => void
  onError?: (error: string) => void
}

export default function VideoDownload({ 
  shotId, 
  generateId, 
  filename = 'generated_video.mp4',
  onDownload,
  onError
}: VideoDownloadProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const isValid = shotId > 0 && !!generateId

  const fetchDownloadUrl = async () => {
    if (!isValid) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await lipdubApi.getDownloadUrl(shotId, generateId)
      if (result.download_url) {
        setDownloadUrl(result.download_url)
        onDownload?.()
      } else {
        throw new Error('El servidor no devolvió un enlace de descarga')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo obtener el enlace de descarga'
      setError(message)
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch on mount when IDs are valid
  useEffect(() => {
    if (!isValid || fetchedRef.current) return
    fetchedRef.current = true
    fetchDownloadUrl()
  }, [shotId, generateId])

  // Guard: invalid IDs
  if (!isValid) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Video en proceso</h2>
          <p className="text-text-secondary mb-4">
            Tu video aún se está procesando o ocurrió un error. Vuelve a intentar más tarde.
          </p>
          <div className="text-xs text-text-muted">
            {shotId ? <p>Shot: {shotId}</p> : <p>Shot ID no disponible</p>}
            {generateId ? <p>Generate: {generateId}</p> : <p>Generate ID no disponible</p>}
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Obteniendo tu video...</h2>
          <p className="text-text-secondary mb-4">
            Preparando el enlace de descarga de tu video generado con IA.
          </p>
          <div className="text-xs text-text-muted space-y-1">
            <p>Shot: {shotId}</p>
            <p>Generate: {generateId.length > 16 ? `${generateId.slice(0, 8)}...${generateId.slice(-8)}` : generateId}</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Error al obtener el video</h2>
          <p className="text-text-secondary mb-6">{error}</p>

          <button
            onClick={() => {
              fetchedRef.current = false
              fetchDownloadUrl()
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Reintentar
          </button>

          <div className="mt-4 text-xs text-text-muted space-y-1">
            <p>Shot: {shotId}</p>
            <p>Generate: {generateId.length > 16 ? `${generateId.slice(0, 8)}...${generateId.slice(-8)}` : generateId}</p>
          </div>
        </div>
      </div>
    )
  }

  // Success state — download URL is ready
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>

        <h2 className="text-2xl font-semibold text-white mb-2">¡Tu video está listo!</h2>
        <p className="text-text-secondary mb-8">
          Tu video generado con IA se ha procesado exitosamente y está listo para descargar.
        </p>

        <div className="bg-bg-elevated rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <FileVideo className="w-8 h-8 text-accent" />
            <div className="text-left">
              <p className="text-white font-medium">{filename}</p>
              <p className="text-sm text-text-secondary">MP4 &bull; HD Quality</p>
            </div>
          </div>
        </div>

        <a
          href={downloadUrl!}
          download={filename}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
        >
          <Download className="w-5 h-5" />
          Descargar Video
        </a>

        <button
          onClick={() => window.open(downloadUrl!, '_blank')}
          className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 text-text-secondary hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir en nueva pestaña
        </button>
      </div>
    </div>
  )
}
