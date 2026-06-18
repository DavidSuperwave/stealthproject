'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'
import { FileAudio, FileText, FolderOpen, Grid2X2, Loader2, Play, Search, Upload, Video } from 'lucide-react'

type LibraryTab = 'scripts' | 'videos' | 'audio' | 'results' | 'campaigns'

type Campaign = {
  id: string
  name: string
  objective: string | null
  platform: string
  status: string
  updated_at: string
}

type Script = {
  id: string
  campaign_id: string
  title: string | null
  full_script: string
  status: string
  updated_at: string
}

type Asset = {
  id: string
  campaign_id: string | null
  script_id: string | null
  title: string | null
  public_url: string | null
  source_url: string | null
  duration_sec: number | null
  content_type: string | null
  file_size: number | null
  status: string
  metadata: Record<string, unknown>
  created_at: string
}

type Job = {
  id: string
  campaign_id: string | null
  script_id: string | null
  status: string
  progress: number
  output: Record<string, unknown>
  credits_reserved: number | null
  error_message: string | null
  updated_at: string
}

type LibraryData = {
  campaigns: Campaign[]
  scripts: Script[]
  assets: Asset[]
  jobs: Job[]
}

const tabs: Array<{ id: LibraryTab; label: string; icon: React.ElementType }> = [
  { id: 'scripts', label: 'Guiones', icon: FileText },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audios', icon: FileAudio },
  { id: 'results', label: 'Resultados', icon: Play },
  { id: 'campaigns', label: 'Campanas', icon: FolderOpen },
]

function formatSize(bytes?: number | null) {
  if (!bytes) return 'Sin tamano'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function getAssetType(asset: Asset) {
  return String(asset.metadata?.asset_type ?? 'source_video')
}

export default function LibraryPage() {
  const [data, setData] = useState<LibraryData>({ campaigns: [], scripts: [], assets: [], jobs: [] })
  const [activeTab, setActiveTab] = useState<LibraryTab>('videos')
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadLibrary() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/library', { cache: 'no-store' })
      const nextData = await response.json()
      if (!response.ok) throw new Error(nextData.error || 'No se pudo cargar la biblioteca')
      setData({
        campaigns: nextData.campaigns ?? [],
        scripts: nextData.scripts ?? [],
        assets: nextData.assets ?? [],
        jobs: nextData.jobs ?? [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la biblioteca')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  const filteredScripts = useMemo(() => {
    const normalized = query.toLowerCase()
    return data.scripts.filter((script) =>
      [script.title, script.full_script].some((value) => String(value ?? '').toLowerCase().includes(normalized)),
    )
  }, [data.scripts, query])

  const filteredAssets = useMemo(() => {
    const normalized = query.toLowerCase()
    return data.assets.filter((asset) => {
      const assetType = getAssetType(asset)
      const matchesTab =
        activeTab === 'videos'
          ? assetType === 'source_video'
          : activeTab === 'audio'
            ? assetType === 'audio' || assetType === 'voiceover'
            : activeTab === 'results'
              ? assetType === 'result_video'
              : false
      const matchesQuery = String(asset.title ?? '').toLowerCase().includes(normalized)
      return matchesTab && matchesQuery
    })
  }, [data.assets, activeTab, query])

  const filteredCampaigns = useMemo(() => {
    const normalized = query.toLowerCase()
    return data.campaigns.filter((campaign) =>
      [campaign.name, campaign.objective, campaign.platform].some((value) => String(value ?? '').toLowerCase().includes(normalized)),
    )
  }, [data.campaigns, query])

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    const assetType = file.type.startsWith('audio/') ? 'audio' : 'source_video'
    setIsUploading(true)
    setError(null)
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: assetType,
          title: file.name,
          content_type: file.type,
          file_size: file.size,
          metadata: { original_file_name: file.name },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el recurso')
      await loadLibrary()
      setActiveTab(assetType === 'audio' ? 'audio' : 'videos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el recurso')
    } finally {
      setIsUploading(false)
    }
  }

  const activeCount =
    activeTab === 'scripts'
      ? filteredScripts.length
      : activeTab === 'campaigns'
        ? filteredCampaigns.length
        : filteredAssets.length

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-accent">Biblioteca</p>
            <h1 className="mt-2 text-3xl font-semibold text-text-primary">Guiones, videos, audios y resultados</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary">
              Todo lo que guardes desde el chat o el flujo de crear video aparece aqui.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Subir video o audio
            <input type="file" accept="video/*,audio/*" className="hidden" onChange={(event) => handleUpload(event.target.files)} />
          </label>
        </div>

        <section className="rounded-xl border border-border bg-bg-secondary shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-white text-text-secondary hover:border-accent hover:text-text-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div className="relative min-w-0 flex-1 xl:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en biblioteca"
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </div>
          </div>

          {error && <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              Cargando biblioteca...
            </div>
          ) : activeCount === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-accent/10">
                <Grid2X2 className="h-7 w-7 text-accent" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-text-primary">No hay elementos aqui todavia</h2>
              <p className="mt-2 text-sm text-text-muted">Guarda guiones o sube recursos para verlos en esta vista.</p>
            </div>
          ) : activeTab === 'scripts' ? (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredScripts.map((script) => (
                <article key={script.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <h3 className="truncate text-sm font-semibold text-text-primary">{script.title || 'Guion sin titulo'}</h3>
                  <p className="mt-1 text-xs text-text-muted">{formatDate(script.updated_at)}</p>
                  <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{script.full_script}</p>
                  <Link href={`/app/upload?campaign=${script.campaign_id}&script=${script.id}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-hover">
                    Crear video
                  </Link>
                </article>
              ))}
            </div>
          ) : activeTab === 'campaigns' ? (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCampaigns.map((campaign) => (
                <article key={campaign.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-accent">{campaign.platform}</p>
                  <h3 className="mt-1 truncate text-sm font-semibold text-text-primary">{campaign.name}</h3>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-text-secondary">{campaign.objective || 'Campana en biblioteca.'}</p>
                  <Link href={`/app/upload?campaign=${campaign.id}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-hover">
                    Crear video
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssets.map((asset) => (
                <article key={asset.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                  <div className="grid aspect-video place-items-center rounded-lg bg-bg-elevated">
                    {activeTab === 'audio' ? <FileAudio className="h-10 w-10 text-accent" /> : <Video className="h-10 w-10 text-accent" />}
                  </div>
                  <h3 className="mt-4 truncate text-sm font-semibold text-text-primary">{asset.title || 'Recurso sin titulo'}</h3>
                  <p className="mt-1 text-xs text-text-muted">{formatSize(asset.file_size)} - {formatDate(asset.created_at)}</p>
                  <p className="mt-2 text-xs capitalize text-text-secondary">{asset.status}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
