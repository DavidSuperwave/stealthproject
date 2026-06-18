'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, FileVideo, CheckCircle, ExternalLink, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { lipdubApi } from '@/lib/lipdub-api'
import { uploadCardPadded, uploadPanelPadded, uploadPrimaryButton, uploadSecondaryButton } from './uploadStyles'

interface VideoDownloadProps {
  shotId: number
  generateId: string
  filename?: string
  onDownload?: (downloadUrl: string) => void
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
        onDownload?.(result.download_url)
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
        <div className={`${uploadCardPadded} text-center`}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-yellow-700" />
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Video en proceso</h2>
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
        <div className={`${uploadCardPadded} text-center`}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Obteniendo tu video...</h2>
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
        <div className={`${uploadCardPadded} text-center`}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-700" />
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Error al obtener el video</h2>
          <p className="text-text-secondary mb-6">{error}</p>

          <button
            onClick={() => {
              fetchedRef.current = false
              fetchDownloadUrl()
            }}
            className={`w-full ${uploadPrimaryButton}`}
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
      <div className={`${uploadCardPadded} text-center`}>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-700" />
        </div>

        <h2 className="text-2xl font-semibold text-text-primary mb-2">¡Tu video está listo!</h2>
        <p className="text-text-secondary mb-8">
          Tu video generado con IA se ha procesado exitosamente y está listo para descargar.
        </p>

        <div className={`${uploadPanelPadded} mb-6`}>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-accent/15 bg-accent/10">
              <FileVideo className="w-6 h-6 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-text-primary font-semibold">{filename}</p>
              <p className="text-sm text-text-secondary">MP4 &bull; HD Quality</p>
            </div>
          </div>
        </div>

        <a
          href={downloadUrl!}
          download={filename}
          className="flex items-center justify-center gap-2 rounded-full bg-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-600"
        >
          <Download className="w-5 h-5" />
          Descargar Video
        </a>

        <button
          onClick={() => window.open(downloadUrl!, '_blank')}
          className={`mt-4 w-full ${uploadSecondaryButton}`}
        >
          <ExternalLink className="w-4 h-4" />
          Abrir en nueva pestaña
        </button>
      </div>
    </div>
  )
}
