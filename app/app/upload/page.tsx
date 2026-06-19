'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import { createClient } from '@/lib/supabase/client'
import { getUserSubscription } from '@/lib/db/queries'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileAudio,
  FolderKanban,
  FolderPlus,
  Library,
  Loader2,
  Play,
  Plus,
  Upload,
  Video,
} from 'lucide-react'

type Campaign = {
  id: string
  name: string
  objective: string | null
  platform: string
}

type Asset = {
  id: string
  campaign_id: string | null
  render_job_id: string | null
  script_id: string | null
  title: string | null
  source_url: string | null
  storage_path: string | null
  public_url: string | null
  duration_sec: number | null
  content_type: string | null
  file_size: number | null
  metadata: Record<string, unknown>
  created_at: string
}

type RenderJob = {
  id: string
  status: string
  progress: number
  output: Record<string, unknown>
  error_message: string | null
  updated_at: string
}

type LibraryData = {
  campaigns: Campaign[]
  assets: Asset[]
}

type FlowMode = 'single' | 'campaign' | ''
type WizardStep = 1 | 2 | 3
type AssetType = 'source_video' | 'audio'

const CREDITS_PER_MINUTE = 5
const MAX_SOURCE_VIDEO_SECONDS = 60
const VIDEO_TOO_LONG_ERROR = 'El video debe durar máximo 1 minuto.'

function getAssetType(asset: Asset) {
  if (asset.metadata?.asset_type) return String(asset.metadata.asset_type)
  if (asset.render_job_id) return 'result_video'
  if (asset.content_type?.startsWith('audio/')) return 'audio'
  return 'source_video'
}

function formatSize(bytes?: number | null) {
  if (!bytes) return 'archivo guardado'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCredits(value: number | null) {
  if (value === null) return 'Cargando...'
  return `${Math.ceil(value)} creditos`
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return 'hasta 1 min'
  if (seconds < 60) return `${Math.ceil(seconds)} seg`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return remaining > 0 ? `${minutes} min ${remaining} seg` : `${minutes} min`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: 'En cola',
    submitted: 'Enviado',
    in_progress: 'Generando',
    completed: 'Completado',
    failed: 'Error',
    cancelled: 'Cancelado',
  }
  return labels[status] ?? status
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_')
}

function getMediaDuration(file: File): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const media = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video')
    media.preload = 'metadata'
    media.onloadedmetadata = () => {
      const duration = Number.isFinite(media.duration) ? media.duration : null
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    media.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la duracion del archivo.'))
    }
    media.src = url
  })
}

async function uploadFileToStorage(file: File, assetType: AssetType) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Inicia sesion para subir recursos.')
  }

  const folder = assetType === 'audio' ? 'audio/' : ''
  const path = `${user.id}/${folder}${Date.now()}-${sanitizeFileName(file.name)}`
  const { data, error } = await supabase.storage
    .from('videos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`No se pudo subir el archivo: ${error.message}`)
  }

  return { path: data.path }
}

function UploadFlowPageWrapper() {
  return (
    <Suspense fallback={<Layout><div className="p-10 text-text-secondary">Cargando...</div></Layout>}>
      <UploadFlowPage />
    </Suspense>
  )
}

export default UploadFlowPageWrapper

