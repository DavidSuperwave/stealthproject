'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle, Film, Wand2 } from 'lucide-react'
import { lipdubApi } from '@/lib/lipdub-api'

interface ShotCreatorProps {
  videoId: string
  audioId?: string
  scriptText?: string
  onComplete: (shotId: number, generateId: string) => void
  onError: (error: string) => void
}

type CreationStep = 'creating_shot' | 'checking_shot' | 'generating' | 'checking_generate' | 'complete' | 'error'

export default function ShotCreator({ videoId, audioId, scriptText, onComplete, onError }: ShotCreatorProps) {
  const [step, setStep] = useState<CreationStep>('creating_shot')
  const [progress, setProgress] = useState(0)
  const [shotId, setShotId] = useState<number | null>(null)
  const [generateId, setGenerateId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createShotAndGenerate()
  }, [])

  const createShotAndGenerate = async () => {
    try {
      // Step 1: Wait for video to be ready and create shot
      setStep('creating_shot')
      setProgress(10)

      // Poll video status first
      let videoReady = false
      let attempts = 0
      
      while (!videoReady && attempts < 30) {
        const videoStatus = await lipdubApi.getVideoStatus(videoId)
        
        if (videoStatus.upload_status === 'completed' && videoStatus.shot_id) {
          setShotId(videoStatus.shot_id)
          videoReady = true
        } else if (videoStatus.upload_status === 'failed') {
          throw new Error('Video processing failed')
        }
        
        attempts++
        if (!videoReady) {
          await new Promise(r => setTimeout(r, 2000))
          setProgress(prev => Math.min(prev + 2, 30))
        }
      }

      if (!videoReady) {
        throw new Error('Video processing timeout')
      }

      // Step 2: Check shot status
      setStep('checking_shot')
      setProgress(40)

      let shotReady = false
      attempts = 0

      while (!shotReady && attempts < 30) {
        const shotStatus = await lipdubApi.getShotStatus(shotId!)
        
        if (shotStatus.shot_status === 'finished') {
          shotReady = true
        } else if (shotStatus.shot_status === 'failed') {
          throw new Error('Shot creation failed')
        }
        
        attempts++
        if (!shotReady) {
          await new Promise(r => setTimeout(r, 2000))
          setProgress(prev => Math.min(prev + 2, 60))
        }
      }

      if (!shotReady) {
        throw new Error('Shot processing timeout')
      }

      // Step 3: Generate video
      setStep('generating')
      setProgress(70)

      const generate = await lipdubApi.generateVideo(shotId!, {
        output_filename: `generated_${Date.now()}.mp4`,
        ...(audioId && { audio_id: audioId }),
      })

      setGenerateId(generate.generate_id)

      // Step 4: Poll generation status
      setStep('checking_generate')
      setProgress(80)

      let generateComplete = false
      attempts = 0

      while (!generateComplete && attempts < 60) {
        try {
          const genStatus = await lipdubApi.getGenerationStatus(shotId!, generate.generate_id)
          
          if (genStatus.status === 'completed') {
            generateComplete = true
          } else if (genStatus.status === 'failed') {
            throw new Error('Video generation failed')
          }
          
          attempts++
          if (!generateComplete) {
            await new Promise(r => setTimeout(r, 3000))
            setProgress(prev => Math.min(prev + 1, 95))
          }
        } catch (err) {
          // Generation status might not be available yet, keep polling
          attempts++
          await new Promise(r => setTimeout(r, 3000))
        }
      }

      if (!generateComplete) {
        throw new Error('Generation timeout')
      }

      // Complete!
      setStep('complete')
      setProgress(100)
      onComplete(shotId!, generate.generate_id)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      setStep('error')
      onError(errorMsg)
    }
  }

  const getStepInfo = () => {
    switch (step) {
      case 'creating_shot':
        return {
          icon: <Film className="w-8 h-8 text-accent animate-pulse" />,
          title: 'Paso 4: Preparando Video',
          description: 'Procesando tu video maestro...',
        }
      case 'checking_shot':
        return {
          icon: <Loader2 className="w-8 h-8 text-accent animate-spin" />,
          title: 'Entrenando IA',
          description: 'La IA está aprendiendo los movimientos faciales...',
        }
      case 'generating':
        return {
          icon: <Wand2 className="w-8 h-8 text-accent animate-pulse" />,
          title: 'Iniciando Generación',
          description: 'Preparando sincronización labial...',
        }
      case 'checking_generate':
        return {
          icon: <Loader2 className="w-8 h-8 text-accent animate-spin" />,
          title: 'Generando Video Final',
          description: 'Combinando video maestro + audio personalizado...',
        }
      case 'complete':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-400" />,
          title: '¡Video Listo!',
          description: 'Tu video con IA se ha generado exitosamente.',
        }
      case 'error':
        return {
          icon: <XCircle className="w-8 h-8 text-red-400" />,
          title: 'Error',
          description: error || 'Algo salió mal.',
        }
    }
  }

  const stepInfo = getStepInfo()

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
          {stepInfo.icon}
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl font-semibold text-white mb-2">{stepInfo.title}</h2>
        <p className="text-text-secondary mb-8">{stepInfo.description}</p>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Progreso</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          
          <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                step === 'error' ? 'bg-red-500' : step === 'complete' ? 'bg-green-500' : 'bg-accent'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status indicators */}
        <div className="mt-8 grid grid-cols-4 gap-2">
          {[
            { label: 'Video', complete: progress >= 30 },
            { label: 'Entrenamiento', complete: progress >= 60 },
            { label: 'Generación', complete: progress >= 80 },
            { label: 'Listo', complete: progress >= 100 },
          ].map((item, i) => (
            <div key={item.label} className="text-center">
              <div className={`
                w-3 h-3 mx-auto rounded-full mb-1
                ${item.complete ? 'bg-green-400' : 'bg-bg-elevated'}
              `} />
              <span className={`text-xs ${item.complete ? 'text-white' : 'text-text-muted'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* IDs display */}
        <div className="mt-6 text-xs text-text-muted space-y-1">
          {videoId && <p>Video: {videoId.slice(0, 8)}...{videoId.slice(-8)}</p>}
          {shotId && <p>Shot: {shotId}</p>}
          {generateId && <p>Generate: {generateId.slice(0, 8)}...</p>}
        </div>
      </div>
    </div>
  )
}
