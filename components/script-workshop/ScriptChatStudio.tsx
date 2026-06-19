'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Bot,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Library,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from '@/components/prompt-kit/chat-container'
import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from '@/components/prompt-kit/file-upload'
import { Loader } from '@/components/prompt-kit/loader'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAvatar,
  MessageContent,
} from '@/components/prompt-kit/message'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'

type ChatAttachment = {
  id: string
  name: string
  type: string
  size: number
  kind: 'text' | 'image'
  content?: string
  dataUrl?: string
}

type ChatMessage = {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: ChatAttachment[]
  model?: string | null
  created_at?: string
}

type ChatSession = {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

type Campaign = {
  id: string
  name: string
  objective: string | null
  platform: string
}

type SavedScript = {
  id: string
  workspace_id?: string
  campaign_id: string | null
  title: string | null
  full_script: string
  status: string
  updated_at: string
}

const starters = [
  'Dame tres hooks para vender un servicio local en video corto.',
  'Convierte esta oferta en un guion de 30 segundos.',
  'Haz este script mas natural para grabarlo en camara.',
  'Genera una idea de video para objeciones frecuentes.',
]

const emptyStateMessage =
  'Describe la oferta, el cliente ideal y la accion que quieres provocar. Puedo convertirlo en hooks, escenas, voz en off, CTA y notas para grabar.'

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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isTextFile(file: File) {
  const name = file.name.toLowerCase()
  return file.type === 'text/plain' || file.type === 'text/markdown' || name.endsWith('.txt') || name.endsWith('.md')
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

function fileToText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsText(file)
  })
}

function attachmentIcon(attachment: ChatAttachment) {
  return attachment.kind === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />
}

