import { create } from 'zustand'
import { api } from './api'
import { sound } from './sound'
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

export type Page =
  | 'command'
  | 'missions'
  | 'lab'
  | 'agents'
  | 'experiments'
  | 'memory'
  | 'analytics'
  | 'settings'

// `view` is the top-level mode: the public company website ("site") or the
// internal lab application ("app"). Both consume the same backend/store.
export type View = 'site' | 'app'

interface State {
  view: View
  page: Page
  missions: Mission[]
  selectedMissionId: string | null
  mission: Mission | null
  agents: AgentInfo[]
  experiments: Experiment[]
  tasks: AgentTask[]
  timeline: TimelineEvent[]
  systemStatus: SystemStatus | null
  metrics: SystemMetrics | null
  memoryResults: MemoryItem[]
  observability: unknown
  wsConnected: boolean
  performanceMode: boolean
  selectedAgentType: string | null
  soundEnabled: boolean

  setPage: (p: Page) => void
  setView: (v: View) => void
  setPerformanceMode: (v: boolean) => void
  setSelectedAgentType: (t: string | null) => void
  toggleSound: () => void

  boot: () => Promise<void>
  refreshSystem: () => Promise<void>
  loadMissions: () => Promise<void>
  selectMission: (id: string) => Promise<void>
  createMission: (
    title: string,
    description: string,
    dataset?: { filename: string; content?: string; metadata?: Record<string, unknown> } | null,
  ) => Promise<Mission>
  startMission: (id: string) => Promise<void>
  pauseMission: (id: string) => Promise<void>
  cancelMission: (id: string) => Promise<void>
  approveMission: (id: string) => Promise<void>
  rejectMission: (id: string) => Promise<void>
  runDemo: () => Promise<string | null>
  searchMemory: (q: string, type?: string) => Promise<void>
  loadObservability: () => Promise<void>

  handleEvent: (ev: TimelineEvent) => void
  connectWs: () => void
}

