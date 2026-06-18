'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileAudio,
  FileText,
  FolderPlus,
  Loader2,
  Mic,
  PenLine,
  Play,
  Upload,
  Video,
  Wand2,
} from 'lucide-react'

type Campaign = {
  id: string
  name: string
  objective: string | null
  platform: string
}

type Script = {
  id: string
  campaign_id: string
  title: string | null
  full_script: string
  duration_target_sec: number
  status: string
}

type Asset = {
  id: string
  campaign_id: string | null
  script_id: string | null
  title: string | null
  public_url: string | null
  duration_sec: number | null
  content_type: string | null
  file_size: number | null
  metadata: Record<string, unknown>
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
  scripts: Script[]
  assets: Asset[]
}

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7
type VideoMode = 'single' | 'campaign'

const CREDITS_PER_MINUTE = 5

const steps: Array<{ id: StepId; label: string; icon: React.ElementType }> = [
  { id: 1, label: 'Tipo', icon: Play },
  { id: 2, label: 'Campana', icon: FolderPlus },
  { id: 3, label: 'Guion', icon: FileText },
  { id: 4, label: 'Video fuente', icon: Video },
  { id: 5, label: 'Voz / audio', icon: Mic },
  { id: 6, label: 'Revision', icon: CheckCircle2 },
  { id: 7, label: 'Resultado', icon: Wand2 },
]

function getAssetType(asset: Asset) {
  return String(asset.metadata?.asset_type ?? 'source_video')
}