export default function ScriptChatStudio() {
  const router = useRouter()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [scripts, setScripts] = useState<SavedScript[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveDestination, setSaveDestination] = useState<'library' | 'campaign'>('library')
  const [scriptTitle, setScriptTitle] = useState('')
  const [scriptContent, setScriptContent] = useState('')
  const [scriptNotes, setScriptNotes] = useState('')

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null
  const campaignNames = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign.name])), [campaigns])
  const libraryScripts = scripts.filter((script) => !script.campaign_id)
  const campaignScripts = scripts.filter((script) => script.campaign_id)

  async function loadSession(sessionId: string) {
    const response = await fetch(`/api/scripts/chats/${sessionId}`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar el chat')
    setSelectedSessionId(sessionId)
    setMessages(data.messages ?? [])
    setChatError(null)
  }

  async function createChat(select = true) {
    const response = await fetch('/api/scripts/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nuevo chat' }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'No se pudo crear el chat')
    setSessions((current) => [data.session, ...current])
    if (select) {
      setSelectedSessionId(data.session.id)
      setMessages([])
      setInput('')
      setAttachments([])
      setChatError(null)
    }
    return data.session as ChatSession
  }

  async function loadWorkspaceContent() {
    setIsLoading(true)
    setError(null)
    setChatError(null)
    try {
      const [sessionRes, campaignRes, scriptsRes] = await Promise.all([
        fetch('/api/scripts/chats', { cache: 'no-store' }),
        fetch('/api/content/campaigns', { cache: 'no-store' }),
        fetch('/api/content/scripts', { cache: 'no-store' }),
      ])
      const [sessionData, campaignData, scriptData] = await Promise.all([sessionRes.json(), campaignRes.json(), scriptsRes.json()])
      if (!campaignRes.ok) throw new Error(campaignData.error || 'No se pudieron cargar las campanas')
      if (!scriptsRes.ok) throw new Error(scriptData.error || 'No se pudieron cargar los guiones')

      const nextCampaigns = campaignData.campaigns ?? []
      setCampaigns(nextCampaigns)
      setScripts(scriptData.scripts ?? [])

      const params = new URLSearchParams(window.location.search)
      const campaignFromUrl = params.get('campaign')
      if (campaignFromUrl && nextCampaigns.some((campaign: Campaign) => campaign.id === campaignFromUrl)) {
        setSelectedCampaignId(campaignFromUrl)
        setSaveDestination('campaign')
      }

      if (!sessionRes.ok) {
        setSessions([])
        setMessages([])
        setChatError(sessionData.error || 'No se pudieron cargar los chats')
        return
      }

      const nextSessions = sessionData.sessions ?? []
      setSessions(nextSessions)
      if (nextSessions[0]?.id) {
        await loadSession(nextSessions[0].id)
      } else {
        await createChat(true)
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

  async function renameChat(session: ChatSession) {
    const title = window.prompt('Nombre del chat', session.title)?.trim()
    if (!title) return
    setError(null)
    const response = await fetch(`/api/scripts/chats/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'No se pudo renombrar el chat')
      return
    }
    setSessions((current) => current.map((item) => (item.id === session.id ? { ...item, ...data.session } : item)))
  }

  async function deleteChat(sessionId: string) {
    if (!window.confirm('Borrar este chat?')) return
    setError(null)
    const response = await fetch(`/api/scripts/chats/${sessionId}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'No se pudo borrar el chat')
      return
    }
    const remaining = sessions.filter((session) => session.id !== sessionId)
    setSessions(remaining)
    if (selectedSessionId === sessionId) {
      if (remaining[0]?.id) {
        await loadSession(remaining[0].id)
      } else {
        await createChat(true)
      }
    }
  }

  async function addFiles(files: File[]) {
    if (files.length === 0) return
    setError(null)
    try {
      const nextAttachments = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith('video/')) {
            throw new Error('No se permiten videos en el chat de guiones.')
          }
          if (file.type.startsWith('image/')) {
            return {
              id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
              name: file.name,
              type: file.type,
              size: file.size,
              kind: 'image' as const,
              dataUrl: await fileToDataUrl(file),
            }
          }
          if (isTextFile(file)) {
            return {
              id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
              name: file.name,
              type: file.type || (file.name.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain'),
              size: file.size,
              kind: 'text' as const,
              content: await fileToText(file),
            }
          }
          throw new Error('Solo se permiten imagenes, .txt y .md.')
        }),
      )
      setAttachments((current) => [...current, ...nextAttachments].slice(0, 6))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo adjuntar el archivo')
    }
  }

  async function sendMessage(messageText = input) {
    const trimmed = messageText.trim()
    if ((!trimmed && attachments.length === 0) || isSending || chatError) return

    setError(null)
    setIsSending(true)
    const currentAttachments = attachments
    setInput('')
    setAttachments([])

    try {
      const sessionId = selectedSessionId || (await createChat(true)).id
      const response = await fetch(`/api/scripts/chats/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, attachments: currentAttachments }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo generar el guion')

      setMessages((current) => [...current, data.userMessage, data.assistantMessage])
      if (data.session) {
        setSessions((current) => {
          const withoutSession = current.filter((session) => session.id !== data.session.id)
          return [data.session, ...withoutSession]
        })
      }
    } catch (err) {
      setInput(trimmed)
      setAttachments(currentAttachments)
      setError(err instanceof Error ? err.message : 'No se pudo generar el guion')
    } finally {
      setIsSending(false)
    }
  }

  function insertScript(script: SavedScript) {
    const nextText = script.full_script.trim()
    setInput((current) => (current.trim() ? `${current.trim()}\n\n${nextText}` : nextText))
  }

  function openSaveModal(content: string, destination: 'library' | 'campaign' = 'library') {
    const nextContent = content.trim()
    if (!nextContent) {
      setError('Genera o selecciona un guion antes de guardarlo.')
      return
    }
    setSaveDestination(destination)
    setScriptContent(nextContent)
    setScriptTitle(titleFromScript(nextContent))
    setScriptNotes('')
    setSaveModalOpen(true)
    setError(null)
  }

  async function saveScript() {
    if (saveDestination === 'campaign' && !selectedCampaignId) {
      setError('Selecciona una campana para guardar este guion.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const campaignId = saveDestination === 'campaign' ? selectedCampaignId : null
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

      if (campaignId) {
        router.push(`/app/upload?campaign=${campaignId}&script=${data.script.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el guion')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-[1500px] flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Guiones</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">Crea ideas y scripts para grabar</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            Convierte briefs, imagenes, notas y borradores en scripts listos para Biblioteca o campana.
          </p>
        </div>
        <button
          onClick={() => createChat(true).catch((err) => setError(err instanceof Error ? err.message : 'No se pudo crear el chat'))}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nuevo chat
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[200px_minmax(300px,1fr)_220px] xl:grid-cols-[220px_minmax(340px,1fr)_240px] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <ChatSidebar
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          isLoading={isLoading}
          onSelect={(sessionId) => loadSession(sessionId).catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el chat'))}
          onRename={renameChat}
          onDelete={deleteChat}
        />

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-text-primary">{selectedSession?.title || 'Nuevo chat'}</h2>
              <p className="text-xs text-text-muted">Kimi K2.6 via OpenRouter</p>
            </div>
            {isLoading && <Loader variant="circular" size="sm" className="text-accent" />}
          </div>

          <ChatContainerRoot className="min-h-0 flex-1 bg-gradient-to-b from-white to-bg-elevated/40">
            <ChatContainerContent className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
              {chatError ? (
                <ChatErrorState error={chatError} onRetry={loadWorkspaceContent} />
              ) : messages.length === 0 ? (
                <EmptyChat onSelectStarter={sendMessage} />
              ) : (
                messages.map((message, index) => (
                  <ChatMessageBubble
                    key={message.id ?? `${message.role}-${index}`}
                    message={message}
                    onSave={() => openSaveModal(message.content, 'library')}
                  />
                ))
              )}

              {isSending && (
                <Message className="justify-start">
                  <MessageAvatar alt="Doble Labs" fallback="DL" className="bg-accent/10 text-accent" />
                  <MessageContent className="inline-flex w-auto items-center gap-2 px-3 py-2">
                    <Loader variant="typing" size="md" className="text-accent" />
                  </MessageContent>
                </Message>
              )}
              <ChatContainerScrollAnchor />
            </ChatContainerContent>
          </ChatContainerRoot>

          <div className="border-t border-border bg-white p-4">
            <AttachmentTray attachments={attachments} onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))} />
            <FileUpload onFilesAdded={addFiles} accept="image/*,.txt,.md,text/plain,text/markdown" disabled={isSending || Boolean(chatError)}>
              <PromptInput
                value={input}
                onValueChange={setInput}
                onSubmit={() => sendMessage()}
                isLoading={isSending}
                disabled={isSending || Boolean(chatError)}
                className="mx-auto max-w-3xl"
              >
                <PromptInputTextarea
                  placeholder={chatError ? 'Aplica la migracion para activar el chat...' : 'Escribe tu brief, oferta, tono o idea de video...'}
                  className="max-h-40"
                />
                <PromptInputActions className="justify-between px-1 pt-1">
                  <PromptInputAction tooltip="Adjuntar imagen, .txt o .md">
                    <FileUploadTrigger
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-text-primary"
                      aria-label="Adjuntar archivo"
                    >
                      <Paperclip className="h-4 w-4" />
                    </FileUploadTrigger>
                  </PromptInputAction>
                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={isSending || Boolean(chatError) || (!input.trim() && attachments.length === 0)}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white transition hover:bg-accent-hover disabled:opacity-50"
                    aria-label="Enviar mensaje"
                    title="Enviar"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </PromptInputActions>
              </PromptInput>
              <FileUploadContent>
                <div className="rounded-xl border border-dashed border-accent bg-white px-6 py-4 text-sm font-semibold text-accent shadow-xl">
                  Suelta imagenes, .txt o .md
                </div>
              </FileUploadContent>
            </FileUpload>
          </div>
        </section>

        <RecentScriptsPanel
          libraryScripts={libraryScripts}
          campaignScripts={campaignScripts}
          campaignNames={campaignNames}
          onInsert={insertScript}
          onCreateVideo={(script) => {
            if (script.campaign_id) router.push(`/app/upload?campaign=${script.campaign_id}&script=${script.id}`)
          }}
        />
      </div>

      {saveModalOpen && (
        <SaveScriptModal
          campaigns={campaigns}
          selectedCampaignId={selectedCampaignId}
          saveDestination={saveDestination}
          scriptTitle={scriptTitle}
          scriptContent={scriptContent}
          scriptNotes={scriptNotes}
          isSaving={isSaving}
          onClose={() => setSaveModalOpen(false)}
          onSave={saveScript}
          onCampaignChange={setSelectedCampaignId}
          onDestinationChange={setSaveDestination}
          onTitleChange={setScriptTitle}
          onContentChange={setScriptContent}
          onNotesChange={setScriptNotes}
        />
      )}
    </div>
  )
}

