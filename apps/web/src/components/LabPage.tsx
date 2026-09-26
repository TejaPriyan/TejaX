import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { AGENT_MAP, PIPELINE_PHASES, PHASE_LABELS, STATUS_COLOR } from '../lib/agents'
import PixelLab from './PixelLab'
import { Badge, Pill, ProgressRing, timeStr } from './ui'

export default function LabPage() {
  const mission = useStore((s) => s.mission)
  const agents = useStore((s) => s.agents)
  const experiments = useStore((s) => s.experiments)
  const idToType = useMemo(() => new Map(agents.map((a) => [a.id, a.type])), [agents])
  const timeline = useStore((s) => s.timeline)
  const selectedAgentType = useStore((s) => s.selectedAgentType)
  const setSelectedAgentType = useStore((s) => s.setSelectedAgentType)
  const setPage = useStore((s) => s.setPage)
  const soundEnabled = useStore((s) => s.soundEnabled)
  const toggleSound = useStore((s) => s.toggleSound)

  const [drawerMinimized, setDrawerMinimized] = useState(false)

  // Auto-open drawer when a new agent is selected
  useEffect(() => {
    if (selectedAgentType) {
      setDrawerMinimized(false)
    }
  }, [selectedAgentType])

  const activeAgentType = useMemo(() => {
    const activeAgent = agents.find((a) => a.status === 'ACTIVE')
    if (activeAgent) return activeAgent.type
    const last = timeline[timeline.length - 1]
    if (last?.agentId) return idToType.get(last.agentId) ?? null
    return null
  }, [agents, timeline, idToType])

  const activeMessage = useMemo(() => {
    const last = timeline[timeline.length - 1]
    if (last?.payload && typeof last.payload === 'object') {
      const p = last.payload as Record<string, unknown>
      if (typeof p.message === 'string') return p.message
      if (typeof p.task === 'string') return p.task
      if (typeof p.hypothesis === 'string') return p.hypothesis
    }
    const a = agents.find((x) => x.status === 'ACTIVE')
    return a?.currentTask ?? null
  }, [timeline, agents])

  const selected = agents.find((a) => a.type === selectedAgentType)
  const meta = selected ? AGENT_MAP[selected.type] : null

  const recentLogs = useMemo(
    () =>
      timeline
        .filter((e) => {
          if (e.agentId && idToType.get(e.agentId) === selectedAgentType) return true
          const p = e.payload as { agentType?: string } | undefined
          return p?.agentType === selectedAgentType
        })
        .slice(-8),
    [timeline, idToType, selectedAgentType],
  )

  // Relevant Deliverables based on selected agent
  const latestExp = experiments[experiments.length - 1]
  const report = mission?.report

  const phaseIndex = mission ? PIPELINE_PHASES.indexOf(mission.currentPhase as (typeof PIPELINE_PHASES)[number]) : -1

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden">
      {/* 2D Pixel Lab (Full Canvas Game) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <PixelLab
          mission={mission}
          agents={agents}
          selectedAgentType={selectedAgentType}
          onSelectAgent={setSelectedAgentType}
          activeAgentType={activeAgentType}
          activeMessage={activeMessage}
          soundEnabled={soundEnabled}
        />
      </div>

      {/* Top-left Quick Controls */}
      <div className="absolute top-3 left-4 z-30 pointer-events-auto flex items-center gap-2">
        <button
          onClick={toggleSound}
          className="px-3 py-1.5 text-xs font-mono rounded-lg border transition-all glass hover:border-[#3dd6ff]"
          style={{
            borderColor: soundEnabled ? '#3dd6ff' : 'rgba(100, 116, 139, 0.3)',
            color: soundEnabled ? '#3dd6ff' : '#94a3b8',
          }}
        >
          {soundEnabled ? '🔊 SFX ON' : '🔇 SFX OFF'}
        </button>
        <button
          onClick={() => setPage('command')}
          className="px-3 py-1.5 text-xs font-mono rounded-lg border border-[rgba(100,116,139,0.3)] glass text-dim hover:text-white hover:border-[#3dd6ff] transition-all"
        >
          ◈ COMMAND
        </button>
        <button
          onClick={() => setPage('missions')}
          className="px-3 py-1.5 text-xs font-mono rounded-lg border border-[rgba(100,116,139,0.3)] glass text-dim hover:text-white hover:border-[#3dd6ff] transition-all"
        >
          ◎ MISSIONS
        </button>
      </div>

      {/* Top-right Pipeline Phase Indicator */}
      {mission && (
        <div className="absolute top-3 right-4 z-30 pointer-events-none hidden lg:block">
          <div
            className="rounded-xl px-4 py-2 border flex items-center gap-2 glass"
            style={{ borderColor: 'rgba(56, 189, 248, 0.25)' }}
          >
            <span className="text-[10px] font-mono text-slate-400 tracking-wider">PIPELINE:</span>
            {PIPELINE_PHASES.map((p, i) => {
              const done = phaseIndex > i
              const current = phaseIndex === i
              const color = done || current ? '#3dd6ff' : 'rgba(125,165,255,0.25)'
              return (
                <div key={p} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full transition-all"
                    style={{
                      backgroundColor: color,
                      boxShadow: current ? `0 0 10px ${color}` : done ? `0 0 5px ${color}` : 'none',
                    }}
                    title={PHASE_LABELS[p]}
                  />
                  <span className={`text-[10px] font-mono ${current ? 'text-white font-bold' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                    {PHASE_LABELS[p]}
                  </span>
                  {i < PIPELINE_PHASES.length - 1 && (
                    <span className="text-slate-700 text-xs">→</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Collapsible Inspector Drawer (right side) */}
      {selected && meta && (
        drawerMinimized ? (
          <div
            onClick={() => setDrawerMinimized(false)}
            className="absolute right-4 top-14 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl cursor-pointer hover:scale-105 transition-all border glass"
            style={{
              borderColor: meta.color,
              boxShadow: `0 0 14px ${meta.color}33`,
            }}
          >
            <span className="text-lg" style={{ color: meta.color }}>{meta.glyph}</span>
            <span className="text-xs font-bold text-white font-mono">{meta.name}</span>
            <Pill color={STATUS_COLOR[selected.status]}>{selected.status}</Pill>
            <span className="text-[10px] text-slate-400 font-mono">[+] EXPAND</span>
          </div>
        ) : (
          <div
            className="absolute right-4 top-14 bottom-10 w-[360px] max-w-[90vw] z-30 rounded-2xl p-5 overflow-y-auto scroll-thin page-enter border glass-strong"
            style={{
              borderColor: `${meta.color}55`,
              boxShadow: `0 0 25px ${meta.color}22`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border"
                  style={{
                    backgroundColor: `${meta.color}20`,
                    borderColor: `${meta.color}55`,
                    boxShadow: `0 0 16px ${meta.color}33`,
                  }}
                >
                  <img
                    src={meta.avatar}
                    alt={meta.name}
                    className="w-11 h-13 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div>
                  <h2 className="font-bold text-sm tracking-wide font-mono" style={{ color: meta.color }}>
                    {meta.name.toUpperCase()}
                  </h2>
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider">{meta.type.toUpperCase()} STATION</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDrawerMinimized(true)}
                  title="Minimize"
                  className="w-6 h-6 flex items-center justify-center text-xs text-slate-400 hover:text-white rounded-lg border border-slate-700 bg-slate-900/60 transition-colors font-mono"
                >
                  _
                </button>
                <button
                  onClick={() => setSelectedAgentType(null)}
                  title="Close inspector"
                  className="w-6 h-6 flex items-center justify-center text-xs text-slate-400 hover:text-white rounded-lg border border-slate-700 bg-slate-900/60 transition-colors font-mono"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Role & Status */}
            <div className="mt-3">
              <div className="text-xs text-slate-300 leading-relaxed font-sans">{meta.role}</div>
              <div className="mt-2.5 flex items-center justify-between">
                <Pill color={STATUS_COLOR[selected.status]}>{selected.status}</Pill>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">Progress:</span>
                  <ProgressRing value={selected.progress} size={36} color={meta.color} label />
                </div>
              </div>
            </div>

            <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

            {/* Live Task / Assignment */}
            <div className="space-y-3">
              <div className="rounded-xl p-3 bg-slate-950/70 border border-slate-800">
                <div className="text-[9px] uppercase tracking-wider font-mono text-slate-400 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  Current Assignment
                </div>
                <div className="text-xs text-slate-200 font-mono leading-snug">
                  {selected.currentTask ?? 'Monitoring lab feeds, ready for assignment.'}
                </div>
              </div>

              {/* Agent Deliverables Showcase */}
              {selected.type === 'planner' && mission?.objectives && mission.objectives.length > 0 && (
                <div className="rounded-xl p-3 bg-slate-950/70 border border-slate-800">
                  <div className="text-[9px] uppercase tracking-wider font-mono text-cyan-400 mb-2">
                    Mission Objectives ({mission.objectives.length})
                  </div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto scroll-thin">
                    {mission.objectives.map((o) => (
                      <div key={o.id} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                        <span className="text-cyan-400 font-mono text-[10px]">#{o.index + 1}</span>
                        <span>{o.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.type === 'coder' && latestExp?.code && (
                <div className="rounded-xl p-3 bg-slate-950/70 border border-slate-800">
                  <div className="text-[9px] uppercase tracking-wider font-mono text-emerald-400 mb-1.5 flex items-center justify-between">
                    <span>Generated Code</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(latestExp.code || '')}
                      className="text-[9px] text-emerald-300 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono text-slate-300 max-h-[120px] overflow-y-auto scroll-thin p-2 rounded bg-black/60">
                    {latestExp.code.slice(0, 400)}…
                  </pre>
                </div>
              )}

              {selected.type === 'scientist' && experiments.length > 0 && (
                <div className="rounded-xl p-3 bg-slate-950/70 border border-slate-800">
                  <div className="text-[9px] uppercase tracking-wider font-mono text-pink-400 mb-2">
                    Experiment Score Progression
                  </div>
                  <div className="space-y-1.5">
                    {experiments.slice(-3).map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Iter #{e.iteration}</span>
                        <span className="text-white font-bold">
                          {typeof e.metrics?.score === 'number' ? `${(e.metrics.score * 100).toFixed(1)}%` : 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.type === 'researcher' && report?.research && (
                <div className="rounded-xl p-3 bg-slate-950/70 border border-slate-800">
                  <div className="text-[9px] uppercase tracking-wider font-mono text-purple-400 mb-1.5">
                    Literature & Scientific Findings
                  </div>
                  <div className="text-[11px] text-slate-300 leading-relaxed max-h-[120px] overflow-y-auto scroll-thin">
                    {report.research.slice(0, 300)}…
                  </div>
                </div>
              )}

              {selected.type === 'critic' && report?.improvements && report.improvements.length > 0 && (
                <div className="rounded-xl p-3 bg-slate-950/70 border border-slate-800">
                  <div className="text-[9px] uppercase tracking-wider font-mono text-amber-400 mb-1.5">
                    Self-Improvement Critiques
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    {report.improvements.slice(0, 3).map((imp, idx) => (
                      <div key={idx}>• {imp}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity Log */}
              <div>
                <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1.5">
                  Recent Telemetry Stream
                </div>
                <div className="space-y-1 max-h-[140px] overflow-y-auto scroll-thin">
                  {recentLogs.length === 0 && (
                    <div className="text-slate-600 text-[10px] font-mono py-2">No recent logs recorded.</div>
                  )}
                  {recentLogs.map((e) => (
                    <div key={e.eventId} className="text-[10px] font-mono leading-snug p-1.5 rounded bg-slate-900/40">
                      <div className="flex items-center justify-between text-slate-500 text-[9px]">
                        <span style={{ color: meta.color }}>{e.type.toLowerCase()}</span>
                        <span>{timeStr(e.timestamp)}</span>
                      </div>
                      {e.payload?.message ? (
                        <div className="text-slate-300 mt-0.5 font-sans text-[11px]">
                          {String(e.payload.message)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setPage('missions')}
                  className="flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all"
                  style={{
                    backgroundColor: `${meta.color}22`,
                    border: `1.5px solid ${meta.color}`,
                    color: meta.color,
                  }}
                >
                  VIEW IN MISSION DECK →
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
