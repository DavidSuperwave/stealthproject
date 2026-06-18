'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquarePlus,
  Plus,
  Save,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Campaign = {
  id: string
  name: string
  objective: string | null
  platform: string
}

type SavedScript = {
  id: string
  campaign_id: string
  title: string | null
  full_script: string
  status: string
  updated_at: string
}

const starters = [
  'Escribe un anuncio de 30 segundos para una clinica estetica local que quiere mas citas.',
  'Dame tres hooks para vender un servicio local en video corto.',
  'Convierte esta oferta en una escena: el dueno de negocio no logra crear contenido y luego recibe videos listos para vender.',
]

const welcomeMessage: Message = {
  role: 'assistant',
  content:
    'Cuéntame el negocio, la oferta, el cliente ideal y la accion que quieres que tome la audiencia. Lo puedo convertir en hooks, escenas, voz en off, CTA y notas de produccion.',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function titleFromScript(content: string) {
  const firstLine = content
    .split('\n')
    .map((line) => line.replace(/[#*:]/g, '').trim())
    .find(Boolean)
  return (firstLine || 'Guion generado').slice(0, 70)
}

function MessageBlock({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-[780px] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? 'border-accent bg-accent text-white'
            : 'border-border bg-white text-text-secondary'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase opacity-80">
          {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isUser ? 'Tu brief' : 'Asistente de guion'}
        </div>
        <div className="space-y-2 whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  )
}

export default function ScriptChatStudio() {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState<Message[]>([welcomeMessage])
  const [input, setInput] = useState('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [scripts, setScripts] = useState<SavedScript[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [newCampaignName, setNewCampaignName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveMode, setSaveMode] = useState<'library' | 'video'>('video')
  const [scriptTitle, setScriptTitle] = useState('')
  const [scriptContent, setScriptContent] = useState('')
  const [scriptNotes, setScriptNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant' && message.content !== welcomeMessage.content),
    [messages],
  )

  async function loadWorkspaceContent() {
    setIsLoading(true)
    try {
      const [campaignRes, scriptsRes] = await Promise.all([
        fetch('/api/content/campaigns', { cache: 'no-store' }),
        fetch('/api/content/scripts', { cache: 'no-store' }),
      ])
      const [campaignData, scriptData] = await Promise.all([campaignRes.json(), scriptsRes.json()])
      if (!campaignRes.ok) throw new Error(campaignData.error || 'No se pudieron cargar las campanas')
      if (!scriptsRes.ok) throw new Error(scriptData.error || 'No se pudieron cargar los guiones')
      const nextCampaigns = campaignData.campaigns ?? []
      setCampaigns(nextCampaigns)
      setScripts(scriptData.scripts ?? [])

      const params = new URLSearchParams(window.location.search)
      const campaignFromUrl = params.get('campaign')
      if (campaignFromUrl && nextCampaigns.some((campaign: Campaign) => campaign.id === campaignFromUrl)) {
        setSelectedCampaignId(campaignFromUrl)
      } else if (!selectedCampaignId && nextCampaigns[0]?.id) {
        setSelectedCampaignId(nextCampaigns[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el estudio de guiones')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspaceContent()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  async function sendMessage(messageText = input) {
    const trimmed = messageText.trim()
    if (!trimmed || isSending) return

    setInput('')
    setError(null)
    setIsSending(true)
    const userMessage: Message = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)

    try {
      const response = await fetch('/api/scripts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo generar el guion')
      setMessages((current) => [...current, { role: 'assistant', content: data.message }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el guion')
    } finally {
      setIsSending(false)
    }
  }

  function openSaveModal(mode: 'library' | 'video', content?: string) {
    const nextContent = content ?? latestAssistant?.content ?? ''
    if (!nextContent) {
      setError('Genera o selecciona un guion antes de guardarlo.')
      return
    }
    setSaveMode(mode)
    setScriptContent(nextContent)
    setScriptTitle(titleFromScript(nextContent))
    setScriptNotes('')
    setSaveModalOpen(true)
    setError(null)
  }

  async function createCampaignIfNeeded() {
    if (selectedCampaignId) return selectedCampaignId

    const name = newCampaignName.trim() || `Video unico - ${new Intl.DateTimeFormat('es-MX').format(new Date())}`
    const response = await fetch('/api/content/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        platform: 'video',
        objective: 'Video unico creado desde guion',
        kind: 'single',
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'No se pudo crear la campana')
    setCampaigns((current) => [data.campaign, ...current])
    setSelectedCampaignId(data.campaign.id)
    return data.campaign.id as string
  }

  async function saveScript() {
    setIsSaving(true)
    setError(null)
    try {
      const campaignId = await createCampaignIfNeeded()
      const response = await fetch('/api/content/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          title: scriptTitle,
          full_script: scriptContent,
          notes: scriptNotes,
          status: 'draft',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el guion')
      setScripts((current) => [data.script, ...current])
      setSaveModalOpen(false)

      if (saveMode === 'video') {
        router.push(`/app/upload?campaign=${campaignId}&script=${data.script.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el guion')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col gap-4">
      <div className="rounded-xl border border-border bg-bg-secondary p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">Guiones</p>
            <h1 className="mt-1 text-2xl font-semibold text-text-primary">Crea guiones para video</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary">
              Trabaja como en un chat: escribe el brief, ajusta la respuesta, guarda el guion y usalo en tu siguiente video.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedCampaignId}
              onChange={(event) => setSelectedCampaignId(event.target.value)}
              className="min-w-[240px] rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            >
              <option value="">Video unico</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setMessages([welcomeMessage])
                setInput('')
                setError(null)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Nuevo chat
            </button>
          </div>
        </div>
      </div>

      <section className="flex min-h-[680px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-bg-secondary shadow-sm">
        <div className="flex-1 space-y-5 overflow-y-auto bg-bg-elevated/50 p-5">
          {messages.map((message, index) => (
            <MessageBlock key={`${message.role}-${index}`} message={message} />
          ))}

          {messages.length === 1 && (
            <div className="ml-11 grid gap-2 md:grid-cols-3">
              {starters.map((starter) => (
                <button
                  key={starter}
                  onClick={() => sendMessage(starter)}
                  className="rounded-xl border border-border bg-white p-4 text-left text-sm leading-5 text-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-text-primary hover:shadow-md"
                >
                  <Sparkles className="mb-3 h-4 w-4 text-accent" />
                  {starter}
                </button>
              ))}
            </div>
          )}

          {isSending && (
            <div className="ml-11 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm text-text-muted shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              Escribiendo...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border bg-white p-4">
          {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Describe la oferta, audiencia, producto, tono y plataforma..."
              className="min-h-[56px] flex-1 resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isSending || !input.trim()}
              className="inline-flex w-12 items-center justify-center rounded-xl bg-accent text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-50"
              aria-label="Enviar mensaje"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => openSaveModal('library')}
              disabled={!latestAssistant}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-text-primary disabled:opacity-50"
            >
              <Save className="h-4 w-4 text-accent" />
              Guardar en biblioteca
            </button>
            <button
              onClick={() => openSaveModal('video')}
              disabled={!latestAssistant}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              Usar para mi video
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-bg-secondary p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Guiones guardados</h2>
            <p className="mt-1 text-sm text-text-muted">Disponibles en Biblioteca y en el flujo de crear video.</p>
          </div>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
        </div>

        {scripts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-bg-elevated/60 p-6 text-center text-sm text-text-muted">
            Aun no hay guiones guardados.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scripts.slice(0, 6).map((script) => (
              <article key={script.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-text-primary">{script.title || 'Guion sin titulo'}</h3>
                    <p className="mt-1 text-xs text-text-muted">{formatDate(script.updated_at)}</p>
                  </div>
                  <Check className="h-4 w-4 text-accent" />
                </div>
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{script.full_script}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(script.full_script)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition hover:border-accent hover:text-text-primary"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </button>
                  <button
                    onClick={() => router.push(`/app/upload?campaign=${script.campaign_id}&script=${script.id}`)}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-hover"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Crear video
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Editar y guardar guion</h2>
                <p className="mt-1 text-sm text-text-muted">Guarda una version editable antes de usarla en un video.</p>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-text-primary"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-text-secondary">
                  Titulo
                  <input
                    value={scriptTitle}
                    onChange={(event) => setScriptTitle(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </label>
                <label className="text-sm font-medium text-text-secondary">
                  Campana
                  <select
                    value={selectedCampaignId}
                    onChange={(event) => setSelectedCampaignId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  >
                    <option value="">Video unico nuevo</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {!selectedCampaignId && (
                <label className="block text-sm font-medium text-text-secondary">
                  Nombre del video unico
                  <input
                    value={newCampaignName}
                    onChange={(event) => setNewCampaignName(event.target.value)}
                    placeholder="Video unico - oferta de junio"
                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </label>
              )}

              <label className="block text-sm font-medium text-text-secondary">
                Guion editable
                <textarea
                  value={scriptContent}
                  onChange={(event) => setScriptContent(event.target.value)}
                  className="mt-1 min-h-[280px] w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm leading-6 text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>

              <label className="block text-sm font-medium text-text-secondary">
                Notas para narracion o voz
                <textarea
                  value={scriptNotes}
                  onChange={(event) => setScriptNotes(event.target.value)}
                  placeholder="Tono, ritmo, palabras que deben sonar naturales..."
                  className="mt-1 min-h-[90px] w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm leading-6 text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                <button
                  onClick={() => setSaveModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveScript}
                  disabled={isSaving || !scriptContent.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {saveMode === 'video' ? 'Guardar y crear video' : 'Guardar guion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