function UploadFlowPage() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<WizardStep>(1)
  const [mode, setMode] = useState<FlowMode>('')
  const [campaignId, setCampaignId] = useState('')
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignObjective, setNewCampaignObjective] = useState('')
  const [videoAssetId, setVideoAssetId] = useState('')
  const [audioAssetId, setAudioAssetId] = useState('')
  const [data, setData] = useState<LibraryData>({ campaigns: [], assets: [] })
  const [job, setJob] = useState<RenderJob | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [workingLabel, setWorkingLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creditError, setCreditError] = useState<string | null>(null)

  const loadCredits = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const sub = await getUserSubscription(supabase, user.id)
    setCreditsRemaining(sub ? Number(sub.credits_remaining) : 0)
  }, [])

  const loadLibrary = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/library', { cache: 'no-store' })
      const library = await response.json()
      if (!response.ok) throw new Error(library.error || 'No se pudo cargar tu biblioteca')

      const nextData = {
        campaigns: library.campaigns ?? [],
        assets: library.assets ?? [],
      }
      setData(nextData)

      const campaignFromUrl = searchParams.get('campaign')
      if (campaignFromUrl && nextData.campaigns.some((campaign: Campaign) => campaign.id === campaignFromUrl)) {
        setMode('campaign')
        setCampaignId(campaignFromUrl)
        setStep(2)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el flujo de video')
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    loadLibrary()
    loadCredits()
  }, [loadCredits, loadLibrary])

  useEffect(() => {
    const refresh = () => loadCredits()
    window.addEventListener('credits-updated', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('credits-updated', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [loadCredits])

  useEffect(() => {
    if (!job?.id || ['completed', 'failed', 'cancelled'].includes(job.status)) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render-jobs/${job.id}`, { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.job) {
          setJob(result.job)
          if (result.job.status === 'completed') await loadLibrary()
        }
      } catch {
        // Keep the visible status; the next poll can recover.
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [job?.id, job?.status, loadLibrary])

  const selectedCampaign = data.campaigns.find((campaign) => campaign.id === campaignId) ?? null
  const selectedVideo = data.assets.find((asset) => asset.id === videoAssetId) ?? null
  const selectedAudio = data.assets.find((asset) => asset.id === audioAssetId) ?? null
  const campaignNames = useMemo(
    () => new Map(data.campaigns.map((campaign) => [campaign.id, campaign.name])),
    [data.campaigns],
  )

  const sourceVideos = data.assets.filter((asset) => getAssetType(asset) === 'source_video')
  const audioAssets = data.assets.filter((asset) => ['audio', 'voiceover'].includes(getAssetType(asset)))
  const primaryVideoAssets = mode === 'campaign'
    ? sourceVideos.filter((asset) => asset.campaign_id === campaignId)
    : sourceVideos.filter((asset) => !asset.campaign_id)
  const reusableVideoAssets = mode === 'campaign'
    ? sourceVideos.filter((asset) => asset.campaign_id !== campaignId)
    : sourceVideos.filter((asset) => asset.campaign_id)
  const primaryAudioAssets = mode === 'campaign'
    ? audioAssets.filter((asset) => asset.campaign_id === campaignId)
    : audioAssets.filter((asset) => !asset.campaign_id)
  const reusableAudioAssets = mode === 'campaign'
    ? audioAssets.filter((asset) => asset.campaign_id !== campaignId)
    : audioAssets.filter((asset) => asset.campaign_id)

  const estimatedSeconds = selectedVideo?.duration_sec || MAX_SOURCE_VIDEO_SECONDS
  const estimatedMinutes = Math.max(1, Math.ceil(estimatedSeconds / 60))
  const estimatedCredits = estimatedMinutes * CREDITS_PER_MINUTE
  const destinationLabel = mode === 'campaign'
    ? selectedCampaign?.name ?? 'Campana sin seleccionar'
    : mode === 'single'
      ? 'Biblioteca'
      : 'Sin seleccionar'
  const canGenerate = mode !== '' && (mode === 'single' || !!campaignId) && !!videoAssetId && !!audioAssetId

  function resetSelections() {
    setVideoAssetId('')
    setAudioAssetId('')
    setJob(null)
    setCreditError(null)
  }

  function selectSingleMode() {
    setMode('single')
    setCampaignId('')
    resetSelections()
    setError(null)
  }

  function selectCampaignMode(nextCampaignId = campaignId) {
    setMode('campaign')
    setCampaignId(nextCampaignId)
    resetSelections()
    setError(null)
  }

  function continueFromDestination() {
    setError(null)
    if (mode === 'single') {
      setStep(2)
      return
    }
    if (mode === 'campaign' && campaignId) {
      setStep(2)
      return
    }
    setError('Elige Biblioteca o selecciona una campana antes de continuar.')
  }

  function continueFromVideo() {
    setError(null)
    if (!videoAssetId) {
      setError('Selecciona o sube un video base para continuar.')
      return
    }
    if (selectedVideo?.duration_sec && selectedVideo.duration_sec > MAX_SOURCE_VIDEO_SECONDS) {
      setError(VIDEO_TOO_LONG_ERROR)
      return
    }
    setStep(3)
  }

  async function createNamedCampaign() {
    const name = newCampaignName.trim()
    if (!name) {
      setError('Escribe el nombre de la campana.')
      return
    }

    setIsWorking(true)
    setWorkingLabel('Creando campana...')
    setError(null)
    try {
      const response = await fetch('/api/content/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          objective: newCampaignObjective,
          platform: 'video',
          kind: 'campaign',
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo crear la campana')

      setData((current) => ({ ...current, campaigns: [result.campaign, ...current.campaigns] }))
      setMode('campaign')
      setCampaignId(result.campaign.id)
      resetSelections()
      setNewCampaignName('')
      setNewCampaignObjective('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la campana')
    } finally {
      setIsWorking(false)
      setWorkingLabel('')
    }
  }

  async function createAssetFromFile(file: File, assetType: AssetType) {
    if (mode === 'campaign' && !campaignId) {
      setError('Selecciona una campana antes de subir recursos a campana.')
      return
    }
    if (assetType === 'source_video' && !file.type.startsWith('video/')) {
      setError('Sube un archivo de video valido.')
      return
    }
    if (assetType === 'audio' && !file.type.startsWith('audio/')) {
      setError('Sube un archivo de audio valido.')
      return
    }

    setIsWorking(true)
    setWorkingLabel(assetType === 'source_video' ? 'Subiendo video...' : 'Subiendo audio...')
    setError(null)
    setCreditError(null)
    try {
      const duration = assetType === 'source_video' ? await getMediaDuration(file) : null
      if (assetType === 'source_video' && duration && duration > MAX_SOURCE_VIDEO_SECONDS) {
        throw new Error(VIDEO_TOO_LONG_ERROR)
      }

      const upload = await uploadFileToStorage(file, assetType)
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: assetType,
          campaign_id: mode === 'campaign' ? campaignId : null,
          title: file.name,
          storage_path: upload.path,
          content_type: file.type,
          file_size: file.size,
          duration_sec: assetType === 'source_video' ? Math.ceil(duration || MAX_SOURCE_VIDEO_SECONDS) : null,
          metadata: {
            original_file_name: file.name,
            storage_bucket: 'videos',
          },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el recurso')

      setData((current) => ({ ...current, assets: [result.asset, ...current.assets] }))
      if (assetType === 'source_video') setVideoAssetId(result.asset.id)
      if (assetType === 'audio') setAudioAssetId(result.asset.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el recurso')
    } finally {
      setIsWorking(false)
      setWorkingLabel('')
    }
  }

  async function launchRenderJob() {
    if (!canGenerate) {
      setError('Selecciona destino, video y audio antes de generar.')
      return
    }
    if (selectedVideo?.duration_sec && selectedVideo.duration_sec > MAX_SOURCE_VIDEO_SECONDS) {
      setError(VIDEO_TOO_LONG_ERROR)
      return
    }

    const jobCampaignId = mode === 'campaign' ? campaignId : null
    setIsWorking(true)
    setWorkingLabel('Validando creditos...')
    setError(null)
    setCreditError(null)
    try {
      const deductResponse = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits_to_deduct: estimatedCredits }),
      })
      const deductData = await deductResponse.json().catch(() => null)
      if (!deductResponse.ok) {
        if (deductResponse.status === 402) {
          setCreditError(`Necesitas ${Math.ceil(Number(deductData?.credits_needed ?? estimatedCredits))} creditos. Tu balance actual es ${Math.floor(Number(deductData?.credits_remaining ?? 0))} creditos.`)
          return
        }
        throw new Error(deductData?.error || 'No se pudieron validar los creditos')
      }

      if (Number.isFinite(Number(deductData?.credits_remaining))) {
        setCreditsRemaining(Number(deductData.credits_remaining))
      }

      setWorkingLabel('Lanzando generacion...')
      const response = await fetch('/api/render-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `create-video-${jobCampaignId ?? 'library'}-${videoAssetId}-${audioAssetId}-${Date.now()}`,
        },
        body: JSON.stringify({
          provider: 'mock',
          provider_model: 'video-generation-v1',
          campaign_id: jobCampaignId,
          master_video_asset_id: videoAssetId,
          audio_asset_id: audioAssetId,
          credits_reserved: estimatedCredits,
          input: {
            title: `${destinationLabel} - ${selectedVideo?.title ?? 'video base'}`,
            master_video_asset_id: videoAssetId,
            source_video_asset_id: videoAssetId,
            audio_asset_id: audioAssetId,
            source_video_duration_sec: estimatedSeconds,
            mock_duration_ms: 70_000,
          },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo lanzar el video')

      setJob(result.job)
      window.dispatchEvent(new Event('credits-updated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo lanzar el video')
    } finally {
      setIsWorking(false)
      setWorkingLabel('')
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-accent">Crear video</p>
            <h1 className="mt-2 text-3xl font-semibold text-text-primary">Elige destino, video base y audio.</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary">
              Crea un video unico para Biblioteca o genera dentro de una campana sin perder la opcion de reutilizar recursos existentes.
            </p>
          </div>
          <Link href="/app/content" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
            <FolderKanban className="h-4 w-4" />
            Ver campanas
          </Link>
        </div>

        {error && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-border bg-bg-secondary p-12 text-center text-text-secondary">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-accent" />
            Cargando tu espacio...
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              <StepProgress step={step} />

              <div className="overflow-hidden rounded-xl border border-border bg-bg-secondary shadow-sm">
                <div className="transition-all duration-300 ease-out">
                  {step === 1 && (
                    <DestinationStep
                      mode={mode}
                      campaigns={data.campaigns}
                      campaignId={campaignId}
                      selectedCampaign={selectedCampaign}
                      newCampaignName={newCampaignName}
                      newCampaignObjective={newCampaignObjective}
                      isWorking={isWorking}
                      onSingle={selectSingleMode}
                      onCampaign={() => selectCampaignMode(campaignId)}
                      onCampaignChange={(id) => selectCampaignMode(id)}
                      onNewCampaignName={setNewCampaignName}
                      onNewCampaignObjective={setNewCampaignObjective}
                      onCreateCampaign={createNamedCampaign}
                      onNext={continueFromDestination}
                    />
                  )}

                  {step === 2 && (
                    <AssetStep
                      number="2"
                      title="Selecciona el video base"
                      description={mode === 'campaign'
                        ? 'Primero mostramos los videos de la campana. Tambien puedes usar videos de Biblioteca u otras campanas.'
                        : 'Elige un video de Biblioteca, reutiliza uno de una campana o sube uno nuevo para este video unico.'}
                      icon={Video}
                      primaryTitle={mode === 'campaign' ? 'En esta campana' : 'Biblioteca'}
                      secondaryTitle={mode === 'campaign' ? 'Reutilizar de Biblioteca u otras campanas' : 'Reutilizar de campanas'}
                      emptyText={mode === 'campaign' ? 'Esta campana todavia no tiene videos.' : 'Biblioteca todavia no tiene videos.'}
                      accept="video/*"
                      uploadLabel={mode === 'campaign' ? 'Subir video a esta campana' : 'Subir video a Biblioteca'}
                      primaryAssets={primaryVideoAssets}
                      secondaryAssets={reusableVideoAssets}
                      selectedAssetId={videoAssetId}
                      campaignNames={campaignNames}
                      isWorking={isWorking}
                      onSelect={setVideoAssetId}
                      onFile={(file) => createAssetFromFile(file, 'source_video')}
                      onBack={() => setStep(1)}
                      onNext={continueFromVideo}
                    />
                  )}

                  {step === 3 && (
                    <AssetStep
                      number="3"
                      title="Selecciona el audio"
                      description={mode === 'campaign'
                        ? 'Elige el audio de esta campana o reutiliza una narracion guardada en otro lugar.'
                        : 'Elige o sube el audio requerido para generar este video unico en Biblioteca.'}
                      icon={FileAudio}
                      primaryTitle={mode === 'campaign' ? 'En esta campana' : 'Biblioteca'}
                      secondaryTitle={mode === 'campaign' ? 'Reutilizar de Biblioteca u otras campanas' : 'Reutilizar de campanas'}
                      emptyText={mode === 'campaign' ? 'Esta campana todavia no tiene audios.' : 'Biblioteca todavia no tiene audios.'}
                      accept="audio/*"
                      uploadLabel={mode === 'campaign' ? 'Subir audio a esta campana' : 'Subir audio a Biblioteca'}
                      primaryAssets={primaryAudioAssets}
                      secondaryAssets={reusableAudioAssets}
                      selectedAssetId={audioAssetId}
                      campaignNames={campaignNames}
                      isWorking={isWorking}
                      onSelect={setAudioAssetId}
                      onFile={(file) => createAssetFromFile(file, 'audio')}
                      onBack={() => setStep(2)}
                    />
                  )}
                </div>
              </div>
            </div>

            <SummaryPanel
              destination={destinationLabel}
              selectedVideo={selectedVideo}
              selectedAudio={selectedAudio}
              estimatedCredits={estimatedCredits}
              creditsRemaining={creditsRemaining}
              creditError={creditError}
              job={job}
              isWorking={isWorking}
              workingLabel={workingLabel}
              canGenerate={canGenerate}
              onGenerate={launchRenderJob}
            />
          </div>
        )}
      </div>
    </Layout>
  )
}

function StepProgress({ step }: { step: WizardStep }) {
  const items = [
    { number: 1, label: 'Destino' },
    { number: 2, label: 'Video' },
    { number: 3, label: 'Audio' },
  ] as const

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {items.map((item) => {
        const active = step === item.number
        const complete = step > item.number
        return (
          <div
            key={item.number}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
              active || complete
                ? 'border-accent/30 bg-accent/10 text-text-primary'
                : 'border-border bg-white text-text-muted'
            }`}
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
              complete ? 'bg-accent text-white' : active ? 'bg-white text-accent ring-1 ring-accent/30' : 'bg-bg-elevated text-text-muted'
            }`}>
              {complete ? <Check className="h-3.5 w-3.5" /> : item.number}
            </span>
            <span className="font-semibold">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function DestinationStep({
  mode,
  campaigns,
  campaignId,
  selectedCampaign,
  newCampaignName,
  newCampaignObjective,
  isWorking,
  onSingle,
  onCampaign,
  onCampaignChange,
  onNewCampaignName,
  onNewCampaignObjective,
  onCreateCampaign,
  onNext,
}: {
  mode: FlowMode
  campaigns: Campaign[]
  campaignId: string
  selectedCampaign: Campaign | null
  newCampaignName: string
  newCampaignObjective: string
  isWorking: boolean
  onSingle: () => void
  onCampaign: () => void
  onCampaignChange: (id: string) => void
  onNewCampaignName: (value: string) => void
  onNewCampaignObjective: (value: string) => void
  onCreateCampaign: () => void
  onNext: () => void
}) {
  return (
    <section className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">Paso 1</p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">Elige donde guardar este video</h2>
          <p className="mt-1 text-sm text-text-muted">
            Biblioteca guarda videos unicos sin campana. Campana mantiene el resultado conectado a esa carpeta.
          </p>
        </div>
        {selectedCampaign && mode === 'campaign' && (
          <div className="rounded-lg border border-accent/25 bg-accent/10 px-4 py-3 text-sm text-text-primary">
            Campana activa: <span className="font-semibold">{selectedCampaign.name}</span>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <button
          onClick={onSingle}
          disabled={isWorking}
          className={`rounded-xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 ${mode === 'single' ? 'border-accent bg-accent/10 ring-4 ring-accent/10' : 'border-border bg-white'}`}
        >
          <Library className="h-5 w-5 text-accent" />
          <h3 className="mt-3 font-semibold text-text-primary">Crear video unico</h3>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            El resultado y los recursos nuevos se guardan en Biblioteca sin enlace a campanas.
          </p>
        </button>

        <div className={`rounded-xl border p-5 ${mode === 'campaign' ? 'border-accent bg-accent/10 ring-4 ring-accent/10' : 'border-border bg-white'}`}>
          <button onClick={onCampaign} disabled={isWorking} className="flex items-center gap-2 text-left font-semibold text-text-primary disabled:opacity-60">
            <FolderPlus className="h-5 w-5 text-accent" />
            Crear video para campana
          </button>
          <select
            value={campaignId}
            onChange={(event) => onCampaignChange(event.target.value)}
            className="mt-4 w-full rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
          >
            <option value="">Selecciona una campana existente</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={newCampaignName}
              onChange={(event) => onNewCampaignName(event.target.value)}
              placeholder="Nueva campana"
              className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
            <input
              value={newCampaignObjective}
              onChange={(event) => onNewCampaignObjective(event.target.value)}
              placeholder="Objetivo"
              className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
            <button
              onClick={onCreateCampaign}
              disabled={isWorking}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Crear
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={isWorking || !mode || (mode === 'campaign' && !campaignId)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}

function AssetStep({
  number,
  title,
  description,
  icon: Icon,
  primaryTitle,
  secondaryTitle,
  emptyText,
  accept,
  uploadLabel,
  primaryAssets,
  secondaryAssets,
  selectedAssetId,
  campaignNames,
  isWorking,
  onSelect,
  onFile,
  onBack,
  onNext,
}: {
  number: string
  title: string
  description: string
  icon: React.ElementType
  primaryTitle: string
  secondaryTitle: string
  emptyText: string
  accept: string
  uploadLabel: string
  primaryAssets: Asset[]
  secondaryAssets: Asset[]
  selectedAssetId: string
  campaignNames: Map<string, string>
  isWorking: boolean
  onSelect: (id: string) => void
  onFile: (file: File) => void
  onBack: () => void
  onNext?: () => void
}) {
  return (
    <section className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-accent">Paso {number}</p>
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          </div>
        </div>
        <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover ${isWorking ? 'pointer-events-none opacity-50' : ''}`}>
          <Upload className="h-4 w-4" />
          {uploadLabel}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={isWorking}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onFile(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      <AssetGroup
        title={primaryTitle}
        assets={primaryAssets}
        selectedAssetId={selectedAssetId}
        campaignNames={campaignNames}
        emptyText={emptyText}
        onSelect={onSelect}
      />

      {secondaryAssets.length > 0 && (
        <AssetGroup
          title={secondaryTitle}
          assets={secondaryAssets}
          selectedAssetId={selectedAssetId}
          campaignNames={campaignNames}
          emptyText=""
          onSelect={onSelect}
        />
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          onClick={onBack}
          disabled={isWorking}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Atras
        </button>
        {onNext && (
          <button
            onClick={onNext}
            disabled={isWorking || !selectedAssetId}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  )
}

function AssetGroup({
  title,
  assets,
  selectedAssetId,
  campaignNames,
  emptyText,
  onSelect,
}: {
  title: string
  assets: Asset[]
  selectedAssetId: string
  campaignNames: Map<string, string>
  emptyText: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {assets.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-bg-elevated/60 p-5 text-sm text-text-muted">
          {emptyText}
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              selected={selectedAssetId === asset.id}
              campaignName={asset.campaign_id ? campaignNames.get(asset.campaign_id) ?? 'Otra campana' : 'Biblioteca'}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AssetCard({ asset, selected, campaignName, onSelect }: { asset: Asset; selected: boolean; campaignName: string; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(asset.id)}
      className={`rounded-lg border p-4 text-left transition hover:border-accent hover:shadow-sm ${selected ? 'border-accent bg-accent/10 ring-4 ring-accent/10' : 'border-border bg-white'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-text-primary">{asset.title || 'Recurso sin nombre'}</p>
          <p className="mt-1 text-xs text-text-muted">{campaignName}</p>
        </div>
        {selected && <Check className="h-4 w-4 shrink-0 text-accent" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
        <span>{formatSize(asset.file_size)}</span>
        {getAssetType(asset) === 'source_video' && <span>{formatDuration(asset.duration_sec)}</span>}
      </div>
    </button>
  )
}

function SummaryPanel({
  destination,
  selectedVideo,
  selectedAudio,
  estimatedCredits,
  creditsRemaining,
  creditError,
  job,
  isWorking,
  workingLabel,
  canGenerate,
  onGenerate,
}: {
  destination: string
  selectedVideo: Asset | null
  selectedAudio: Asset | null
  estimatedCredits: number
  creditsRemaining: number | null
  creditError: string | null
  job: RenderJob | null
  isWorking: boolean
  workingLabel: string
  canGenerate: boolean
  onGenerate: () => void
}) {
  return (
    <aside className="h-fit rounded-xl border border-border bg-bg-secondary p-5 shadow-sm xl:sticky xl:top-6">
      <h2 className="text-lg font-semibold text-text-primary">Resumen</h2>
      <div className="mt-4 space-y-3 text-sm">
        <SummaryRow label="Destino" value={destination} />
        <SummaryRow label="Video" value={selectedVideo?.title ?? 'Sin seleccionar'} detail={selectedVideo ? formatDuration(selectedVideo.duration_sec) : undefined} />
        <SummaryRow label="Audio" value={selectedAudio?.title ?? 'Sin seleccionar'} />
        <SummaryRow label="Creditos estimados" value={formatCredits(estimatedCredits)} />
        <SummaryRow label="Creditos restantes" value={formatCredits(creditsRemaining)} />
      </div>

      {creditError && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {creditError}
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={isWorking || !canGenerate}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
      >
        {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isWorking ? workingLabel || 'Trabajando...' : 'Generar video'}
      </button>

      {!canGenerate && (
        <p className="mt-3 text-xs leading-5 text-text-muted">
          Necesitas destino, video base y audio para generar.
        </p>
      )}

      {job && (
        <div className="mt-5 rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2">
            {job.status === 'completed' ? <Check className="h-4 w-4 text-green-700" /> : <Clock3 className="h-4 w-4 text-accent" />}
            <p className="font-semibold text-text-primary">{statusLabel(job.status)}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
            <div className="h-full rounded-full bg-accent" style={{ width: `${job.progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-text-muted">{job.progress}% completado. Tambien puedes verlo desde Inicio.</p>
          {job.status === 'completed' && (
            <Link href="/app/library" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
              <CheckCircle2 className="h-4 w-4" />
              Ver en Biblioteca
            </Link>
          )}
        </div>
      )}
    </aside>
  )
}

function SummaryRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-xs uppercase text-text-muted">{label}</p>
      <p className="mt-1 truncate font-semibold text-text-primary">{value}</p>
      {detail && <p className="mt-1 text-xs text-text-muted">{detail}</p>}
    </div>
  )
}
