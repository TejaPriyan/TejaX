// Thin API client. All calls are same-origin (proxied by Vite to FastAPI).
import type {
  AgentInfo,
  AgentTask,
  Experiment,
  MemoryItem,
  Mission,
  SystemMetrics,
  SystemStatus,
  TimelineEvent,
} from './types'

const env = (import.meta as unknown as { env: Record<string, string> }).env
export const API_BASE = (env.VITE_API_URL || '').replace(/\/$/, '')
export function wsUrl(): string {
  const url = new URL(env.VITE_WS_URL || `${API_BASE || location.origin}/ws`, location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : url.protocol === 'http:' ? 'ws:' : url.protocol
  return url.toString()
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
  const res = await fetch(`${API_BASE}${path}`, {
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} — ${text.slice(0, 200)}`)
  }
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The server returned a web page instead of the API. Configure VITE_API_URL to your running TejaX backend and rebuild.')
  }
  const data = await res.json()
  if (data?.ok === false) throw new Error(data.error || 'This action is not available in the current mission state.')
  return data as T
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The backend did not respond within 20 seconds. Retry when it is available.')
    throw error
  } finally { clearTimeout(timeout) }
}

export const api = {
  // datasets
  uploadDataset: (filename: string, content: string): Promise<{
    filename: string
    rows: number
    columns: string[]
    size_bytes: number
    preview: Record<string, unknown>[]
    content: string
  }> => request('/api/datasets/upload', { method: 'POST', body: JSON.stringify({ filename, content }) }),

  // missions
  createMission: (payload: {
    title: string
    description: string
    maxIterations: number
    dataset_filename?: string | null
    dataset_content?: string | null
    dataset_metadata?: Record<string, unknown> | null
  }): Promise<Mission> =>
    request<Mission>('/api/missions', { method: 'POST', body: JSON.stringify(payload) }),
  listMissions: (): Promise<Mission[]> => request<Mission[]>('/api/missions'),
  getMission: (id: string): Promise<Mission> => request<Mission>(`/api/missions/${id}`),
  startMission: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/api/missions/${id}/start`, { method: 'POST' }),
  pauseMission: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/api/missions/${id}/pause`, { method: 'POST' }),
  cancelMission: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/api/missions/${id}/cancel`, { method: 'POST' }),
  approveMission: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/api/missions/${id}/approve`, { method: 'POST' }),
  rejectMission: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/api/missions/${id}/reject`, { method: 'POST' }),
  missionTimeline: (id: string): Promise<TimelineEvent[]> => request<TimelineEvent[]>(`/api/missions/${id}/timeline`),
  missionAgents: (id: string): Promise<AgentInfo[]> => request<AgentInfo[]>(`/api/missions/${id}/agents`),
  missionExperiments: (id: string): Promise<Experiment[]> => request<Experiment[]>(`/api/missions/${id}/experiments`),
  missionTasks: (id: string): Promise<AgentTask[]> => request<AgentTask[]>(`/api/missions/${id}/tasks`),

  // agents
  listAgents: (missionId?: string): Promise<AgentInfo[]> =>
    request<AgentInfo[]>(`/api/agents${missionId ? `?mission_id=${missionId}` : ''}`),

  // memory
  searchMemory: (q: string, type?: string): Promise<{ query: string; results: MemoryItem[] }> =>
    request<{ query: string; results: MemoryItem[] }>(
      `/api/memory/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`,
    ),

  // system
  systemStatus: (): Promise<SystemStatus> => request<SystemStatus>('/api/system/status'),
  systemMetrics: (): Promise<SystemMetrics> => request<SystemMetrics>('/api/system/metrics'),
  observability: (): Promise<unknown> => request<unknown>('/api/system/observability'),
  runDemo: (): Promise<{ ok: boolean; missionId: string }> =>
    request<{ ok: boolean; missionId: string }>('/api/system/demo', { method: 'POST' }),

  // model configuration
  getModel: (): Promise<ModelStatus> => request<ModelStatus>('/api/system/model'),
  updateModel: (payload: ModelConfigUpdate): Promise<ModelStatus> =>
    request<ModelStatus>('/api/system/model', { method: 'PUT', body: JSON.stringify(payload) }),
  testModel: (): Promise<{ ok: boolean; provider: string; model: string; latencyMs: number; sample?: string; error?: string }> =>
    request<{ ok: boolean; provider: string; model: string; latencyMs: number; sample?: string; error?: string }>('/api/system/model/test', { method: 'POST' }),
}

export interface ModelConfigUpdate {
  provider?: string
  model?: string
  base_url?: string
  api_key?: string
  human_approval?: boolean
}

export interface ModelStatus {
  config: { provider: string; model: string; base_url: string; api_key: string; human_approval: boolean }
  effectiveProvider: string
  effectiveModel: string
  health: { provider: string; ok: boolean; models?: string[]; error?: string }
}
