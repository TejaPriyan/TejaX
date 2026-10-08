// Shared client-side types mirroring the backend schemas.

export type MissionStatus =
  | 'CREATED' | 'PLANNING' | 'RESEARCHING' | 'DEVELOPING' | 'EXPERIMENTING'
  | 'EVALUATING' | 'IMPROVING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELLED'
  | 'AWAITING_APPROVAL' | 'REJECTED'

export type AgentStatus = 'OFFLINE' | 'ONLINE' | 'ACTIVE' | 'WAITING' | 'WARNING' | 'ERROR'
export type AgentType = 'planner' | 'researcher' | 'coder' | 'scientist' | 'critic' | 'analyst' | 'memory' | 'tester'

export interface Mission {
  id: string
  title: string
  description: string
  status: MissionStatus
  currentPhase: string
  maxIterations: number
  error: string | null
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  report: Report | null
  objectives?: Objective[]
  datasetFilename?: string | null
  datasetMetadata?: {
    filename?: string
    rows?: number
    columns?: string[]
    size_bytes?: number
    preview?: Record<string, unknown>[]
  } | null
}

export interface Objective {
  id: string
  index: number
  title: string
  description: string
  status: string
}

export interface AgentInfo {
  id: string
  type: AgentType
  name: string
  status: AgentStatus
  missionId: string | null
  currentTask: string | null
  progress: number
}

export type EvidenceType = 'REAL' | 'SYNTHETIC' | 'DEMO' | 'UNKNOWN'
export type SandboxSecurity = 'LOCAL' | 'DOCKER' | 'RESTRICTED' | 'DISABLED'

export interface LedgerStep {
  step: number
  phase: string
  event: string
  detail: string
}

export interface ProvenanceSummary {
  model_provider?: string
  model_name?: string
  evidence_type?: EvidenceType
  sandbox_type?: SandboxSecurity
  network_isolated?: boolean
  total_iterations?: number
  score_trajectory?: number[]
  final_score?: number | null
}

export interface Experiment {
  id: string
  missionId: string
  name: string
  iteration: number
  hypothesis: string
  status: string
  code: string
  stdout: string
  stderr: string
  exitCode: number | null
  executionTime: number | null
  metrics: Record<string, number | string> | null
  error: string | null
  createdAt: string | null
  completedAt: string | null
  evidenceType?: EvidenceType
  sandboxType?: SandboxSecurity
  parentExperimentId?: string | null
  modelProvider?: string | null
  modelName?: string | null
  randomSeed?: number | null
  revisionReason?: string | null
  provenance?: Record<string, unknown> | null
}

export interface TimelineEvent {
  eventId: string
  type: string
  timestamp: number
  missionId: string | null
  agentId: string | null
  payload: Record<string, unknown>
}

export interface Report {
  problem: string
  approach: string
  research: string
  agents_involved: string[]
  experiments: {
    name?: string
    status?: string
    metrics?: Record<string, unknown>
    executionTime?: number | null
    evidenceType?: EvidenceType
    sandboxType?: SandboxSecurity
  }[]
  iterations: number
  failures: string[]
  improvements: string[]
  final_solution: string
  confidence: string
  limitations: string[]
  next_steps: string[]
  evidence_type?: EvidenceType
  sandbox_security?: SandboxSecurity
  provenance_summary?: ProvenanceSummary
  ledger?: LedgerStep[]
}

export interface SystemStatus {
  hosted?: boolean
  notice?: string
  app: string
  version: string
  mode: string
  agentsOnline: number
  memoryCount: number
  currentMission: { id: string; title: string; status: string; phase: string } | null
  experimentsRunning: number
  runningMissions: number
  websocketClients: number
  humanApproval: boolean
  modelStatus: { provider: string; model: string; ok: boolean | null }
}

export interface SystemMetrics {
  tasksCompleted: number
  tasksFailed: number
  successfulExperiments: number
  failedExperiments: number
  experimentSuccessRate: number
  averageIterations: number
  improvementPercentage: number
  agentUtilization: number
  missionCompletionRate: number
  memoryRetrievals: number
  errorRecoveryRate: number
  totalMissions: number
}

export interface MemoryItem {
  id: string
  type: string
  content: string
  source: string
  mission_id: string | null
  importance: number
  score?: number
  created_at: string | null
}

export interface AgentTask {
  id: string
  agentType: string
  description: string
  status: string
  priority: number
  dependencies: string[]
  error: string | null
  attempts: number
}
