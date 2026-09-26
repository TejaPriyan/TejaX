import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Badge, GlassCard, LineChart, SectionTitle, StatusDot, timeStr } from './ui'

export default function ExperimentsPage() {
  const experiments = useStore((s) => s.experiments)
  const mission = useStore((s) => s.mission)
  const [openId, setOpenId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const scores = useMemo(
    () =>
      experiments
        .filter((e) => typeof e.metrics?.score === 'number')
        .map((e) => e.metrics!.score as number),
    [experiments],
  )
  const labels = useMemo(() => experiments.map((e) => `#${e.iteration}`), [experiments])

  const copyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <SectionTitle hint={mission ? mission.title.slice(0, 40) : ''} icon="▣">
        Experiments — Sandboxed Execution & Provenance
      </SectionTitle>

      {/* Trust & Methodology Legend */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">EVIDENCE TYPES:</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            REAL · Dataset Validated
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            SYNTHETIC · Algorithmic Benchmark
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            DEMO · Deterministic Sim
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">SANDBOX:</span>
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
            LOCAL · Subprocess
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            DOCKER · Isolated Container
          </span>
        </div>
      </div>

      {experiments.length === 0 && (
        <GlassCard className="p-8 text-center text-dim text-sm">
          No experiments yet. Start a mission to run the first sandboxed experiment.
        </GlassCard>
      )}

      {scores.length >= 2 && (
        <GlassCard className="p-5 mb-6 page-enter">
          <div className="flex items-center justify-between mb-2">
            <SectionTitle hint="objective metric progression across iterations" icon="≣">
              Score Trajectory & Convergence
            </SectionTitle>
            <span className="text-xs font-mono text-cyan-400">
              Δ Initial-to-Final: {(((scores[scores.length - 1] - scores[0]) / scores[0]) * 100).toFixed(1)}%
            </span>
          </div>
          <LineChart values={scores} labels={labels} color="#3dd6ff" height={130} />
        </GlassCard>
      )}

      <div className="space-y-4 stagger">
        {experiments.map((e) => {
          const open = openId === e.id
          const prev = experiments.filter((x) => x.iteration < e.iteration)
          const last = prev[prev.length - 1]
          const delta =
            last && typeof last.metrics?.score === 'number' && typeof e.metrics?.score === 'number'
              ? ((e.metrics.score - last.metrics.score) / last.metrics.score) * 100
              : null

          const evidence = e.evidenceType || 'DEMO'
          const sandbox = e.sandboxType || 'LOCAL'

          return (
            <GlassCard key={e.id} className="p-5 transition-all">
              <button
                className="w-full flex items-center gap-4 text-left"
                onClick={() => setOpenId(open ? null : e.id)}
              >
                <StatusDot status={e.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                      #{String(e.iteration).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-semibold truncate text-white">{e.name}</span>
                    
                    {/* Trust Badges */}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        evidence === 'REAL'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : evidence === 'SYNTHETIC'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {evidence}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        sandbox === 'DOCKER'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}
                    >
                      {sandbox} SANDBOX
                    </span>
                    {e.modelProvider && (
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50">
                        {e.modelProvider}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-faint font-mono">
                    Runtime: {e.executionTime != null ? `${e.executionTime}s` : '—'} ·{' '}
                    {timeStr(e.createdAt ? new Date(e.createdAt).getTime() : null)}
                    {e.parentExperimentId && (
                      <span className="ml-2 text-purple-400">· Revises previous iteration</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xl font-bold text-white">
                    {typeof e.metrics?.score === 'number'
                      ? (e.metrics.score * 100).toFixed(1) + '%'
                      : '—'}
                  </div>
                  {delta != null && (
                    <div
                      className={`text-[11px] font-mono font-semibold ${
                        delta > 0 ? 'text-[#34d399]' : delta < 0 ? 'text-[#fb7185]' : 'text-slate-400'
                      }`}
                    >
                      {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta).toFixed(1)}%
                    </div>
                  )}
                </div>

                <span
                  className="text-faint text-sm transition-transform font-mono"
                  style={{ transform: open ? 'rotate(90deg)' : 'none' }}
                >
                  ›
                </span>
              </button>

              {/* Expanded "Why this result?" Explainability Drawer */}
              {open && (
                <div className="mt-5 pt-4 border-t border-slate-800 space-y-4 page-enter">
                  {/* Hypothesis & Scientific Intent */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      Hypothesis & Objective
                    </div>
                    <div className="text-xs text-[#dbe8ff] leading-relaxed">{e.hypothesis || 'Baseline hypothesis'}</div>
                  </div>

                  {/* Provenance & Reproducibility Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">EVIDENCE TYPE</div>
                      <div className="text-white font-bold flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            evidence === 'REAL' ? 'bg-emerald-400' : evidence === 'SYNTHETIC' ? 'bg-cyan-400' : 'bg-amber-400'
                          }`}
                        />
                        {evidence}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {evidence === 'REAL'
                          ? 'Real external dataset'
                          : evidence === 'SYNTHETIC'
                          ? 'Algorithmic synthetic distribution'
                          : 'Deterministic simulation'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">EXECUTION ENVIRONMENT</div>
                      <div className="text-white font-bold flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${sandbox === 'DOCKER' ? 'bg-emerald-400' : 'bg-yellow-400'}`}
                        />
                        {sandbox === 'DOCKER' ? 'Containerized (Isolated)' : 'Local Subprocess'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {sandbox === 'DOCKER' ? 'Network disabled, cgroups limited' : 'Host network accessible'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">REPRODUCIBILITY COMMAND</div>
                      <div className="flex items-center justify-between">
                        <code className="text-[11px] text-cyan-300">python -I exp.py</code>
                        <button
                          type="button"
                          onClick={() => copyCommand(e.id, `python -I experiment-${e.id.slice(0, 8)}.py`)}
                          className="text-[10px] text-cyan-400 hover:underline"
                        >
                          {copiedId === e.id ? '✓ COPIED' : 'COPY'}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500">Runs isolated without user site-packages</div>
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  {e.metrics && Object.keys(e.metrics).length > 0 && (
                    <div>
                      <div className="hud-label mb-1.5">Benchmark Metrics</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(e.metrics).map(([k, v]) => (
                          <Badge key={k} color="#3dd6ff">
                            {k}: {typeof v === 'number' ? Number(v).toFixed(4) : String(v)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
                  {e.error && (
                    <div className="rounded-lg border border-[rgba(251,113,133,0.3)] bg-rose-950/20 p-3 text-xs text-[#fb7185] font-mono">
                      <strong>Sandbox Exception:</strong> {e.error}
                    </div>
                  )}

                  {/* Executable Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="hud-label">Sandboxed Python Code</div>
                      <button
                        type="button"
                        onClick={() => copyCommand(`code-${e.id}`, e.code)}
                        className="text-[11px] font-mono text-cyan-400 hover:underline"
                      >
                        {copiedId === `code-${e.id}` ? '✓ COPIED CODE' : '📋 COPY CODE'}
                      </button>
                    </div>
                    <pre className="terminal p-3 text-[11px] overflow-x-auto scroll-thin text-[#9fd8ff] whitespace-pre max-h-72">
                      {e.code}
                    </pre>
                  </div>

                  {/* Stdout Output */}
                  {e.stdout && (
                    <div>
                      <div className="hud-label mb-1.5">Sandbox stdout</div>
                      <pre className="terminal p-3 text-[11px] text-[#dbe8ff] whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {e.stdout}
                      </pre>
                    </div>
                  )}

                  {/* Stderr Output */}
                  {e.stderr && (
                    <div>
                      <div className="hud-label mb-1.5 text-rose-400">Sandbox stderr</div>
                      <pre className="terminal p-3 text-[11px] text-[#fb7185] whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {e.stderr}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
