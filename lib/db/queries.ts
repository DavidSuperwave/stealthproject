import type { SupabaseClient } from '@supabase/supabase-js'

// ── Subscriptions ──────────────────────────────────────────

export interface UserSubscription {
  credits_remaining: number
  status: string
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('credits_remaining, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return data as UserSubscription
}

// ── Projects ───────────────────────────────────────────────

export interface ProjectRow {
  id: string
  name: string
  type: 'personalization' | 'translation'
  status: 'draft' | 'processing' | 'completed' | 'failed'
  source_language: string
  created_at: string
  updated_at: string
}

export async function getProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, type, status, source_language, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) return []
  return (data ?? []) as ProjectRow[]
}

export interface ProjectWithGeneration extends ProjectRow {
  generation_status: string | null
  shot_id: number | null
  generate_id: string | null
}

export async function getProjectsWithGeneration(
  supabase: SupabaseClient,
  userId: string
): Promise<ProjectWithGeneration[]> {
  const projects = await getProjects(supabase, userId)
  if (projects.length === 0) return []

  const projectIds = projects.map(p => p.id)

  // Fetch latest generation job per project
  const { data: jobs } = await supabase
    .from('generation_jobs')
    .select('project_id, shot_id, generate_id, status')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })

  // Build a map: project_id → latest generation job
  const jobMap = new Map<string, { status: string; shot_id: number | null; generate_id: string | null }>()
  for (const job of (jobs ?? [])) {
    if (!jobMap.has(job.project_id)) {
      jobMap.set(job.project_id, {
        status: job.status,
        shot_id: job.shot_id,
        generate_id: job.generate_id,
      })
    }
  }

  return projects.map(p => {
    const gen = jobMap.get(p.id)
    return {
      ...p,
      generation_status: gen?.status ?? null,
      shot_id: gen?.shot_id ?? null,
      generate_id: gen?.generate_id ?? null,
    }
  })
}

export async function getProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, type, status, source_language, created_at, updated_at')
    .eq('id', projectId)
    .single()

  if (error || !data) return null
  return data as ProjectRow
}

export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  params: { name: string; type: 'personalization' | 'translation' }
) {
  return supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: params.name,
      type: params.type,
      status: 'draft',
      source_language: 'Spanish (Mexico)',
    })
    .select('id, name, type, status')
    .single()
}

export async function updateProjectStatus(
  supabase: SupabaseClient,
  projectId: string,
  status: 'draft' | 'processing' | 'completed' | 'failed'
) {
  return supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId)
}

// ── Videos ─────────────────────────────────────────────────

export interface VideoRow {
  id: string
  project_id: string
  file_name: string | null
  file_size: number | null
  lipdub_project_id: number | null
  lipdub_scene_id: number | null
  lipdub_actor_id: number | null
  lipdub_video_id: string | null
  upload_status: string
}

export async function upsertVideo(
  supabase: SupabaseClient,
  projectId: string,
  params: {
    lipdub_project_id?: number
    lipdub_scene_id?: number
    lipdub_actor_id?: number
    lipdub_video_id?: string
    file_name?: string
    file_size?: number
    upload_status?: string
  }
) {
  const existing = await supabase
    .from('videos')
    .select('id')
    .eq('project_id', projectId)
    .limit(1)
    .maybeSingle()

  if (existing.data?.id) {
    return supabase
      .from('videos')
      .update({ ...params })
      .eq('id', existing.data.id)
      .select()
      .single()
  }

  return supabase
    .from('videos')
    .insert({ project_id: projectId, ...params })
    .select()
    .single()
}

// ── Audio Files ────────────────────────────────────────────

export interface AudioRow {
  id: string
  project_id: string
  audio_id: string | null
  file_name: string | null
  content_type: string | null
  upload_status: string
}

export async function upsertAudioFile(
  supabase: SupabaseClient,
  projectId: string,
  params: {
    audio_id?: string
    file_name?: string
    content_type?: string
    upload_status?: string
  }
) {
  const existing = await supabase
    .from('audio_files')
    .select('id')
    .eq('project_id', projectId)
    .limit(1)
    .maybeSingle()

  if (existing.data?.id) {
    return supabase
      .from('audio_files')
      .update({ ...params })
      .eq('id', existing.data.id)
      .select()
      .single()
  }

  return supabase
    .from('audio_files')
    .insert({ project_id: projectId, ...params })
    .select()
    .single()
}

// ── Generation Jobs ────────────────────────────────────────

export interface GenerationJobRow {
  id: string
  project_id: string
  user_id: string | null
  shot_id: number | null
  generate_id: string | null
  audio_id: string | null
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  current_step: string | null
  error: string | null
  download_url: string | null
  notified_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export async function createGenerationJob(
  supabase: SupabaseClient,
  params: {
    project_id: string
    user_id: string
    shot_id: number
    generate_id: string
    audio_id?: string
  }
) {
  return supabase
    .from('generation_jobs')
    .insert({
      project_id: params.project_id,
      user_id: params.user_id,
      shot_id: params.shot_id,
      generate_id: params.generate_id,
      audio_id: params.audio_id ?? null,
      status: 'processing',
      progress: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
}

export async function getGenerationJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<GenerationJobRow | null> {
  const { data, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) return null
  return data as GenerationJobRow
}

export async function getPendingGenerationJobs(
  supabase: SupabaseClient
): Promise<GenerationJobRow[]> {
  const { data, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as GenerationJobRow[]
}

export async function updateGenerationJob(
  supabase: SupabaseClient,
  jobId: string,
  params: Partial<Pick<GenerationJobRow, 'status' | 'progress' | 'current_step' | 'error' | 'download_url' | 'notified_at' | 'completed_at'>>
) {
  return supabase
    .from('generation_jobs')
    .update(params)
    .eq('id', jobId)
}

export async function getUserGenerationJobs(
  supabase: SupabaseClient,
  userId: string
): Promise<GenerationJobRow[]> {
  const { data, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return (data ?? []) as GenerationJobRow[]
}

// ── Notifications ──────────────────────────────────────────

export interface NotificationRow {
  id: string
  user_id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

export async function createNotification(
  supabase: SupabaseClient,
  params: {
    user_id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    body?: string
    href?: string
  }
) {
  return supabase
    .from('notifications')
    .insert({
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      href: params.href ?? null,
    })
    .select()
    .single()
}

export async function getUnreadNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return (data ?? []) as NotificationRow[]
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string
) {
  return supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
) {
  return supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
}

// ── Draft Resume ───────────────────────────────────────────

export interface ProjectDraft {
  project: ProjectRow
  video: VideoRow | null
  audio: AudioRow | null
  generation: GenerationJobRow | null
}

export async function getProjectDraft(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectDraft | null> {
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, name, type, status, source_language, created_at, updated_at')
    .eq('id', projectId)
    .single()

  if (pErr || !project) return null

  const { data: video } = await supabase
    .from('videos')
    .select('id, project_id, file_name, file_size, lipdub_project_id, lipdub_scene_id, lipdub_actor_id, lipdub_video_id, upload_status')
    .eq('project_id', projectId)
    .limit(1)
    .maybeSingle()

  const { data: audio } = await supabase
    .from('audio_files')
    .select('id, project_id, audio_id, file_name, content_type, upload_status')
    .eq('project_id', projectId)
    .limit(1)
    .maybeSingle()

  // Fetch latest generation job for this project
  const { data: generation } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    project: project as ProjectRow,
    video: (video as VideoRow) ?? null,
    audio: (audio as AudioRow) ?? null,
    generation: (generation as GenerationJobRow) ?? null,
  }
}