function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws`
}

// URL parameter or hash check
const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const hash = typeof window !== 'undefined' ? window.location.hash : ''
const defaultView: View = (searchParams?.get('view') as View) || (hash === '#site' ? 'site' : 'app')
const defaultPage: Page = (searchParams?.get('page') as Page) || 'command'

export const useStore = create<State>((set, get) => ({
  view: defaultView,
  page: defaultPage,
  missions: [],
  selectedMissionId: null,
  mission: null,
  agents: [],
  experiments: [],
  tasks: [],
  timeline: [],
  systemStatus: null,
  metrics: null,
  memoryResults: [],
  observability: null,
  wsConnected: false,
  performanceMode: false,
  selectedAgentType: null,
  soundEnabled: sound.enabled,

  setPage: (p) => set({ page: p }),
  setView: (v) => set({ view: v }),
  setPerformanceMode: (v) => set({ performanceMode: v }),
  setSelectedAgentType: (t) => set({ selectedAgentType: t }),
  toggleSound: () => {
    const next = !get().soundEnabled
    sound.setEnabled(next)
    set({ soundEnabled: next })
  },

  boot: async () => {
    get().connectWs()
    await Promise.all([get().refreshSystem(), get().loadMissions()])
    const missions = get().missions
    if (missions.length && !get().selectedMissionId) {
      // auto-select most recent
      await get().selectMission(missions[0].id)
    }
    // Gentle polling keeps mission status/phase/experiments fresh while running.
    setInterval(() => {
      const s = get()
      if (!s.selectedMissionId) return
      const status = s.mission?.status
      const running = ['CREATED', 'PLANNING', 'RESEARCHING', 'DEVELOPING', 'EXPERIMENTING', 'EVALUATING', 'IMPROVING'].includes(status ?? '')
      if (running) {
        s.selectMission(s.selectedMissionId!).catch(() => {})
      }
      s.refreshSystem()
    }, 4000)
  },

  refreshSystem: async () => {
    try {
      const [status, metrics] = await Promise.all([api.systemStatus(), api.systemMetrics()])
      set({ systemStatus: status, metrics })
    } catch {
      /* offline — UI still renders */
    }
  },

  loadMissions: async () => {
    try {
      const missions = await api.listMissions()
      set({ missions })
    } catch {
      /* ignore */
    }
  },

  selectMission: async (id) => {
    set({ selectedMissionId: id, selectedAgentType: null })
    try {
      const [mission, agents, experiments, tasks, timeline] = await Promise.all([
        api.getMission(id),
        api.missionAgents(id),
        api.missionExperiments(id),
        api.missionTasks(id),
        api.missionTimeline(id),
      ])
      set({ mission, agents, experiments, tasks, timeline })
    } catch {
      /* ignore */
    }
  },

  createMission: async (title, description, dataset) => {
    const mission = (await api.createMission({
      title,
      description,
      maxIterations: 5,
      dataset_filename: dataset?.filename,
      dataset_content: dataset?.content,
      dataset_metadata: dataset?.metadata,
    })) as Mission
    await get().loadMissions()
    await get().selectMission(mission.id)
    return mission
  },

  startMission: async (id) => {
    await api.startMission(id)
    set({ selectedMissionId: id })
    await get().selectMission(id)
  },

  approveMission: async (id) => {
    await api.approveMission(id)
    await get().selectMission(id)
  },

  rejectMission: async (id) => {
    await api.rejectMission(id)
    await get().selectMission(id)
  },

  pauseMission: async (id) => {
    await api.pauseMission(id)
  },

  cancelMission: async (id) => {
    await api.cancelMission(id)
  },

  runDemo: async () => {
    try {
      const res = (await api.runDemo()) as { missionId: string; alreadyRunning?: boolean }
      await get().loadMissions()
      await get().selectMission(res.missionId)
      return res.missionId
    } catch (e) {
      console.error(e)
      return null
    }
  },

  searchMemory: async (q, type) => {
    const res = (await api.searchMemory(q, type)) as { results: MemoryItem[] }
    set({ memoryResults: res.results })
  },

  loadObservability: async () => {
    const obs = await api.observability()
    set({ observability: obs })
  },

  handleEvent: (ev) => {
    const s = get()
    if (ev.missionId && ev.missionId === s.selectedMissionId) {
      const timeline = [...s.timeline, ev].slice(-400)
      set({ timeline })

      // live agent status
      if (ev.type === 'AGENT_STATUS' && ev.payload) {
        const p = ev.payload as { agentType: string; status: string; currentTask?: string; progress?: number }
        set({
          agents: s.agents.map((a) =>
            a.type === p.agentType
              ? { ...a, status: p.status as AgentInfo['status'], currentTask: p.currentTask ?? a.currentTask, progress: p.progress ?? a.progress }
              : a,
          ),
        })
      }
      if (ev.type === 'MISSION_STARTED' && s.mission) set({ mission: { ...s.mission, status: 'PLANNING' } })
      if (ev.type === 'MISSION_COMPLETED' && s.mission) {
        set({ mission: { ...s.mission, status: 'COMPLETED', currentPhase: 'FINAL_RESULT' } })
        get().selectMission(s.selectedMissionId!).catch(() => {})
        get().loadMissions()
        get().refreshSystem()
      }
      if (ev.type === 'MISSION_FAILED' && s.mission) {
        set({ mission: { ...s.mission, status: 'FAILED' } })
        get().selectMission(s.selectedMissionId!).catch(() => {})
        get().loadMissions()
      }
      if (ev.type === 'MISSION_CANCELLED' && s.mission) set({ mission: { ...s.mission, status: 'CANCELLED' } })
      if (ev.type === 'MISSION_PAUSED' && s.mission) set({ mission: { ...s.mission, status: 'PAUSED' } })
      if (ev.type === 'REJECTED' && s.mission) {
        set({ mission: { ...s.mission, status: 'REJECTED' } })
        get().selectMission(s.selectedMissionId!).catch(() => {})
      }
      if (ev.type === 'APPROVAL_REQUESTED' && s.mission) {
        set({ mission: { ...s.mission, status: 'AWAITING_APPROVAL', currentPhase: 'APPROVAL' } })
        get().selectMission(s.selectedMissionId!).catch(() => {})
      }
      if (ev.type === 'APPROVED') get().selectMission(s.selectedMissionId!).catch(() => {})
      if (ev.type === 'TEST_COMPLETED') get().selectMission(s.selectedMissionId!).catch(() => {})
      if (ev.type === 'EXPERIMENT_COMPLETED') get().selectMission(s.selectedMissionId!).catch(() => {})
    }
    get().refreshSystem()
  },

  connectWs: () => {
    if (get().wsConnected) return
    let ws: WebSocket | null = null
    let retries = 0
    const connect = () => {
      ws = new WebSocket(wsUrl())
      ws.onopen = () => {
        set({ wsConnected: true })
        retries = 0
      }
      ws.onmessage = (msg) => {
        try {
          const ev = JSON.parse(msg.data) as TimelineEvent
          get().handleEvent(ev)
        } catch {
          /* ignore malformed frames */
        }
      }
      ws.onclose = () => {
        set({ wsConnected: false })
        retries += 1
        if (retries <= 8) setTimeout(connect, Math.min(1000 * retries, 8000))
      }
      ws.onerror = () => ws?.close()
    }
    connect()
  },
}))
