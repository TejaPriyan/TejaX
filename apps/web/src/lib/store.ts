import { create } from 'zustand'
import { api, wsUrl } from './api'
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
  connectionError: string | null
  loading: boolean
  stop: () => void
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

let polling: ReturnType<typeof setTimeout> | undefined
let reconnect: ReturnType<typeof setTimeout> | undefined
let socket: WebSocket | null = null
let generation = 0
let selection = 0
let booted = false
const message = (e: unknown) => e instanceof Error ? e.message : 'Backend unavailable'

// URL parameter or hash check
const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const hash = typeof window !== 'undefined' ? window.location.hash : ''
const defaultView: View = (searchParams?.get('view') as View) || (hash === '#site' ? 'site' : 'app')
const requestedPage = searchParams?.get('page')
const defaultPage: Page = (['command','missions','lab','agents','experiments','memory','analytics','settings'].includes(requestedPage || '') ? requestedPage : 'lab') as Page

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
  connectionError: null,
  loading: true,
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
    if (booted) return
    booted = true
    const current = ++generation
    const sync = async () => {
      if (current !== generation) return
      await get().refreshSystem()
      if (current !== generation) return
      if (!get().connectionError) {
        get().connectWs()
        await get().loadMissions()
        const id = get().selectedMissionId || get().missions[0]?.id
        if (id) await get().selectMission(id)
      }
      if (current === generation) polling = setTimeout(sync, 4000)
    }
    await sync()
  },
  stop: () => {
    booted = false
    generation++
    selection++
    clearTimeout(polling)
    clearTimeout(reconnect)
    if (socket) { socket.onclose = null; socket.close(); socket = null }
    set({ wsConnected: false })
  },

  refreshSystem: async () => {
    try {
      // Establish the hosted browser session before issuing other API requests.
      const status = await api.systemStatus()
      const metrics = await api.systemMetrics()
      set({ systemStatus: status, metrics, connectionError: null, loading: false })
    } catch (e) {
      set({ connectionError: message(e), loading: false })
    }
  },

  loadMissions: async () => {
    try {
      const missions = await api.listMissions()
      set({ missions })
    } catch (e) {
      set({ connectionError: message(e) })
    }
  },

  selectMission: async (id) => {
    const token = ++selection
    if (get().selectedMissionId !== id) set({ selectedMissionId: id, selectedAgentType: null, mission: null, agents: [], timeline: [], tasks: [], experiments: [] })
    try {
      const [mission, agents, experiments, tasks, timeline] = await Promise.all([
        api.getMission(id),
        api.missionAgents(id),
        api.missionExperiments(id),
        api.missionTasks(id),
        api.missionTimeline(id),
      ])
      if (token === selection && get().selectedMissionId === id) set({ mission, agents, experiments, tasks, timeline })
    } catch (e) {
      set({ connectionError: message(e) })
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
      set({ connectionError: message(e) })
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
      const timeline = [...s.timeline.filter(e => e.eventId !== ev.eventId), ev].slice(-400)
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
  },

  connectWs: () => {
    if (!booted || reconnect || (socket && socket.readyState < WebSocket.CLOSING)) return
    const ws = new WebSocket(wsUrl())
    socket = ws
    ws.onopen = () => set({ wsConnected: true })
    ws.onmessage = (msg) => {
      try { const ev = JSON.parse(msg.data); if (ev.eventId && ev.type) get().handleEvent(ev) } catch { /* malformed frame */ }
    }
    ws.onclose = () => {
      if (socket !== ws) return
      socket = null
      set({ wsConnected: false })
      if (booted) reconnect = setTimeout(() => { reconnect = undefined; get().connectWs() }, 8000)
    }
    ws.onerror = () => ws.close()
  },
}))
