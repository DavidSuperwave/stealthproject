'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle, XCircle, Film, Wand2, Music, CreditCard } from 'lucide-react'
import { lipdubApi } from '@/lib/lipdub-api'
import Link from 'next/link'

interface ShotCreatorProps {
  videoId: string
  audioId?: string
  scriptText?: string
  projectId?: string
  initialShotId?: number | null
  onComplete: (shotId: number, generateId: string) => void
  onError: (error: string) => void
}

type CreationStep = 'creating_shot' | 'checking_shot' | 'checking_audio' | 'deducting_credits' | 'generating' | 'checking_generate' | 'complete' | 'error' | 'insufficient_credits'

const CREDITS_PER_MINUTE = 5
const DEFAULT_VIDEO_MINUTES = 1

export default function ShotCreator({ videoId, audioId, scriptText, projectId, initialShotId, onComplete, onError }: ShotCreatorProps) {
  const [step, setStep] = useState<CreationStep>('creating_shot')
  const [progress, setProgress] = useState(0)
  const [shotId, setShotId] = useState<number | null>(null)
  const [generateId, setGenerateId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedLabel, setElapsedLabel] = useState('')
  const [creditsDeducted, setCreditsDeducted] = useState(0)
  const [creditsInfo, setCreditsInfo] = useState<{ remaining: number; needed: number } | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    createShotAndGenerate()
  }, [])

  const createShotAndGenerate = async () => {
    let localShotId: number | null = null
    let localGenerateId: string | null = null
    let localCreditsDeducted = 0
    let attempts = 0

    try {
      // Guard: audio_id is required for lip-sync generation
      if (!audioId) {
        throw new Error('Sube un archivo de audio para continuar. El guion de texto aún no está disponible.')
      }

      console.log('[ShotCreator] Starting with videoId:', videoId, 'audioId:', audioId, 'initialShotId:', initialShotId)

      // Step 1: Get shot_id — use initialShotId if available, otherwise poll video status
      setStep('creating_shot')
      setProgress(5)

      if (initialShotId) {
        console.log('[ShotCreator] Using initialShotId from callback:', initialShotId)
        localShotId = initialShotId
        setShotId(localShotId)
        setProgress(20)
      } else {
        let videoReady = false
        attempts = 0
        const VIDEO_POLL_INTERVAL = 30_000
        const VIDEO_MAX_ATTEMPTS = 60

        while (!videoReady && attempts < VIDEO_MAX_ATTEMPTS) {
          const videoStatus = await lipdubApi.getVideoStatus(videoId)
          console.log('[ShotCreator] Video status poll:', JSON.stringify(videoStatus))

          if (videoStatus.upload_status === 'completed' && videoStatus.shot_id) {
            localShotId = videoStatus.shot_id
            setShotId(localShotId)
            videoReady = true
          } else if (videoStatus.upload_status === 'failed') {
            throw new Error('El procesamiento del video falló en LipDub')
          }

          attempts++
          if (!videoReady) {
            setElapsedLabel(`Revisando estado del video... (intento ${attempts}/${VIDEO_MAX_ATTEMPTS})`)
            await new Promise(r => setTimeout(r, VIDEO_POLL_INTERVAL))
            setProgress(prev => Math.min(prev + 1, 20))
          }
        }

        if (!videoReady || !localShotId) {
          throw new Error('Tiempo de espera agotado para el procesamiento del video')
        }
      }

      // Step 2: Poll shot status until AI training finishes (poll every 30s, up to 60 min)
      setStep('checking_shot')
      setProgress(25)

      let shotReady = false
      attempts = 0
      const SHOT_POLL_INTERVAL = 30_000
      const SHOT_MAX_ATTEMPTS = 120

      while (!shotReady && attempts < SHOT_MAX_ATTEMPTS) {
        const shotStatus = await lipdubApi.getShotStatus(localShotId)
        console.log('[ShotCreator] Shot status poll:', JSON.stringify(shotStatus))

        // Accept 'finished' or 'completed' as ready states
        const isShotReady = ['finished', 'completed'].includes(shotStatus.shot_status)
        const isAiReady = ['finished', 'completed'].includes(shotStatus.ai_training_status)

        if (isShotReady && isAiReady) {
          console.log('[ShotCreator] Shot ready — AI training complete')
          shotReady = true
        } else if (shotStatus.shot_status === 'failed' || shotStatus.ai_training_status === 'failed') {
          throw new Error('El entrenamiento de IA falló')
        }

        attempts++
        if (!shotReady) {
          setElapsedLabel(`Entrenando modelo IA... (intento ${attempts}/${SHOT_MAX_ATTEMPTS}) — shot: ${shotStatus.shot_status}, ai: ${shotStatus.ai_training_status}`)
          await new Promise(r => setTimeout(r, SHOT_POLL_INTERVAL))
          setProgress(prev => Math.min(prev + 1, 45))
        }
      }

      if (!shotReady) {
        throw new Error('Tiempo de espera agotado para el entrenamiento de IA')
      }

      // Step 3: Verify audio is ready (should already be completed from previous step)
      setStep('checking_audio')
      setProgress(50)

      let audioReady = false
      attempts = 0
      const AUDIO_POLL_INTERVAL = 5_000
      const AUDIO_MAX_ATTEMPTS = 60

      while (!audioReady && attempts < AUDIO_MAX_ATTEMPTS) {
        const audioStatus = await lipdubApi.getAudioStatus(audioId)
        console.log('[ShotCreator] Audio status poll:', JSON.stringify(audioStatus))

        if (audioStatus.upload_status === 'completed') {
          console.log('[ShotCreator] Audio ready')
          audioReady = true
        } else if (audioStatus.upload_status === 'failed') {
          throw new Error('El procesamiento del audio falló en LipDub')
        }

        attempts++
        if (!audioReady) {
          setElapsedLabel(`Verificando audio... (intento ${attempts}/${AUDIO_MAX_ATTEMPTS})`)
          await new Promise(r => setTimeout(r, AUDIO_POLL_INTERVAL))
          setProgress(prev => Math.min(prev + 1, 60))
        }
      }

      if (!audioReady) {
        throw new Error('Tiempo de espera agotado para el procesamiento del audio')
      }

      // Step 4: Deduct credits before generating
      console.log('[ShotCreator] All checks passed — shot ready, audio ready. Proceeding to credit check...')
      setStep('deducting_credits')
      setProgress(62)
      setElapsedLabel('Verificando créditos...')

      const creditsNeeded = CREDITS_PER_MINUTE * DEFAULT_VIDEO_MINUTES

      const deductRes = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId || null,
          credits_to_deduct: creditsNeeded,
        }),
      })

      if (deductRes.status === 402) {
        const deductData = await deductRes.json()
        setCreditsInfo({
          remaining: deductData.credits_remaining ?? 0,
          needed: deductData.credits_needed ?? creditsNeeded,
        })
        setStep('insufficient_credits')
        setError('No tienes suficientes créditos para generar este video.')
        onError('INSUFFICIENT_CREDITS')
        return
      }

      if (!deductRes.ok) {
        const deductData = await deductRes.json()
        throw new Error(deductData.error || 'Error al verificar créditos')
      }

      localCreditsDeducted = creditsNeeded
      setCreditsDeducted(creditsNeeded)
      setElapsedLabel('')

      // Dispatch event so Layout/TopNav can refresh credits
      window.dispatchEvent(new Event('credits-updated'))

      // Step 5: Generate video — POST /v1/shots/{shot_id}/generate
      setStep('generating')
      setProgress(65)
      setElapsedLabel('')

      console.log('[ShotCreator] Calling generate:', { shotId: localShotId, audioId, language: 'es-MX' })
      let generate
      try {
        generate = await lipdubApi.generateVideo(localShotId, {
          output_filename: `generated_${Date.now()}.mp4`,
          audio_id: audioId,
          language: 'es-MX',
        })
      } catch (genErr) {
        // Generation call failed — refund the credits
        await fetch('/api/credits/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: creditsNeeded,
            project_id: projectId || null,
            reason: 'Reembolso: la generación de video falló al iniciar',
          }),
        })
        setCreditsDeducted(0)
        window.dispatchEvent(new Event('credits-updated'))
        throw genErr
      }

      console.log('[ShotCreator] generate response:', JSON.stringify(generate))

      if (!generate || !generate.generate_id) {
        // Refund if we didn't get a valid response
        await fetch('/api/credits/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: creditsNeeded,
            project_id: projectId || null,
            reason: 'Reembolso: LipDub no devolvió ID de generación',
          }),
        })
        setCreditsDeducted(0)
        window.dispatchEvent(new Event('credits-updated'))
        throw new Error('LipDub no devolvió un ID de generación válido')
      }

      localGenerateId = String(generate.generate_id)
      setGenerateId(localGenerateId)

      // Step 6: Poll generation status
      // API status enum: "not_started" | "pending" | "running" | "finished" | "failed"
      setStep('checking_generate')
      setProgress(70)

      let generateComplete = false
      attempts = 0
      const GEN_POLL_INTERVAL = 30_000
      const GEN_MAX_ATTEMPTS = 120

      while (!generateComplete && attempts < GEN_MAX_ATTEMPTS) {
        try {
          const genStatus = await lipdubApi.getGenerationStatus(localShotId, localGenerateId)
          const normalizedStatus = String(genStatus.status).toLowerCase()
          console.log('[ShotCreator] Generation status poll:', normalizedStatus, JSON.stringify(genStatus))

          if (normalizedStatus === 'finished' || normalizedStatus === 'completed') {
            console.log('[ShotCreator] Generation complete!')
            generateComplete = true
          } else if (normalizedStatus === 'failed') {
            throw new Error('La generación del video falló')
          }

          // "not_started", "pending", "running" → still in progress
          attempts++
          if (!generateComplete) {
            setElapsedLabel(`Generando video final... (estado: ${genStatus.status}, intento ${attempts}/${GEN_MAX_ATTEMPTS})`)
            await new Promise(r => setTimeout(r, GEN_POLL_INTERVAL))
            setProgress(prev => Math.min(prev + 1, 95))
          }
        } catch (err) {
          if (err instanceof Error && err.message === 'La generación del video falló') {
            throw err
          }
          console.warn('[ShotCreator] Generation poll error:', err)
          attempts++
          setElapsedLabel(`Esperando estado de generación... (intento ${attempts}/${GEN_MAX_ATTEMPTS})`)
          await new Promise(r => setTimeout(r, GEN_POLL_INTERVAL))
        }
      }

      if (!generateComplete) {
        throw new Error('Tiempo de espera agotado para la generación del video')
      }

      // Complete!
      setStep('complete')
      setProgress(100)
      setElapsedLabel('')
      onComplete(localShotId, localGenerateId)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'

      // If credits were deducted but generation failed, refund them
      if (localCreditsDeducted > 0) {
        try {
          await fetch('/api/credits/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: localCreditsDeducted,
              project_id: projectId || null,
              reason: `Reembolso: ${errorMsg}`,
            }),
          })
          setCreditsDeducted(0)
          window.dispatchEvent(new Event('credits-updated'))
        } catch (refundErr) {
          console.error('Credit refund failed:', refundErr)
        }
      }

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
          title: 'Preparando Video',
          description: 'Procesando tu video maestro en LipDub...',
        }
      case 'checking_shot':
        return {
          icon: <Loader2 className="w-8 h-8 text-accent animate-spin" />,
          title: 'Entrenando IA',
          description: 'La IA está aprendiendo los movimientos faciales. Esto puede tomar varios minutos...',
        }
      case 'checking_audio':
        return {
          icon: <Music className="w-8 h-8 text-accent animate-pulse" />,
          title: 'Verificando Audio',
          description: 'Confirmando que tu audio está listo para la sincronización...',
        }
      case 'deducting_credits':
        return {
          icon: <CreditCard className="w-8 h-8 text-accent animate-pulse" />,
          title: 'Verificando Créditos',
          description: 'Confirmando que tienes créditos suficientes...',
        }
      case 'generating':
        return {
          icon: <Wand2 className="w-8 h-8 text-accent animate-pulse" />,
          title: 'Iniciando Generación',
          description: 'Preparando sincronización labial con tu audio...',
        }
      case 'checking_generate':
        return {
          icon: <Loader2 className="w-8 h-8 text-accent animate-spin" />,
          title: 'Generando Video Final',
          description: 'Combinando video maestro + audio personalizado. Esto puede tomar varios minutos...',
        }
      case 'complete':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-400" />,
          title: '¡Video Listo!',
          description: 'Tu video con IA se ha generado exitosamente.',
        }
      case 'insufficient_credits':
        return {
          icon: <CreditCard className="w-8 h-8 text-red-400" />,
          title: 'Créditos Insuficientes',
          description: error || 'No tienes suficientes créditos para generar este video.',
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
        <p className="text-text-secondary mb-4">{stepInfo.description}</p>

        {/* Elapsed / attempt label */}
        {elapsedLabel && (
          <p className="text-xs text-text-muted mb-4">{elapsedLabel}</p>
        )}

        {/* Long-running notice */}
        {(step === 'checking_shot' || step === 'checking_generate') && (
          <div className="mb-6 p-3 bg-accent/5 border border-accent/20 rounded-lg">
            <p className="text-xs text-accent">
              Este proceso puede tomar varios minutos. Puedes dejar esta página abierta — te notificaremos cuando esté listo.
            </p>
          </div>
        )}

        {/* Insufficient credits CTA */}
        {step === 'insufficient_credits' && creditsInfo && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
            <p className="text-sm text-red-300">
              Necesitas <span className="font-bold text-white">{creditsInfo.needed}</span> créditos pero solo tienes{' '}
              <span className="font-bold text-white">{creditsInfo.remaining.toFixed(2)}</span>.
            </p>
            <Link
              href="/subscription"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
            >
              <CreditCard className="w-4 h-4" />
              Comprar más créditos
            </Link>
          </div>
        )}

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
        <div className="mt-8 grid grid-cols-5 gap-2">
          {[
            { label: 'Video', complete: progress >= 20 },
            { label: 'IA', complete: progress >= 45 },
            { label: 'Audio', complete: progress >= 60 },
            { label: 'Generación', complete: progress >= 70 },
            { label: 'Listo', complete: progress >= 100 },
          ].map((item) => (
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
          {audioId && <p>Audio: {audioId.slice(0, 8)}...{audioId.slice(-8)}</p>}
          {generateId && <p>Generate: {generateId.slice(0, 8)}...</p>}
        </div>
      </div>
    </div>
  )
}
