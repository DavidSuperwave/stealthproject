'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle, XCircle, Film, Wand2, Music, CreditCard, Sparkles, Cpu, Zap } from 'lucide-react'
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

// ~30 min total generation time
const GENERATION_DURATION_MS = 30 * 60 * 1000

// Rotating messages shown during generation
const GENERATION_MESSAGES = [
  'Analizando cuadros de video...',
  'Mapeando puntos faciales del actor...',
  'Sincronizando movimientos labiales con audio...',
  'Aplicando modelo de IA propietario...',
  'Renderizando cuadros de video...',
  'Optimizando calidad de imagen...',
  'Ajustando iluminación y texturas...',
  'Combinando audio con video final...',
  'Verificando sincronización labial...',
  'Finalizando renderizado en alta calidad...',
]

export default function ShotCreator({ videoId, audioId, scriptText, projectId, initialShotId, onComplete, onError }: ShotCreatorProps) {
  const [step, setStep] = useState<CreationStep>('creating_shot')
  const [progress, setProgress] = useState(0)
  const [shotId, setShotId] = useState<number | null>(null)
  const [generateId, setGenerateId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedLabel, setElapsedLabel] = useState('')
  const [creditsDeducted, setCreditsDeducted] = useState(0)
  const [creditsInfo, setCreditsInfo] = useState<{ remaining: number; needed: number } | null>(null)
  const [generationMessage, setGenerationMessage] = useState(GENERATION_MESSAGES[0])
  const [displayProgress, setDisplayProgress] = useState(0)
  const startedRef = useRef(false)
  const generationStartRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    createShotAndGenerate()
  }, [])

  // Time-based progress for the generation phase (~30 min)
  useEffect(() => {
    if (step === 'checking_generate') {
      generationStartRef.current = Date.now()

      // Update progress every 10 seconds
      timerRef.current = setInterval(() => {
        if (!generationStartRef.current) return
        const elapsed = Date.now() - generationStartRef.current
        const fraction = Math.min(elapsed / GENERATION_DURATION_MS, 1)
        // Progress goes from 70 → 98 over 30 min (leaves room for snap to 100)
        const newProgress = Math.round(70 + fraction * 28)
        setDisplayProgress(newProgress)
      }, 10_000)

      // Rotate messages every 20 seconds
      let msgIndex = 0
      messageTimerRef.current = setInterval(() => {
        msgIndex = (msgIndex + 1) % GENERATION_MESSAGES.length
        setGenerationMessage(GENERATION_MESSAGES[msgIndex])
      }, 20_000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (messageTimerRef.current) clearInterval(messageTimerRef.current)
      }
    } else if (step === 'complete') {
      setDisplayProgress(100)
      if (timerRef.current) clearInterval(timerRef.current)
      if (messageTimerRef.current) clearInterval(messageTimerRef.current)
    }
  }, [step])

  // Sync displayProgress with progress for non-generation steps
  useEffect(() => {
    if (step !== 'checking_generate' && step !== 'complete') {
      setDisplayProgress(progress)
    }
  }, [progress, step])

  const createShotAndGenerate = async () => {
    let localShotId: number | null = null
    let localGenerateId: string | null = null
    let localCreditsDeducted = 0
    let attempts = 0

    try {
      if (!audioId) {
        throw new Error('Sube un archivo de audio para continuar. El guion de texto aún no está disponible.')
      }

      console.log('[ShotCreator] Starting with videoId:', videoId, 'audioId:', audioId, 'initialShotId:', initialShotId)

      // Step 1: Get shot_id
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
            setElapsedLabel(`Procesando video maestro...`)
            await new Promise(r => setTimeout(r, VIDEO_POLL_INTERVAL))
            setProgress(prev => Math.min(prev + 1, 20))
          }
        }

        if (!videoReady || !localShotId) {
          throw new Error('Tiempo de espera agotado para el procesamiento del video')
        }
      }

      // Step 2: Poll shot status until AI training finishes
      setStep('checking_shot')
      setProgress(25)

      let shotReady = false
      attempts = 0
      const SHOT_POLL_INTERVAL = 30_000
      const SHOT_MAX_ATTEMPTS = 120

      while (!shotReady && attempts < SHOT_MAX_ATTEMPTS) {
        const shotStatus = await lipdubApi.getShotStatus(localShotId)
        console.log('[ShotCreator] Shot status poll:', JSON.stringify(shotStatus))

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
          setElapsedLabel('Entrenando modelo de IA con tus movimientos faciales...')
          await new Promise(r => setTimeout(r, SHOT_POLL_INTERVAL))
          setProgress(prev => Math.min(prev + 1, 45))
        }
      }

      if (!shotReady) {
        throw new Error('Tiempo de espera agotado para el entrenamiento de IA')
      }

      // Step 3: Verify audio is ready
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
          setElapsedLabel('Procesando archivo de audio...')
          await new Promise(r => setTimeout(r, AUDIO_POLL_INTERVAL))
          setProgress(prev => Math.min(prev + 1, 60))
        }
      }

      if (!audioReady) {
        throw new Error('Tiempo de espera agotado para el procesamiento del audio')
      }

      // Step 4: Deduct credits
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

      window.dispatchEvent(new Event('credits-updated'))

      // Step 5: Generate video
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

          attempts++
          if (!generateComplete) {
            await new Promise(r => setTimeout(r, GEN_POLL_INTERVAL))
          }
        } catch (err) {
          if (err instanceof Error && err.message === 'La generación del video falló') {
            throw err
          }
          console.warn('[ShotCreator] Generation poll error:', err)
          attempts++
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
          icon: <Film className="w-10 h-10 text-accent animate-pulse" />,
          title: 'Analizando Video Maestro',
          description: 'Extrayendo cuadros y puntos de referencia facial de tu video...',
          detail: 'Nuestro sistema está procesando cada cuadro de tu video para identificar los puntos faciales clave.',
        }
      case 'checking_shot':
        return {
          icon: <Cpu className="w-10 h-10 text-accent animate-spin" />,
          title: 'Entrenando Modelo de IA',
          description: 'La IA está aprendiendo tus expresiones faciales y movimientos labiales...',
          detail: 'Este paso crea un modelo personalizado basado en tu apariencia única. Puede tomar varios minutos.',
        }
      case 'checking_audio':
        return {
          icon: <Music className="w-10 h-10 text-accent animate-pulse" />,
          title: 'Procesando Audio',
          description: 'Analizando la estructura y fonética de tu audio personalizado...',
          detail: 'Preparando los puntos de sincronización entre el audio y los movimientos labiales.',
        }
      case 'deducting_credits':
        return {
          icon: <CreditCard className="w-10 h-10 text-accent animate-pulse" />,
          title: 'Verificando Créditos',
          description: 'Confirmando que tienes créditos suficientes para la generación...',
          detail: null,
        }
      case 'generating':
        return {
          icon: <Wand2 className="w-10 h-10 text-accent animate-pulse" />,
          title: 'Iniciando Generación',
          description: 'Enviando tu proyecto al motor de renderizado de IA...',
          detail: 'Preparando todos los recursos necesarios para la generación final.',
        }
      case 'checking_generate':
        return {
          icon: <Sparkles className="w-10 h-10 text-accent animate-spin" />,
          title: 'Generando Video Final',
          description: generationMessage,
          detail: 'Este proceso toma aproximadamente 30 minutos. Puedes dejar esta página abierta.',
        }
      case 'complete':
        return {
          icon: <CheckCircle className="w-10 h-10 text-green-400" />,
          title: '¡Tu Video Está Listo!',
          description: 'Tu video con IA se ha generado exitosamente.',
          detail: null,
        }
      case 'insufficient_credits':
        return {
          icon: <CreditCard className="w-10 h-10 text-red-400" />,
          title: 'Créditos Insuficientes',
          description: error || 'No tienes suficientes créditos para generar este video.',
          detail: null,
        }
      case 'error':
        return {
          icon: <XCircle className="w-10 h-10 text-red-400" />,
          title: 'Error en la Generación',
          description: error || 'Algo salió mal durante el proceso.',
          detail: null,
        }
    }
  }

  const stepInfo = getStepInfo()
  const shownProgress = displayProgress

  // Format elapsed time for generation phase
  const getElapsedTime = () => {
    if (step !== 'checking_generate' || !generationStartRef.current) return null
    const elapsed = Date.now() - generationStartRef.current
    const mins = Math.floor(elapsed / 60_000)
    const secs = Math.floor((elapsed % 60_000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full">
      <div className="bg-bg-secondary rounded-2xl border border-border p-8 sm:p-10">
        {/* Top section: Icon + Title */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
            {stepInfo.icon}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{stepInfo.title}</h2>
          <p className="text-text-secondary max-w-lg mx-auto">{stepInfo.description}</p>
          {stepInfo.detail && (
            <p className="text-xs text-text-muted mt-3 max-w-md mx-auto">{stepInfo.detail}</p>
          )}
        </div>

        {/* Elapsed time for generation */}
        {step === 'checking_generate' && (
          <div className="text-center mb-6">
            <p className="text-sm text-text-muted">
              Tiempo transcurrido: <span className="text-white font-medium">{getElapsedTime() || '0:00'}</span>
              <span className="text-text-muted ml-2">/ ~30:00 estimado</span>
            </p>
          </div>
        )}

        {/* Long-running notice */}
        {(step === 'checking_shot' || step === 'checking_generate') && (
          <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-xl text-center">
            <Zap className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-sm text-accent font-medium">Procesando con IA</p>
            <p className="text-xs text-text-muted mt-1">
              Puedes dejar esta página abierta — te notificaremos cuando esté listo.
            </p>
          </div>
        )}

        {/* Insufficient credits CTA */}
        {step === 'insufficient_credits' && creditsInfo && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center space-y-3">
            <p className="text-sm text-red-300">
              Necesitas <span className="font-bold text-white">{creditsInfo.needed}</span> créditos pero solo tienes{' '}
              <span className="font-bold text-white">{creditsInfo.remaining.toFixed(2)}</span>.
            </p>
            <Link
              href="/app/subscription"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
            >
              <CreditCard className="w-4 h-4" />
              Comprar más créditos
            </Link>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Progreso general</span>
            <span className="text-white font-semibold">{shownProgress}%</span>
          </div>

          <div className="h-4 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                step === 'error' ? 'bg-red-500' : step === 'complete' ? 'bg-green-500' : 'bg-gradient-to-r from-accent to-accent-secondary'
              }`}
              style={{ width: `${shownProgress}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="mt-8 grid grid-cols-5 gap-3">
          {[
            { label: 'Video', icon: Film, complete: shownProgress >= 20, active: step === 'creating_shot' },
            { label: 'Modelo IA', icon: Cpu, complete: shownProgress >= 45, active: step === 'checking_shot' },
            { label: 'Audio', icon: Music, complete: shownProgress >= 60, active: step === 'checking_audio' },
            { label: 'Generación', icon: Sparkles, complete: shownProgress >= 95, active: step === 'generating' || step === 'checking_generate' },
            { label: 'Listo', icon: CheckCircle, complete: shownProgress >= 100, active: step === 'complete' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="text-center">
                <div className={`
                  w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 transition-all
                  ${item.complete
                    ? 'bg-green-500/20 border border-green-500/30'
                    : item.active
                      ? 'bg-accent/20 border border-accent/30'
                      : 'bg-bg-elevated border border-border'
                  }
                `}>
                  <Icon className={`w-4 h-4 ${
                    item.complete ? 'text-green-400' : item.active ? 'text-accent' : 'text-text-muted'
                  }`} />
                </div>
                <span className={`text-xs font-medium ${
                  item.complete ? 'text-green-400' : item.active ? 'text-accent' : 'text-text-muted'
                }`}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