function ChatSidebar({
  sessions,
  selectedSessionId,
  isLoading,
  onSelect,
  onRename,
  onDelete,
}: {
  sessions: ChatSession[]
  selectedSessionId: string
  isLoading: boolean
  onSelect: (sessionId: string) => void
  onRename: (session: ChatSession) => void
  onDelete: (sessionId: string) => void
}) {
  return (
    <aside className="flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Chats</h2>
        {isLoading ? <Loader variant="circular" size="sm" className="text-accent" /> : <span className="text-xs text-text-muted">{sessions.length}</span>}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-text-muted">No hay chats guardados.</p>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                selectedSessionId === session.id ? 'bg-accent/10 text-text-primary' : 'text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{session.title}</p>
                <p className="text-xs text-text-muted">{formatDate(session.updated_at)}</p>
              </div>
              <span
                onClick={(event) => {
                  event.stopPropagation()
                  onRename(session)
                }}
                className="grid h-7 w-7 place-items-center rounded-md text-text-muted opacity-0 transition hover:bg-white hover:text-text-primary group-hover:opacity-100"
                role="button"
                aria-label="Renombrar chat"
                title="Renombrar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </span>
              <span
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(session.id)
                }}
                className="grid h-7 w-7 place-items-center rounded-md text-text-muted opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                role="button"
                aria-label="Borrar chat"
                title="Borrar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}

