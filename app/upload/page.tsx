'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import VideoUpload from '@/components/upload/VideoUpload'
import VideoPreview from '@/components/upload/VideoPreview'
import AudioUploadEnhanced from '@/components/upload/AudioUploadEnhanced'
import ShotCreator from '@/components/upload/ShotCreator'
import VideoDownload from '@/components/upload/VideoDownload'
import StepProgress from '@/components/personalize/StepProgress'
import { lipdubApi, type VideoUploadResponse } from '@/lib/lipdub-api'
import { createClient } from '@/lib/supabase/client'
import { getProjectDraft, getUserSubscription } from '@/lib/db/queries'
import { CreditCard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type FlowStep = 'video' | 'audio' | 'creating' | 'complete'

interface FlowState {
  videoFile: File | null
  videoUpload: VideoUploadResponse | null
  audioId: string | null
  scriptText: string | null
  shotId: number | null
  generateId: string | null
}

function stepToNumber(step: FlowStep): number {
  switch (step) {
    case 'video': return 1
    case 'audio': return 2
    case 'creating': return 3
    case 'complete': return 4
    default: return 1
  }
}

function numberToStep(n: number): FlowStep {
  switch (n) {
    case 1: return 'video'
    case 2: return 'audio'
    case 3: return 'creating'
    case 4: return 'complete'
    default: return 'video'
  }
}

async function saveDraft(
  projectId: string,
  payload: {
    video?: Record<string, unknown>
    audio?: Record<string, unknown>
    generation?: Record<string, unknown>
    status?: string
  }
) {
  try {
    await fetch(`/api/projects/${projectId}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('Draft save failed:', err)
  }
}

export default function UploadFlowPageWrapper() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex items-center justify-center h-64 text-text-secondary">
          Cargando...
        </div>
      </Layout>
    }>
      <UploadFlowPage />
    </Suspense>
  )
}

function UploadFlowPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = searchParams.get('project')
  const nameFromUrl = searchParams.get('name')

  const [currentStep, setCurrentStep] = useState<FlowStep>('video')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>(nameFromUrl || 'Jaime AI Project')
  const [loadingDraft, setLoadingDraft] = useState(!!projectId)
  const [draftVideoName, setDraftVideoName] = useState<string | null>(null)
  const [creditCheckLoading, setCreditCheckLoading] = useState(false)
  const [insufficientCredits, setInsufficientCredits] = useState(false)
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const [state, setState] = useState<FlowState>({
    videoFile: null,
    videoUpload: null,
    audioId: null,
    scriptText: null,
    shotId: null,
    generateId: null,
  })

  const stateRef = useRef(state)
  const projectIdRef = useRef(projectId)
  stateRef.current = state
  projectIdRef.current = projectId

  // ── Redirect if no project ID ──────────────────────────
  useEffect(() => {
    if (!projectId) {
      router.replace('/?openCreate=1')
    }
  }, [projectId, router])

  // ── Load draft on mount ────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    const load = async () => {
      try {
        const supabase = createClient()
        const draft = await getProjectDraft(supabase, projectId)
        if (!draft) {
          setLoadingDraft(false)
          return
        }
        setProjectName(draft.project.name)

        if (draft.video?.lipdub_video_id) {
          setState(prev => ({
            ...prev,
            videoUpload: {
              project_id: draft.video!.lipdub_project_id ?? 0,
              scene_id: draft.video!.lipdub_scene_id ?? 0,
              actor_id: draft.video!.lipdub_actor_id ?? 0,
              video_id: draft.video!.lipdub_video_id!,
              upload_url: '',
              success_url: '',
              failure_url: '',
            },
          }))
          setDraftVideoName(draft.video.file_name || 'video.mp4')
          setUploadProgress(100)

          // Restore generation state if available (completed or processing)
          if (draft.generation?.shot_id && draft.generation?.generate_id) {
            const genStatus = draft.generation.status
            setState(prev => ({
              ...prev,
              audioId: draft.audio?.audio_id ?? null,
              shotId: draft.generation!.shot_id!,
              generateId: draft.generation!.generate_id!,
            }))
            if (genStatus === 'completed') {
              setCurrentStep('complete')
            } else {
              setCurrentStep('creating')
            }
          } else if (draft.audio?.audio_id) {
            setState(prev => ({
              ...prev,
              audioId: draft.audio!.audio_id,
            }))
            // Check credits before resuming creation step
            const sub = await getUserSubscription(supabase, (await supabase.auth.getUser()).data.user!.id)
            const remaining = sub ? Number(sub.credits_remaining) : 0
            setUserCredits(remaining)
            if (remaining < 5) {
              setInsufficientCredits(true)
            }
            setCurrentStep('creating')
          } else {
            setCurrentStep('audio')
          }
        }
      } catch (err) {
        console.warn('Could not load draft:', err)
      } finally {
        setLoadingDraft(false)
      }
    }
    load()
  }, [projectId])

  // ── Save draft on unmount / leave ──────────────────────
  const saveDraftOnLeave = useCallback(() => {
    const pid = projectIdRef.current
    const s = stateRef.current
    if (!pid) return
    if (!s.videoUpload && !s.audioId) return

    const payload: Record<string, unknown> = { status: 'draft' }
    if (s.videoUpload) {
      payload.video = {
        lipdub_project_id: s.videoUpload.project_id,
        lipdub_scene_id: s.videoUpload.scene_id,
        lipdub_actor_id: s.videoUpload.actor_id,
        lipdub_video_id: s.videoUpload.video_id,
        upload_status: 'completed',
      }
    }
    if (s.audioId) {
      payload.audio = { audio_id: s.audioId, upload_status: 'completed' }
    }
    if (s.shotId && s.generateId) {
      payload.generation = {
        shot_id: s.shotId,
        generate_id: s.generateId,
        status: 'processing',
      }
    }

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    navigator.sendBeacon(`/api/projects/${pid}/draft`, blob)
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => saveDraftOnLeave()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveDraftOnLeave()
    }
  }, [saveDraftOnLeave])

  // ── Persist video after upload ─────────────────────────
  const persistVideoToDraft = useCallback(
    (upload: VideoUploadResponse, file: File) => {
      if (!projectId) return
      saveDraft(projectId, {
        video: {
          lipdub_project_id: upload.project_id,
          lipdub_scene_id: upload.scene_id,
          lipdub_actor_id: upload.actor_id,
          lipdub_video_id: upload.video_id,
          file_name: file.name,
          file_size: file.size,
          upload_status: 'completed',
        },
        status: 'draft',
      })
    },
    [projectId]
  )

  // ── Persist audio after completion ─────────────────────
  const persistAudioToDraft = useCallback(
    (audioId: string) => {
      if (!projectId) return
      saveDraft(projectId, {
        audio: {
          audio_id: audioId,
          upload_status: 'completed',
        },
        status: 'draft',
      })
    },
    [projectId]
  )

  // ── Handle video upload ────────────────────────────────
  const handleVideoUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(10)
    setUploadError(null)

    try {
      const upload = await lipdubApi.initiateVideoUpload({
        file_name: file.name,
        content_type: file.type,
        project_name: projectName,
        scene_name: 'Scene 1',
        actor_name: 'Actor',
      })

      setState(prev => ({ ...prev, videoUpload: upload, videoFile: file }))
      setUploadProgress(30)

      await lipdubApi.uploadFileToUrl(upload.upload_url, file)
      setUploadProgress(50)

      // Call success callback — captures shot_id if returned
      let shotIdFromCallback: number | null = null
      try {
        const successResult = await lipdubApi.notifyUploadSuccess(upload.success_url)
        console.log('[Upload] Video success callback result:', JSON.stringify(successResult))
        if (successResult.shot_id) {
          shotIdFromCallback = successResult.shot_id
          setState(prev => ({ ...prev, shotId: shotIdFromCallback }))
        }
      } catch (callbackErr) {
        console.warn('Success callback failed, continuing anyway:', callbackErr)
      }
      setUploadProgress(70)

      // Persist to draft immediately
      persistVideoToDraft(upload, file)

      // If we got shot_id from callback, skip polling and go directly to audio step
      if (shotIdFromCallback) {
        setUploadProgress(100)
        setIsUploading(false)
        setCurrentStep('audio')
        return
      }

      // Otherwise poll for video processing completion
      let attempts = 0
      const VIDEO_POLL_INTERVAL = 30_000
      const VIDEO_MAX_ATTEMPTS = 60
      const interval = setInterval(async () => {
        attempts++
        try {
          const videoStatus = await lipdubApi.getVideoStatus(upload.video_id)
          if (videoStatus.upload_status === 'completed') {
            clearInterval(interval)
            if (videoStatus.shot_id) {
              setState(prev => ({ ...prev, shotId: videoStatus.shot_id }))
            }
            setUploadProgress(100)
            setIsUploading(false)
            setCurrentStep('audio')
            return
          }
        } catch {
          // still processing
        }
        setUploadProgress(prev => Math.min(prev + 1, 95))
        if (attempts >= VIDEO_MAX_ATTEMPTS) {
          clearInterval(interval)
          setIsUploading(false)
          setCurrentStep('audio')
        }
      }, VIDEO_POLL_INTERVAL)
    } catch (err) {
      console.error('Video upload failed:', err)
      const message = err instanceof Error ? err.message : 'Error desconocido al subir el video'
      setUploadError(message)
      setIsUploading(false)

      if (projectId) {
        saveDraft(projectId, { status: 'draft' })
      }
    }
  }

  // ── Credit gate — check before entering creation step ──
  const CREDITS_REQUIRED = 5 // CREDITS_PER_MINUTE * DEFAULT_VIDEO_MINUTES

  const checkCreditsAndProceed = useCallback(async (): Promise<boolean> => {
    setCreditCheckLoading(true)
    setInsufficientCredits(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCreditCheckLoading(false)
        return false
      }
      const sub = await getUserSubscription(supabase, user.id)
      const remaining = sub ? Number(sub.credits_remaining) : 0
      setUserCredits(remaining)

      if (remaining < CREDITS_REQUIRED) {
        setInsufficientCredits(true)
        setCreditCheckLoading(false)
        return false
      }
      setCreditCheckLoading(false)
      return true
    } catch {
      setCreditCheckLoading(false)
      return true // allow through on fetch error; ShotCreator will double-check
    }
  }, [])

  // ── Handle audio completion ────────────────────────────
  const handleAudioComplete = async (audioId: string, scriptText?: string) => {
    setState(prev => ({
      ...prev,
      audioId: audioId || null,
      scriptText: scriptText || null,
    }))
    persistAudioToDraft(audioId)

    await checkCreditsAndProceed()
    // Always move to 'creating' step — it will show the credit gate or ShotCreator
    setCurrentStep('creating')
  }

  // ── Handle shot creation ───────────────────────────────
  const handleShotComplete = (shotId: number, generateId: string) => {
    setState(prev => ({ ...prev, shotId, generateId }))
    if (projectId) {
      saveDraft(projectId, {
        status: 'completed',
        generation: {
          shot_id: shotId,
          generate_id: generateId,
          status: 'completed',
        },
      })
    }
    setCurrentStep('complete')
  }

  // ── Handle errors ──────────────────────────────────────
  const handleError = (error: string) => {
    console.error('Flow error:', error)
    if (projectId) {
      saveDraft(projectId, { status: 'draft' })
    }
  }

  // ── Step navigation ────────────────────────────────────
  const getReachableSteps = (): number[] => {
    const reachable = [1]
    if (state.videoUpload) reachable.push(2)
    if (state.videoUpload && (state.audioId || state.scriptText)) reachable.push(3)
    if (state.shotId) reachable.push(4)
    return reachable
  }

  const handleStepClick = async (stepNumber: number) => {
    const reachable = getReachableSteps()
    if (!reachable.includes(stepNumber)) return
    const targetStep = numberToStep(stepNumber)

    if (targetStep === 'creating') {
      const hasCredits = await checkCreditsAndProceed()
      if (!hasCredits) {
        setCurrentStep('creating') // show the insufficient credits UI
        return
      }
    }
    setCurrentStep(targetStep)
  }

  // ── Render steps ───────────────────────────────────────
  const videoFileName = state.videoFile?.name || draftVideoName || 'video.mp4'
  const videoFileSize = state.videoFile?.size

  const renderStep = () => {
    switch (currentStep) {
      case 'video':
        return (
          <VideoUpload
            onUpload={handleVideoUpload}
            onContinue={() => setCurrentStep('audio')}
            onCancel={() => router.push('/')}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadComplete={state.videoUpload !== null && !isUploading && uploadProgress >= 100}
            error={uploadError}
            onRetry={() => {
              setUploadError(null)
              setUploadProgress(0)
              setState(prev => ({ ...prev, videoUpload: null, videoFile: null }))
              setDraftVideoName(null)
            }}
          />
        )

      case 'audio':
        return (
          <div className="space-y-6">
            <VideoPreview
              filename={videoFileName}
              duration="Processing..."
              size={videoFileSize ? `${(videoFileSize / (1024 * 1024)).toFixed(2)} MB` : 'Uploaded'}
              onDelete={() => {
                setState({
                  videoFile: null,
                  videoUpload: null,
                  audioId: null,
                  scriptText: null,
                  shotId: null,
                  generateId: null,
                })
                setDraftVideoName(null)
                setCurrentStep('video')
              }}
            />

            <AudioUploadEnhanced
              videoId={state.videoUpload?.video_id || ''}
              onComplete={handleAudioComplete}
              onCancel={() => setCurrentStep('video')}
            />
          </div>
        )

      case 'creating':
        if (creditCheckLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-3">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Verificando créditos...</p>
            </div>
          )
        }

        if (insufficientCredits) {
          return (
            <div className="bg-bg-secondary rounded-2xl border border-border p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Créditos insuficientes</h3>
              <p className="text-text-secondary text-sm max-w-md mx-auto">
                Necesitas al menos <span className="font-bold text-white">{CREDITS_REQUIRED}</span> créditos para generar un video.
                {userCredits !== null && (
                  <> Tu balance actual es <span className="font-bold text-white">{userCredits.toFixed(2)}</span> créditos.</>
                )}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href="/subscription"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Comprar créditos
                </Link>
                <button
                  onClick={async () => {
                    const ok = await checkCreditsAndProceed()
                    if (ok) setCurrentStep('creating')
                  }}
                  className="px-5 py-2.5 rounded-lg border border-border text-text-secondary hover:text-white hover:border-border/80 text-sm font-medium transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )
        }

        return (
          <ShotCreator
            videoId={state.videoUpload?.video_id || ''}
            audioId={state.audioId || undefined}
            scriptText={state.scriptText || undefined}
            projectId={projectId || undefined}
            initialShotId={state.shotId}
            onComplete={handleShotComplete}
            onError={handleError}
          />
        )

      case 'complete':
        return (
          <VideoDownload
            shotId={state.shotId || 0}
            generateId={state.generateId || ''}
            filename={`jaime_video_${Date.now()}.mp4`}
          />
        )

      default:
        return null
    }
  }

  const customSteps = [
    { number: 1, label: 'Crear Proyecto', icon: () => null },
    { number: 2, label: 'Video Maestro', icon: () => null },
    { number: 3, label: 'Audio Personalizado', icon: () => null },
    { number: 4, label: 'Ver Video Final', icon: () => null },
  ]

  if (!projectId) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-text-secondary">
          Redirigiendo...
        </div>
      </Layout>
    )
  }

  if (loadingDraft) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-text-secondary">
          Cargando borrador del proyecto...
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">{projectName}</h1>
          <p className="text-sm text-text-secondary mt-1">Personalizar video</p>
        </div>

        <StepProgress
          currentStep={stepToNumber(currentStep)}
          steps={customSteps}
          reachableSteps={getReachableSteps()}
          onStepClick={handleStepClick}
        />

        <div className="mt-8">
          {renderStep()}
        </div>
      </div>
    </Layout>
  )
}
