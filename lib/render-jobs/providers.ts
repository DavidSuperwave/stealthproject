export type RenderProviderName = 'mock' | 'lipdub' | 'fal_kling'

export interface RenderProviderSubmitInput {
  jobId: string
  providerModel: string
  input: Record<string, unknown>
}

export interface RenderProviderSubmitResult {
  providerRequestId: string
  providerJobId?: string
  status: 'submitted' | 'in_progress' | 'completed'
  progress: number
  output?: Record<string, unknown>
}

export interface RenderProvider {
  name: RenderProviderName
  submit(input: RenderProviderSubmitInput): Promise<RenderProviderSubmitResult>
}

function createRequestId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const mockProvider: RenderProvider = {
  name: 'mock',
  async submit({ jobId, input }) {
    const completeImmediately = input.mock_complete_immediately === true
    return {
      providerRequestId: createRequestId('mock_req'),
      providerJobId: `mock_job_${jobId.slice(0, 8)}`,
      status: completeImmediately ? 'completed' : 'in_progress',
      progress: completeImmediately ? 100 : 18,
      output: completeImmediately
        ? {
            preview_available: false,
            note: 'Mock provider completed immediately.',
          }
        : undefined,
    }
  },
}

export function getRenderProvider(provider: string): RenderProvider {
  switch (provider) {
    case 'mock':
      return mockProvider
    default:
      throw new Error(`Provider "${provider}" is not enabled yet.`)
  }
}

export const ENABLED_RENDER_PROVIDERS: RenderProviderName[] = ['mock']