function formatSize(bytes?: number | null) {
  if (!bytes) return 'archivo guardado'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    queued: 'Preparando',
    submitted: 'Enviado',
    in_progress: 'Generando video',
    completed: 'Listo',
    failed: 'Error',
    cancelled: 'Cancelado',
  }
  return labels[status] ?? status
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<StepId>(1)
  const [videoMode, setVideoMode] = useState<VideoMode>('single')
  const [campaignId, setCampaignId] = useState('')
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignObjective, setNewCampaignObjective] = useState('')
  const [scriptId, setScriptId] = useState('')
  const [manualScript, setManualScript] = useState('')
  const [manualScriptTitle, setManualScriptTitle] = useState('')
  const [videoAssetId, setVideoAssetId] = useState('')
  const [audioAssetId, setAudioAssetId] = useState('')
  const [job, setJob] = useState<RenderJob | null>(null)
  const [data, setData] = useState<LibraryData>({ campaigns: [], scripts: [], assets: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditError, setCreditError] = useState<string | null>(null)

  async function loadLibrary() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/library', { cache: 'no-store' })
      const library = await response.json()
      if (!response.ok) throw new Error(library.error || 'No se pudo cargar tu espacio')

      const nextData = {
        campaigns: library.campaigns ?? [],
        scripts: library.scripts ?? [],
        assets: library.assets ?? [],
      }
      setData(nextData)

      const campaignFromUrl = searchParams.get('campaign')
      const scriptFromUrl = searchParams.get('script')

      if (campaignFromUrl && nextData.campaigns.some((campaign: Campaign) => campaign.id === campaignFromUrl)) {
        setVideoMode('campaign')
        setCampaignId(campaignFromUrl)
        setCurrentStep(scriptFromUrl ? 3 : 2)
      }
      if (scriptFromUrl && nextData.scripts.some((script: Script) => script.id === scriptFromUrl)) {
        const selectedScript = nextData.scripts.find((script: Script) => script.id === scriptFromUrl)
        setScriptId(scriptFromUrl)
        if (selectedScript?.campaign_id) setCampaignId(selectedScript.campaign_id)
        setCurrentStep(4)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el flujo de video')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render-jobs/${job.id}`, { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.job) {
          setJob(result.job)
          if (result.job.status === 'completed') {
            await loadLibrary()
          }
        }
      } catch {
        // Keep the current state visible; the next poll can recover.
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [job?.id, job?.status])

  const selectedCampaign = data.campaigns.find((campaign) => campaign.id === campaignId) ?? null
  const selectedScript = data.scripts.find((script) => script.id === scriptId) ?? null
  const selectedVideo = data.assets.find((asset) => asset.id === videoAssetId) ?? null
  const selectedAudio = data.assets.find((asset) => asset.id === audioAssetId) ?? null

  const sourceVideos = data.assets.filter((asset) => getAssetType(asset) === 'source_video')
  const audioAssets = data.assets.filter((asset) => ['audio', 'voiceover'].includes(getAssetType(asset)))
  const campaignScripts = campaignId ? data.scripts.filter((script) => script.campaign_id === campaignId) : data.scripts

  const estimatedSeconds = selectedVideo?.duration_sec || selectedScript?.duration_target_sec || 60
  const estimatedMinutes = Math.max(1, Math.ceil(estimatedSeconds / 60))
  const estimatedCredits = estimatedMinutes * CREDITS_PER_MINUTE

  const reachableSteps = useMemo(() => {
    const reachable: StepId[] = [1]
    if (videoMode) reachable.push(2)
    if (campaignId) reachable.push(3)
    if (campaignId && (scriptId || manualScript.trim())) reachable.push(4)
    if (videoAssetId) reachable.push(5)
    if (videoAssetId && audioAssetId) reachable.push(6)
    if (job) reachable.push(7)
    return reachable
  }, [videoMode, campaignId, scriptId, manualScript, videoAssetId, audioAssetId, job])

  function goToStep(step: StepId) {
    if (reachableSteps.includes(step)) {
      setCurrentStep(step)
      setError(null)
      setCreditError(null)
    }
  }

  async function ensureCampaign() {
    if (campaignId) return campaignId

    const name =
      videoMode === 'single'
        ? newCampaignName.trim() || `Video unico - ${new Intl.DateTimeFormat('es-MX').format(new Date())}`
        : newCampaignName.trim()

    if (!name) {
      throw new Error('Selecciona o crea una campana para continuar')
    }

    const response = await fetch('/api/content/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        objective: newCampaignObjective,
        platform: 'video',
        kind: videoMode === 'single' ? 'single' : 'campaign',
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'No se pudo crear la campana')
    setCampaignId(result.campaign.id)
    setData((current) => ({ ...current, campaigns: [result.campaign, ...current.campaigns] }))
    return result.campaign.id as string
  }

  async function continueCampaignStep() {
    setIsWorking(true)
    setError(null)
    try {
      await ensureCampaign()
      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar la campana')
    } finally {
      setIsWorking(false)
    }
  }

  async function continueScriptStep() {
    setIsWorking(true)
    setError(null)
    try {
      const nextCampaignId = await ensureCampaign()
      if (!scriptId && manualScript.trim()) {
        const response = await fetch('/api/content/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id: nextCampaignId,
            title: manualScriptTitle.trim() || 'Guion para video',
            full_script: manualScript,
            status: 'draft',
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'No se pudo guardar el guion')
        setScriptId(result.script.id)
        setData((current) => ({ ...current, scripts: [result.script, ...current.scripts] }))
      }
      setCurrentStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el guion')
    } finally {
      setIsWorking(false)
    }
  }

  async function createAssetFromFile(file: File, assetType: 'source_video' | 'audio') {
    setIsWorking(true)
    setError(null)
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: assetType,
          campaign_id: campaignId || null,
          script_id: scriptId || null,
          title: file.name,
          content_type: file.type,
          file_size: file.size,
          duration_sec: assetType === 'source_video' ? 60 : null,
          metadata: { original_file_name: file.name },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el recurso')
      setData((current) => ({ ...current, assets: [result.asset, ...current.assets] }))
      if (assetType === 'source_video') {
        setVideoAssetId(result.asset.id)
        setCurrentStep(5)
      } else {
        setAudioAssetId(result.asset.id)
        setCurrentStep(6)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el recurso')
    } finally {
      setIsWorking(false)
    }
  }

  async function launchRenderJob() {
    setIsWorking(true)
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
          setCreditError(`Necesitas ${deductData?.credits_needed ?? estimatedCredits} creditos. Tu balance actual es ${Number(deductData?.credits_remaining ?? 0).toFixed(2)}.`)
          return
        }
        throw new Error(deductData?.error || 'No se pudieron validar los creditos')
      }

      const response = await fetch('/api/render-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `create-video-${campaignId}-${scriptId}-${videoAssetId}-${audioAssetId}-${Date.now()}`,
        },
        body: JSON.stringify({
          provider: 'mock',
          provider_model: 'video-generation-v1',
          campaign_id: campaignId,
          script_id: scriptId || null,
          master_video_asset_id: videoAssetId,
          audio_asset_id: audioAssetId,
          credits_reserved: estimatedCredits,
          input: {
            source_video_asset_id: videoAssetId,
            audio_asset_id: audioAssetId,
            script_text: selectedScript?.full_script || manualScript || null,
            mock_duration_ms: 70_000,
          },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo lanzar el video')
      setJob(result.job)
      window.dispatchEvent(new Event('credits-updated'))
      setCurrentStep(7)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo lanzar el video')
    } finally {
      setIsWorking(false)
    }
  }

  function renderStep() {
    if (isLoading) {
      return (
        <div className="rounded-xl border border-border bg-bg-secondary p-12 text-center text-text-secondary">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-accent" />
          Cargando tu espacio...
        </div>
      )
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { id: 'single' as VideoMode, title: 'Video unico', body: 'Crea una pieza individual sin buscar una campana existente.', icon: Play },
              { id: 'campaign' as VideoMode, title: 'Parte de una campana', body: 'Conecta el video a una campana con guiones y resultados.', icon: FolderPlus },
            ].map((option) => {
              const Icon = option.icon
              const active = videoMode === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    setVideoMode(option.id)
                    setCurrentStep(2)
                  }}
                  className={`rounded-xl border p-6 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    active ? 'border-accent bg-accent/10 ring-4 ring-accent/10' : 'border-border bg-white'
                  }`}
                >
                  <Icon className="h-6 w-6 text-accent" />
                  <h2 className="mt-4 text-lg font-semibold text-text-primary">{option.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{option.body}</p>
                </button>
              )
            })}
          </div>
        )

      case 2:
        return (
          <div className="rounded-xl border border-border bg-bg-secondary p-6 shadow-sm">
            {videoMode === 'campaign' ? (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-text-secondary">
                  Selecciona una campana
                  <select
                    value={campaignId}
                    onChange={(event) => setCampaignId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Crear nueva campana</option>
                    {data.campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </label>
                {!campaignId && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={newCampaignName}
                      onChange={(event) => setNewCampaignName(event.target.value)}
                      placeholder="Nombre de campana"
                      className="rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                    />
                    <input
                      value={newCampaignObjective}
                      onChange={(event) => setNewCampaignObjective(event.target.value)}
                      placeholder="Objetivo"
                      className="rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-text-secondary">
                  Nombre del video unico
                  <input
                    value={newCampaignName}
                    onChange={(event) => setNewCampaignName(event.target.value)}
                    placeholder="Video unico - oferta de junio"
                    className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </label>
                <p className="text-sm text-text-muted">
                  Crearemos una campana interna para guardar el guion, los recursos y el resultado de este video.
                </p>
              </div>
            )}
            <button onClick={continueCampaignStep} disabled={isWorking} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50">
              {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Continuar a guion
            </button>
          </div>
        )

      case 3:
        return (
          <div className="rounded-xl border border-border bg-bg-secondary p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <label className="block text-sm font-semibold text-text-secondary">
                  Guion guardado
                  <select
                    value={scriptId}
                    onChange={(event) => setScriptId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Escribir o pegar nuevo guion</option>
                    {campaignScripts.map((script) => (
                      <option key={script.id} value={script.id}>{script.title || 'Guion sin titulo'}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => router.push(`/app/scripts${campaignId ? `?campaign=${campaignId}` : ''}`)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary"
                >
                  <PenLine className="h-4 w-4" />
                  Generar guion en chat
                </button>
              </div>
              <div className="space-y-3">
                {!scriptId && (
                  <input
                    value={manualScriptTitle}
                    onChange={(event) => setManualScriptTitle(event.target.value)}
                    placeholder="Titulo del guion"
                    className="w-full rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                )}
                <textarea
                  value={scriptId ? selectedScript?.full_script ?? '' : manualScript}
                  onChange={(event) => setManualScript(event.target.value)}
                  readOnly={Boolean(scriptId)}
                  placeholder="Pega o escribe el guion que se usara para la narracion..."
                  className="min-h-[260px] w-full rounded-lg border border-border bg-white px-3 py-3 text-sm leading-6 text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10 read-only:bg-bg-elevated"
                />
              </div>
            </div>
            <button
              onClick={continueScriptStep}
              disabled={isWorking || (!scriptId && !manualScript.trim())}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Continuar a video fuente
            </button>
          </div>
        )

      case 4:
        return (
          <AssetPicker
            title="Video fuente"
            description="Sube un video base o selecciona uno de Biblioteca."
            icon={Video}
            assets={sourceVideos}
            selectedAssetId={videoAssetId}
            onSelect={(id) => setVideoAssetId(id)}
            accept="video/*"
            onFile={(file) => createAssetFromFile(file, 'source_video')}
            onContinue={() => setCurrentStep(5)}
            continueDisabled={!videoAssetId}
          />
        )

      case 5:
        return (
          <div className="space-y-4">
            <AssetPicker
              title="Voz / audio"
              description="Sube tu narracion, selecciona un audio guardado o prepara una voz generada cuando el proveedor este configurado."
              icon={FileAudio}
              assets={audioAssets}
              selectedAssetId={audioAssetId}
              onSelect={(id) => setAudioAssetId(id)}
              accept="audio/*"
              onFile={(file) => createAssetFromFile(file, 'audio')}
              onContinue={() => setCurrentStep(6)}
              continueDisabled={!audioAssetId}
            />
            <div className="rounded-xl border border-dashed border-border bg-bg-elevated/60 p-4">
              <div className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Generar voz</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Esta opcion queda lista en la interfaz, pero requiere un proveedor de voz conectado antes de activarse.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="rounded-xl border border-border bg-bg-secondary p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">Revisa antes de lanzar</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ReviewItem label="Campana" value={selectedCampaign?.name ?? 'Video unico'} />
              <ReviewItem label="Guion" value={(selectedScript?.title ?? manualScriptTitle) || 'Guion manual'} />
              <ReviewItem label="Video fuente" value={selectedVideo?.title ?? 'Video seleccionado'} />
              <ReviewItem label="Voz / audio" value={selectedAudio?.title ?? 'Audio seleccionado'} />
              <ReviewItem label="Duracion estimada" value={`${estimatedMinutes} min`} />
              <ReviewItem label="Creditos estimados" value={`${estimatedCredits} creditos`} />
            </div>
            {creditError && (
              <div className="mt-5 flex gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>{creditError}</p>
              </div>
            )}
            <button
              onClick={launchRenderJob}
              disabled={isWorking}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Lanzar video
            </button>
          </div>
        )

      case 7:
        return (
          <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent">
              {job?.status === 'completed' ? <Check className="h-8 w-8" /> : <Loader2 className="h-8 w-8 animate-spin" />}
            </div>
            <h2 className="mt-5 text-xl font-semibold text-text-primary">{job ? statusLabel(job.status) : 'Preparando video'}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              Puedes salir de esta pagina. El estado tambien aparece en Actividad de video.
            </p>
            <div className="mx-auto mt-6 h-3 max-w-xl overflow-hidden rounded-full bg-bg-elevated">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(Math.max(job?.progress ?? 0, 0), 100)}%` }} />
            </div>
            {job?.error_message && <p className="mt-4 text-sm text-red-700">{job.error_message}</p>}
            {job?.status === 'completed' && (
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={() => router.push('/app/library')} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover">
                  Ver en biblioteca
                </button>
                <button onClick={() => setCurrentStep(1)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
                  Crear otro video
                </button>
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">Crear video</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">Flujo guiado de video</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            Selecciona campana, guion, video fuente y audio antes de lanzar la generacion.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-bg-secondary p-4 shadow-sm">
          <div className="grid gap-2 md:grid-cols-7">
            {steps.map((step) => {
              const Icon = step.icon
              const active = currentStep === step.id
              const complete = currentStep > step.id
              const reachable = reachableSteps.includes(step.id)
              return (
                <button
                  key={step.id}
                  disabled={!reachable}
                  onClick={() => goToStep(step.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    active
                      ? 'border-accent bg-accent text-white'
                      : complete
                        ? 'border-accent/30 bg-accent/10 text-text-primary'
                        : 'border-border bg-white text-text-muted'
                  } ${reachable ? 'hover:border-accent hover:text-text-primary' : 'opacity-60'}`}
                >
                  <Icon className="h-4 w-4" />
                  <p className="mt-2 text-xs font-semibold uppercase">Paso {step.id}</p>
                  <p className="truncate text-sm font-semibold">{step.label}</p>
                </button>
              )
            })}
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {renderStep()}
      </div>
    </Layout>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function AssetPicker({
  title,
  description,
  icon: Icon,
  assets,
  selectedAssetId,
  onSelect,
  accept,
  onFile,
  onContinue,
  continueDisabled,
}: {
  title: string
  description: string
  icon: React.ElementType
  assets: Asset[]
  selectedAssetId: string
  onSelect: (id: string) => void
  accept: string
  onFile: (file: File) => void
  onContinue: () => void
  continueDisabled: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover">
          <Upload className="h-4 w-4" />
          Subir
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onFile(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      {assets.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-bg-elevated/60 p-8 text-center">
          <Icon className="mx-auto h-9 w-9 text-accent" />
          <p className="mt-3 text-sm font-semibold text-text-primary">No hay recursos guardados</p>
          <p className="mt-1 text-sm text-text-muted">Sube un archivo para continuar.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => {
            const active = selectedAssetId === asset.id
            return (
              <button
                key={asset.id}
                onClick={() => onSelect(asset.id)}
                className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                  active ? 'border-accent bg-accent/10 ring-4 ring-accent/10' : 'border-border bg-white'
                }`}
              >
                <Icon className="h-5 w-5 text-accent" />
                <h3 className="mt-3 truncate text-sm font-semibold text-text-primary">{asset.title || 'Recurso sin titulo'}</h3>
                <p className="mt-1 text-xs text-text-muted">{formatSize(asset.file_size)}</p>
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={continueDisabled}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
      >
        Continuar
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
