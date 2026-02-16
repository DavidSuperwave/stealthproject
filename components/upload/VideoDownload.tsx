'use client'

import { useState } from 'react'
import { Download, FileVideo, CheckCircle, ExternalLink, Loader2 } from 'lucide-react'

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
  const [isLoading, setIsLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const handleGetDownloadUrl = async () => {
    setIsLoading(true)
    try {
      // This would call the actual API
      // const url = await lipdubApi.getDownloadUrl(shotId, generateId)
      
      // Mock for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      setDownloadUrl(`https://storage.lipdub.ai/download/${shotId}/${generateId}`)
      onDownload?.()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to get download URL')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {!downloadUrl ? (
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
                <p className="text-sm text-text-secondary">MP4 • HD Quality</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleGetDownloadUrl}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Obteniendo enlace...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Obtener Enlace de Descarga
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Download className="w-10 h-10 text-green-400" />
          </div>

          <h2 className="text-2xl font-semibold text-white mb-2">¡Descarga lista!</h2>
          <p className="text-text-secondary mb-8">
            Haz clic en el botón de abajo para descargar tu video.
          </p>

          <a
            href={downloadUrl}
            download={filename}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Descargar Video
          </a>

          <button
            onClick={() => window.open(downloadUrl, '_blank')}
            className="mt-4 flex items-center justify-center gap-2 px-6 py-3 text-text-secondary hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir en nueva pestaña
          </button>
        </div>
      )}
    </div>
  )
}
