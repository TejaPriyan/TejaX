import type { AgentStatus, AgentType } from './types'

export interface AgentMeta {
  type: AgentType
  name: string
  role: string
  color: string
  glyph: string
  shape: 'tower' | 'ring' | 'prism' | 'sphere' | 'spike' | 'hex' | 'core' | 'tetra'
  avatar: string
}

export const AGENTS: AgentMeta[] = [
  {
    type: 'planner',
    name: 'Planner',
    role: 'Mission decomposition & task graph',
    color: '#3dd6ff',
    glyph: '◇',
    shape: 'tower',
    avatar: '/pixel/characters/male_adventurer/character_maleAdventurer_idle.png',
  },
  {
    type: 'researcher',
    name: 'Researcher',
    role: 'Evidence gathering & scientific synthesis',
    color: '#8b5cf6',
    glyph: '✦',
    shape: 'ring',
    avatar: '/pixel/characters/female_person/character_femalePerson_idle.png',
  },
  {
    type: 'coder',
    name: 'Coder',
    role: 'Prototype architecture & code generation',
    color: '#34d399',
    glyph: '▣',
    shape: 'prism',
    avatar: '/pixel/characters/robot/character_robot_idle.png',
  },
  {
    type: 'tester',
    name: 'Tester',
    role: 'Sandboxed validation & smoke tests',
    color: '#fb923c',
    glyph: '✚',
    shape: 'tetra',
    avatar: '/pixel/characters/robot/character_robot_attack1.png',
  },
  {
    type: 'analyst',
    name: 'Analyst',
    role: 'Telemetry metrics & latency scoring',
    color: '#22d3ee',
    glyph: '≣',
    shape: 'hex',
    avatar: '/pixel/characters/female_adventurer/character_femaleAdventurer_idle.png',
  },
  {
    type: 'memory',
    name: 'Memory',
    role: 'Knowledge consolidation & recall',
    color: '#a78bfa',
    glyph: '◎',
    shape: 'core',
    avatar: '/pixel/characters/male_person/character_malePerson_idle.png',
  },
  {
    type: 'scientist',
    name: 'Scientist',
    role: 'Hypotheses & empirical experiments',
    color: '#f472b6',
    glyph: '◉',
    shape: 'sphere',
    avatar: '/pixel/characters/male_person/character_malePerson_think.png',
  },
  {
    type: 'critic',
    name: 'Critic',
    role: 'Security audit & weakness detection',
    color: '#fbbf24',
    glyph: '⚠',
    shape: 'spike',
    avatar: '/pixel/characters/male_adventurer/character_maleAdventurer_think.png',
  },
]

export const AGENT_MAP: Record<AgentType, AgentMeta> = Object.fromEntries(
  AGENTS.map((a) => [a.type, a]),
) as Record<AgentType, AgentMeta>

export const STATUS_COLOR: Record<AgentStatus | string, string> = {
  OFFLINE: '#64748b',
  ONLINE: '#3dd6ff',
  ACTIVE: '#34d399',
  WAITING: '#94a3b8',
  WARNING: '#fbbf24',
  ERROR: '#fb7185',
}

export const MISSION_STATUS_COLOR: Record<string, string> = {
  CREATED: '#8ba0c9',
  PLANNING: '#3dd6ff',
  RESEARCHING: '#8b5cf6',
  DEVELOPING: '#34d399',
  EXPERIMENTING: '#f472b6',
  EVALUATING: '#22d3ee',
  IMPROVING: '#3dd6ff',
  COMPLETED: '#34d399',
  FAILED: '#fb7185',
  PAUSED: '#fbbf24',
  CANCELLED: '#64748b',
  AWAITING_APPROVAL: '#fbbf24',
  REJECTED: '#fb7185',
}

export const PIPELINE_PHASES = [
  'UNDERSTANDING',
  'PLANNING',
  'RESEARCH',
  'APPROVAL',
  'DEVELOPMENT',
  'EXPERIMENT',
  'CRITIQUE',
  'IMPROVEMENT',
  'FINAL_RESULT',
] as const

export const PHASE_LABELS: Record<string, string> = {
  UNDERSTANDING: 'Understanding',
  PLANNING: 'Planning',
  RESEARCH: 'Research',
  APPROVAL: 'Approval',
  DEVELOPMENT: 'Development',
  EXPERIMENT: 'Experiment',
  CRITIQUE: 'Critique',
  IMPROVEMENT: 'Improvement',
  FINAL_RESULT: 'Final Result',
}