function EmptyChat({ onSelectStarter }: { onSelectStarter: (prompt: string) => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
        <Sparkles className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-text-primary">Empieza con un brief o una idea suelta</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">{emptyStateMessage}</p>
      <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
        {starters.map((starter) => (
          <button
            key={starter}
            onClick={() => onSelectStarter(starter)}
            className="rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-secondary shadow-sm transition hover:border-accent hover:text-text-primary"
          >
            {starter}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChatErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="mx-auto my-10 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-left shadow-sm">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <h2 className="font-semibold text-amber-950">El chat todavia no puede cargar</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">{error}</p>
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatMessageBubble({ message, onSave }: { message: ChatMessage; onSave: () => void }) {
  const isUser = message.role === 'user'
  const attachments = message.attachments ?? []

  return (
    <Message className={isUser ? 'justify-end' : 'justify-start'}>
      {!isUser && <MessageAvatar alt="Doble Labs" fallback="DL" className="bg-accent/10 text-accent" />}
      <div className={`flex max-w-[82%] flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          {isUser ? 'Tu brief' : 'Asistente'}
        </div>
        <MessageContent
          markdown={!isUser}
          className={
            isUser
              ? 'border-accent bg-accent px-4 py-3 text-white shadow-sm'
              : 'px-4 py-3'
          }
        >
          {message.content}
        </MessageContent>
        {attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1 text-xs text-text-secondary shadow-sm"
              >
                {attachmentIcon(attachment)}
                <span className="truncate">{attachment.name}</span>
              </span>
            ))}
          </div>
        )}
        {!isUser && (
          <MessageActions className="opacity-100">
            <MessageAction tooltip="Guardar script">
              <button
                onClick={onSave}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary"
              >
                <Save className="h-3.5 w-3.5" />
                Guardar
              </button>
            </MessageAction>
          </MessageActions>
        )}
      </div>
      {isUser && <MessageAvatar alt="Usuario" fallback="TU" className="bg-bg-elevated text-text-secondary" />}
    </Message>
  )
}

function AttachmentTray({ attachments, onRemove }: { attachments: ChatAttachment[]; onRemove: (id: string) => void }) {
  if (attachments.length === 0) return null
  return (
    <div className="mx-auto mb-3 flex max-w-3xl flex-wrap gap-2">
      {attachments.map((attachment) => (
        <span key={attachment.id} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-xs text-text-secondary">
          {attachmentIcon(attachment)}
          <span className="truncate">{attachment.name}</span>
          <span className="text-text-muted">{formatSize(attachment.size)}</span>
          <button
            onClick={() => onRemove(attachment.id)}
            className="text-text-muted transition hover:text-red-600"
            aria-label="Quitar archivo"
            title="Quitar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  )
}

function RecentScriptsPanel({
  libraryScripts,
  campaignScripts,
  campaignNames,
  onInsert,
  onCreateVideo,
}: {
  libraryScripts: SavedScript[]
  campaignScripts: SavedScript[]
  campaignNames: Map<string, string>
  onInsert: (script: SavedScript) => void
  onCreateVideo: (script: SavedScript) => void
}) {
  return (
    <aside className="flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Recientes</h2>
        <p className="mt-1 text-xs text-text-muted">Inserta borradores o scripts en el chat.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ScriptSection
          title="Biblioteca"
          icon={<Library className="h-3.5 w-3.5" />}
          empty="Sin borradores."
          scripts={libraryScripts.slice(0, 5)}
          campaignName={() => 'Biblioteca'}
          onInsert={onInsert}
        />
        <ScriptSection
          title="Campanas"
          icon={<FolderOpen className="h-3.5 w-3.5" />}
          empty="Sin scripts de campana."
          scripts={campaignScripts.slice(0, 6)}
          campaignName={(script) => (script.campaign_id ? campaignNames.get(script.campaign_id) ?? 'Campana' : 'Biblioteca')}
          onInsert={onInsert}
          onCreateVideo={onCreateVideo}
        />
      </div>
    </aside>
  )
}

function ScriptSection({
  title,
  icon,
  empty,
  scripts,
  campaignName,
  onInsert,
  onCreateVideo,
}: {
  title: string
  icon: React.ReactNode
  empty: string
  scripts: SavedScript[]
  campaignName: (script: SavedScript) => string
  onInsert: (script: SavedScript) => void
  onCreateVideo?: (script: SavedScript) => void
}) {
  return (
    <section className="mb-5 last:mb-0">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-text-muted">
        {icon}
        {title}
      </div>
      {scripts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-bg-elevated/60 p-3 text-sm text-text-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              campaignName={campaignName(script)}
              onInsert={() => onInsert(script)}
              onCreateVideo={script.campaign_id && onCreateVideo ? () => onCreateVideo(script) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ScriptCard({
  script,
  campaignName,
  onInsert,
  onCreateVideo,
}: {
  script: SavedScript
  campaignName: string
  onInsert: () => void
  onCreateVideo?: () => void
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-3 shadow-sm transition hover:border-accent/40">
      <h3 className="truncate text-sm font-semibold text-text-primary">{script.title || 'Script sin titulo'}</h3>
      <p className="mt-1 text-xs text-text-muted">{campaignName} · {formatDate(script.updated_at)}</p>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-5 text-text-secondary">{script.full_script}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onInsert}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Insertar
        </button>
        {onCreateVideo && (
          <button
            onClick={onCreateVideo}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-hover"
          >
            <FileText className="h-3.5 w-3.5" />
            Video
          </button>
        )}
      </div>
    </article>
  )
}

function SaveScriptModal({
  campaigns,
  selectedCampaignId,
  saveDestination,
  scriptTitle,
  scriptContent,
  scriptNotes,
  isSaving,
  onClose,
  onSave,
  onCampaignChange,
  onDestinationChange,
  onTitleChange,
  onContentChange,
  onNotesChange,
}: {
  campaigns: Campaign[]
  selectedCampaignId: string
  saveDestination: 'library' | 'campaign'
  scriptTitle: string
  scriptContent: string
  scriptNotes: string
  isSaving: boolean
  onClose: () => void
  onSave: () => void
  onCampaignChange: (value: string) => void
  onDestinationChange: (value: 'library' | 'campaign') => void
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onNotesChange: (value: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Editar y guardar script</h2>
            <p className="mt-1 text-sm text-text-muted">Guarda una version editable en Biblioteca o en una campana.</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-text-primary"
            aria-label="Cerrar"
            title="Cerrar"
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
                onChange={(event) => onTitleChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </label>
            <label className="text-sm font-medium text-text-secondary">
              Destino
              <select
                value={saveDestination}
                onChange={(event) => onDestinationChange(event.target.value as 'library' | 'campaign')}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              >
                <option value="library">Biblioteca</option>
                <option value="campaign">Campana</option>
              </select>
            </label>
          </div>

          {saveDestination === 'campaign' && (
            <label className="block text-sm font-medium text-text-secondary">
              Campana
              <select
                value={selectedCampaignId}
                onChange={(event) => onCampaignChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              >
                <option value="">Selecciona una campana</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm font-medium text-text-secondary">
            Script editable
            <textarea
              value={scriptContent}
              onChange={(event) => onContentChange(event.target.value)}
              className="mt-1 min-h-[280px] w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm leading-6 text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>

          <label className="block text-sm font-medium text-text-secondary">
            Notas
            <textarea
              value={scriptNotes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Tono, ritmo, palabras que deben sonar naturales..."
              className="mt-1 min-h-[90px] w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm leading-6 text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={isSaving || !scriptContent.trim() || (saveDestination === 'campaign' && !selectedCampaignId)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saveDestination === 'campaign' ? 'Guardar y crear video' : 'Guardar en Biblioteca'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
