'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Clock3,
  ImageIcon,
  FileAudio,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Play,
  Search,
  Save,
  Upload,
  Video,
  X,
} from 'lucide-react'

type Campaign = {
  id: string
  name: string
  objective: string | null
  platform: string
  status: string
  updated_at: string
}

type FolderItemType = 'source_video' | 'audio' | 'voiceover' | 'image' | 'script' | 'result_video'

type FolderItem = {
  id: string
  type: FolderItemType
  title: string
  campaign_id: string
  created_at: string
  updated_at: string
  public_url: string | null
  source_url: string | null
  download_url?: string | null
  file_size: number | null
  duration_sec: number | null
  status: string | null
  content_type: string | null
  excerpt: string | null
  full_script: string | null
  render_job_id: string | null
  script_id: string | null
}

type Job = {
  id: string
  status: string
  progress: number
  updated_at: string
}

type CampaignDetail = {
  campaign: Campaign
  items: FolderItem[]
  active_jobs: Job[]
}

type SortKey = 'modified' | 'name' | 'type'

type ScriptDraft = {
  id: string
  title: string
  full_script: string
}

type RenameDraft = {
  id: string
  type: FolderItemType
  title: string
  full_script: string | null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatSize(bytes?: number | null) {
  if (!bytes) return 'Guardado'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return null
  const rounded = Math.max(1, Math.round(seconds))
  if (rounded < 60) return `${rounded}s`
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

function itemTypeLabel(type: FolderItemType) {
  const labels: Record<FolderItemType, string> = {
    source_video: 'Video',
    audio: 'Audio',
    voiceover: 'Voz',
    image: 'Imagen',
    script: 'Guion',
    result_video: 'Resultado',
  }
  return labels[type]
}

function itemIcon(type: FolderItemType) {
  if (type === 'source_video') return Video
  if (type === 'result_video') return BarChart3
  if (type === 'image') return ImageIcon
  if (type === 'audio' || type === 'voiceover') return FileAudio
  return FileText
}

function isPreviewableUrl(value?: string | null) {
  if (!value) return false
  if (value.includes('example.com/')) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export default function CampaignFolderPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const [data, setData] = useState<CampaignDetail | null>(null)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('modified')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptDraft, setScriptDraft] = useState<ScriptDraft | null>(null)
  const [renameDraft, setRenameDraft] = useState<RenameDraft | null>(null)

  async function loadCampaign() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/content/campaigns/${campaignId}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo cargar la campana')
      setData({
        campaign: result.campaign,
        items: result.items ?? [],
        active_jobs: result.active_jobs ?? [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la campana')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCampaign()
  }, [campaignId])

  async function handleUpload(files: FileList | null, assetType: 'source_video' | 'audio' | 'image') {
    const file = files?.[0]
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: assetType,
          campaign_id: campaignId,
          title: file.name,
          content_type: file.type,
          file_size: file.size,
          duration_sec: assetType === 'source_video' ? 60 : null,
          metadata: { original_file_name: file.name },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el recurso')
      await loadCampaign()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el recurso')
    } finally {
      setIsUploading(false)
    }
  }

  function openScript(item: FolderItem) {
    if (item.type !== 'script') return
    setScriptDraft({
      id: item.id,
      title: item.title,
      full_script: item.full_script || item.excerpt || '',
    })
  }

  async function saveScript() {
    if (!scriptDraft) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/content/scripts/${scriptDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scriptDraft.title,
          full_script: scriptDraft.full_script,
          status: 'draft',
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el guion')
      setScriptDraft(null)
      await loadCampaign()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el guion')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveRename() {
    if (!renameDraft) return
    const title = renameDraft.title.trim()
    if (!title) {
      setError('El nombre no puede estar vacio')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const isScript = renameDraft.type === 'script'
      const response = await fetch(isScript ? `/api/content/scripts/${renameDraft.id}` : `/api/assets/${renameDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isScript
          ? { title, full_script: renameDraft.full_script || 'Guion guardado', status: 'draft' }
          : { title }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo renombrar el recurso')
      setRenameDraft(null)
      await loadCampaign()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo renombrar el recurso')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const items = [...(data?.items ?? [])].filter((item) => {
      if (!normalized) return true
      return [item.title, item.excerpt, itemTypeLabel(item.type)].some((value) => String(value ?? '').toLowerCase().includes(normalized))
    })

    return items.sort((a, b) => {
      if (sortKey === 'name') return a.title.localeCompare(b.title)
      if (sortKey === 'type') return itemTypeLabel(a.type).localeCompare(itemTypeLabel(b.type)) || a.title.localeCompare(b.title)
      return new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()
    })
  }, [data?.items, query, sortKey])

  const counts = useMemo(() => {
    const items = data?.items ?? []
    return {
      videos: items.filter((item) => item.type === 'source_video').length,
      audio: items.filter((item) => item.type === 'audio' || item.type === 'voiceover').length,
      images: items.filter((item) => item.type === 'image').length,
      scripts: items.filter((item) => item.type === 'script').length,
      results: items.filter((item) => item.type === 'result_video').length,
    }
  }, [data?.items])

  return (
    <Layout>
      <div className="space-y-5">
        <Link href="/app/content" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Volver a campanas
        </Link>

        {isLoading ? (
          <div className="rounded-xl border border-border bg-bg-secondary p-12 text-center text-text-secondary">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-accent" />
            Cargando carpeta...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : data ? (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase text-accent">Carpeta de campana</p>
                <h1 className="mt-2 text-3xl font-semibold text-text-primary">{data.campaign.name}</h1>
                <p className="mt-2 max-w-3xl text-sm text-text-secondary">
                  {data.campaign.objective || 'Todos los recursos de esta campana viven en esta carpeta.'}
                </p>
              </div>
              <Link href={`/app/upload?campaign=${data.campaign.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover">
                <Play className="h-4 w-4" />
                Crear video
              </Link>
            </div>

            {data.active_jobs.length > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-text-primary md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-accent" />
                  <p>Hay videos generandose para esta campana.</p>
                </div>
                <Link href="/app" className="inline-flex items-center justify-center rounded-lg border border-accent/30 bg-white px-3 py-2 text-sm font-semibold text-accent">
                  Ver estado
                </Link>
              </div>
            )}

            <section className="rounded-xl border border-border bg-bg-secondary shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
                  <span className="rounded-full border border-border bg-white px-3 py-1.5">{counts.videos} videos</span>
                  <span className="rounded-full border border-border bg-white px-3 py-1.5">{counts.audio} audios</span>
                  <span className="rounded-full border border-border bg-white px-3 py-1.5">{counts.images} imagenes</span>
                  <span className="rounded-full border border-border bg-white px-3 py-1.5">{counts.scripts} guiones</span>
                  <span className="rounded-full border border-border bg-white px-3 py-1.5">{counts.results} resultados</span>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative min-w-0 md:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar en carpeta"
                      className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                    />
                  </div>
                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                    className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="modified">Fecha modificada</option>
                    <option value="name">Nombre</option>
                    <option value="type">Tipo</option>
                  </select>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Subir video
                    <input type="file" accept="video/*" className="hidden" onChange={(event) => { handleUpload(event.target.files, 'source_video'); event.currentTarget.value = '' }} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Subir audio
                    <input type="file" accept="audio/*" className="hidden" onChange={(event) => { handleUpload(event.target.files, 'audio'); event.currentTarget.value = '' }} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Subir imagen
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { handleUpload(event.target.files, 'image'); event.currentTarget.value = '' }} />
                  </label>
                  <Link href={`/app/scripts?campaign=${data.campaign.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
                    <FileText className="h-4 w-4" />
                    Guion
                  </Link>
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-accent/10">
                    <Search className="h-7 w-7 text-accent" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-text-primary">
                    {query.trim() ? 'No encontramos recursos' : 'Esta carpeta esta vacia'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
                    {query.trim()
                      ? 'Prueba otra busqueda o limpia el filtro para ver todo.'
                      : 'Sube un video, sube un audio o crea un guion para empezar a llenar esta campana.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {filteredItems.map((item) => (
                    <FolderTile
                      key={`${item.type}-${item.id}`}
                      item={item}
                      onEditScript={openScript}
                      onRename={(selected) => setRenameDraft({
                        id: selected.id,
                        type: selected.type,
                        title: selected.title,
                        full_script: selected.full_script,
                      })}
                    />
                  ))}
                </div>
              )}
            </section>

            {scriptDraft && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-accent">Documento de guion</p>
                      <input
                        value={scriptDraft.title}
                        onChange={(event) => setScriptDraft((current) => current ? { ...current, title: event.target.value } : current)}
                        className="mt-1 w-full rounded-lg border border-transparent px-0 text-xl font-semibold text-text-primary outline-none focus:border-border focus:px-3 focus:py-2"
                      />
                    </div>
                    <button onClick={() => setScriptDraft(null)} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-text-primary" aria-label="Cerrar editor">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    value={scriptDraft.full_script}
                    onChange={(event) => setScriptDraft((current) => current ? { ...current, full_script: event.target.value } : current)}
                    className="min-h-[58vh] flex-1 resize-none border-0 p-6 text-base leading-7 text-text-primary outline-none"
                    placeholder="Escribe o edita tu guion..."
                  />
                  <div className="flex justify-end gap-2 border-t border-border p-4">
                    <button onClick={() => setScriptDraft(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
                      Cancelar
                    </button>
                    <button onClick={saveScript} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar guion
                    </button>
                  </div>
                </div>
              </div>
            )}

            {renameDraft && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-accent">Renombrar</p>
                      <h2 className="mt-1 text-lg font-semibold text-text-primary">Cambiar nombre del recurso</h2>
                    </div>
                    <button onClick={() => setRenameDraft(null)} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-text-primary" aria-label="Cerrar renombrar">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    value={renameDraft.title}
                    onChange={(event) => setRenameDraft((current) => current ? { ...current, title: event.target.value } : current)}
                    className="mt-5 w-full rounded-lg border border-border bg-white px-3 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                    autoFocus
                  />
                  <div className="mt-5 flex justify-end gap-2">
                    <button onClick={() => setRenameDraft(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
                      Cancelar
                    </button>
                    <button onClick={saveRename} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                      Renombrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  )
}

function FolderTile({
  item,
  onEditScript,
  onRename,
}: {
  item: FolderItem
  onEditScript: (item: FolderItem) => void
  onRename: (item: FolderItem) => void
}) {
  const Icon = itemIcon(item.type)
  const duration = formatDuration(item.duration_sec)
  const rawMediaUrl = item.public_url || item.source_url
  const mediaUrl = isPreviewableUrl(rawMediaUrl) ? rawMediaUrl : null
  const downloadUrl = item.download_url || mediaUrl
  const resultHref = item.type === 'result_video' ? '/app/performance' : null

  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-elevated px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-accent" />
          <p className="truncate text-sm font-semibold text-text-primary">{item.title}</p>
        </div>
        <button
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRename(item)
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted transition hover:bg-white hover:text-text-primary"
          aria-label={`Renombrar ${item.title}`}
          title="Renombrar"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="aspect-[4/3] bg-white">
        <TilePreview item={item} mediaUrl={mediaUrl} icon={Icon} onEditScript={onEditScript} />
      </div>

      <div className="space-y-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
          <span className="rounded-full bg-bg-elevated px-2 py-1">{itemTypeLabel(item.type)}</span>
          <span>{formatDate(item.updated_at ?? item.created_at)}</span>
        </div>
        <div className="flex min-h-5 items-center gap-3 text-xs text-text-muted">
          <span>{formatSize(item.file_size)}</span>
          {duration && <span>{duration}</span>}
          {item.type === 'result_video' && <span>Listo para metricas</span>}
        </div>
        <div className="flex gap-2">
          {item.type === 'script' && (
            <button onClick={() => onEditScript(item)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              <Pencil className="h-3.5 w-3.5" />
              Editar texto
            </button>
          )}
          {mediaUrl && item.type !== 'script' && item.type !== 'result_video' && (
            <a href={mediaUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent hover:underline">
              Abrir preview
            </a>
          )}
          {!mediaUrl && downloadUrl && item.type !== 'script' && (
            <a href={downloadUrl} className="text-xs font-semibold text-accent hover:underline">
              Descargar
            </a>
          )}
          {resultHref && (
            <Link href={resultHref} className="text-xs font-semibold text-accent hover:underline">
              Ver metricas
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

function TilePreview({
  item,
  mediaUrl,
  icon: Icon,
  onEditScript,
}: {
  item: FolderItem
  mediaUrl: string | null
  icon: React.ElementType
  onEditScript: (item: FolderItem) => void
}) {
  if (item.type === 'script') {
    return (
      <button onClick={() => onEditScript(item)} className="flex h-full w-full items-start bg-white p-4 text-left transition hover:bg-bg-elevated/60">
        <p className="line-clamp-7 text-sm leading-6 text-text-secondary">{item.full_script || item.excerpt || 'Guion guardado para esta campana.'}</p>
      </button>
    )
  }

  if (mediaUrl && (item.type === 'source_video' || item.type === 'result_video')) {
    return (
      <video
        src={mediaUrl}
        className="h-full w-full bg-black object-cover"
        controls
        muted
        preload="metadata"
      />
    )
  }

  if (mediaUrl && item.type === 'image') {
    return <img src={mediaUrl} alt={item.title} className="h-full w-full object-cover" />
  }

  return (
    <div className="grid h-full w-full place-items-center bg-white p-4">
      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-accent/10">
        <Icon className="h-9 w-9 text-accent" />
      </div>
    </div>
  )
}
