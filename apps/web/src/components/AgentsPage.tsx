import { useState } from 'react'
import { useStore } from '../lib/store'
import { AGENTS, STATUS_COLOR } from '../lib/agents'
import { GlassCard, Pill, ProgressRing, SectionTitle } from './ui'

const AGENT_CAPABILITIES: Record<string, string[]> = {
  planner: ['Task Decomposition', 'Dependency Graphs', 'Milestone Scheduling'],
  researcher: ['Literature Mining', 'ArXiv Discovery', 'SOTA Synthesis'],
  coder: ['Algorithmic Architecture', 'Python 3.11', 'Clean Code Synthesis'],
  tester: ['Sandboxed Execution', 'Edge Case Analysis', 'Smoke Testing'],
  analyst: ['Telemetry Analysis', 'Token Profiling', 'Latency Optimization'],
  memory: ['Vector Embeddings', 'Context Recall', 'Knowledge Consolidation'],
  scientist: ['Hypothesis Design', 'Empirical Benchmarking', 'Iterative Tuning'],
  critic: ['Adversarial Audit', 'Vulnerability Check', 'Self-Improvement'],
}

const AGENT_BAYS: Record<string, { bay: string; title: string }> = {
  planner: { bay: 'BAY ALPHA', title: 'Strategy & Architecture' },
  researcher: { bay: 'BAY ALPHA', title: 'Domain Discovery' },
  analyst: { bay: 'BAY ALPHA', title: 'System Telemetry' },
  memory: { bay: 'BAY ALPHA', title: 'Knowledge Base' },
  coder: { bay: 'BAY BETA', title: 'Core Engineering' },
  tester: { bay: 'BAY BETA', title: 'Sandbox Validation' },
  scientist: { bay: 'BAY BETA', title: 'Empirical Research' },
  critic: { bay: 'BAY BETA', title: 'Audit & Safety' },
}

export default function AgentsPage() {
  const agents = useStore((s) => s.agents)
  const mission = useStore((s) => s.mission)
  const setPage = useStore((s) => s.setPage)
  const setSelectedAgentType = useStore((s) => s.setSelectedAgentType)

  const [filterBay, setFilterBay] = useState<'all' | 'alpha' | 'beta'>('all')

  const filteredAgents = AGENTS.filter((meta) => {
    if (filterBay === 'alpha') return AGENT_BAYS[meta.type]?.bay === 'BAY ALPHA'
    if (filterBay === 'beta') return AGENT_BAYS[meta.type]?.bay === 'BAY BETA'
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <SectionTitle
            hint={mission ? `mission: ${mission.title.slice(0, 45)}` : 'all stations ready'}
            icon="◇"
          >
            Autonomous Agent Fleet
          </SectionTitle>
          <p className="text-dim text-xs -mt-1 font-mono">
            8 specialized neural agents collaborating in autonomous research & development.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass border border-slate-800">
          <button
            onClick={() => setFilterBay('all')}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
              filterBay === 'all'
                ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ALL (8)
          </button>
          <button
            onClick={() => setFilterBay('alpha')}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
              filterBay === 'alpha'
                ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            BAY ALPHA (DISCOVERY)
          </button>
          <button
            onClick={() => setFilterBay('beta')}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
              filterBay === 'beta'
                ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            BAY BETA (ENGINEERING)
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
        {filteredAgents.map((meta) => {
          const live = agents.find((a) => a.type === meta.type)
          const status = live?.status ?? 'OFFLINE'
          const active = status === 'ACTIVE'
          const progress = live?.progress ?? 0
          const bayInfo = AGENT_BAYS[meta.type]
          const capabilities = AGENT_CAPABILITIES[meta.type] ?? []

          return (
            <GlassCard
              key={meta.type}
              className="agent-card-pro p-0 overflow-hidden flex flex-col justify-between"
              style={{
                borderColor: active ? `${meta.color}88` : undefined,
                boxShadow: active ? `0 0 20px ${meta.color}25` : undefined,
              }}
              onClick={() => {
                setSelectedAgentType(meta.type)
                setPage('lab')
              }}
            >
              <div>
                {/* Agent Header Bar */}
                <div
                  className="relative px-5 pt-5 pb-4"
                  style={{
                    background: `linear-gradient(135deg, ${meta.color}15 0%, transparent 70%)`,
                  }}
                >
                  {/* Bay Badge */}
                  <div className="flex items-center justify-between text-[10px] font-mono mb-3">
                    <span
                      className="px-2 py-0.5 rounded font-bold tracking-wider"
                      style={{
                        backgroundColor: `${meta.color}18`,
                        border: `1px solid ${meta.color}35`,
                        color: meta.color,
                      }}
                    >
                      {bayInfo?.bay}
                    </span>
                    <span className="text-slate-400 tracking-wider">
                      {bayInfo?.title}
                    </span>
                  </div>

                  {/* 2D Character Avatar PFP + Name row */}
                  <div className="relative flex items-center gap-3.5 mb-2.5">
                    <div
                      className="relative flex items-center justify-center w-16 h-16 rounded-2xl shrink-0 overflow-hidden transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `radial-gradient(circle, ${meta.color}25 0%, rgba(10,15,30,0.9) 100%)`,
                        border: `2px solid ${meta.color}66`,
                        boxShadow: active ? `0 0 20px ${meta.color}55` : `0 0 12px ${meta.color}22`,
                      }}
                    >
                      <img
                        src={meta.avatar}
                        alt={meta.name}
                        className="w-12 h-14 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold tracking-wide text-white">
                        {meta.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                        {meta.type.toUpperCase()} // NEURAL CORE
                      </div>
                    </div>
                  </div>

                  {/* Role description */}
                  <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
                    {meta.role}
                  </p>
                </div>

                {/* Divider */}
                <div
                  className="h-px mx-4"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${meta.color}30, transparent)`,
                  }}
                />

                {/* Status + Progress Section */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <Pill color={STATUS_COLOR[status]}>{status}</Pill>
                    <ProgressRing value={progress} size={40} color={meta.color} label />
                  </div>

                  {/* Current Task */}
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 leading-snug font-mono min-h-[44px]">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">
                      Current Task:
                    </div>
                    <div className="truncate">
                      {live?.currentTask ?? 'Station standby · Ready for mission.'}
                    </div>
                  </div>

                  {/* Capabilities Chips */}
                  <div className="mt-3 space-y-1">
                    <div className="text-[9px] uppercase tracking-wider font-mono text-slate-500">
                      Core Specializations:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-900/80 text-slate-300 border border-slate-800"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Action */}
              <div className="px-5 pb-4 pt-1">
                <button
                  className="w-full py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: `${meta.color}15`,
                    border: `1px solid ${meta.color}40`,
                    color: meta.color,
                  }}
                >
                  <span>⬡</span> ENTER 2D LAB STATION →
                </button>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-xs font-mono text-slate-400 border-t border-slate-800 pt-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
          ACTIVE (EXECUTING)
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#3dd6ff] shadow-[0_0_8px_#3dd6ff]" />
          ONLINE (MONITORING)
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#94a3b8]" />
          STANDBY (AWAITING TASK)
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#475569]" />
          OFFLINE
        </div>
      </div>
    </div>
  )
}
