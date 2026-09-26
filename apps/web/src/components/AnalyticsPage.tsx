import { useEffect } from 'react'
import { useStore } from '../lib/store'
import { Bar, GlassCard, SectionTitle, Stat } from './ui'

export default function AnalyticsPage() {
  const metrics = useStore((s) => s.metrics)
  const observability = useStore((s) => s.observability)
  const loadObservability = useStore((s) => s.loadObservability)

  useEffect(() => {
    loadObservability().catch(() => {})
  }, [loadObservability])

  const obs = observability as
    | { totals?: { runs?: number; failures?: number; avgLatencyMs?: number }; modelRuns?: { provider: string; model: string; agent: string; latencyMs: number; ok: boolean }[] }
    | null

  const bars: { label: string; value: number; color: string }[] = [
    { label: 'Experiment success', value: metrics?.experimentSuccessRate ?? 0, color: '#3dd6ff' },
    { label: 'Agent utilization', value: metrics?.agentUtilization ?? 0, color: '#8b5cf6' },
    { label: 'Mission completion', value: metrics?.missionCompletionRate ?? 0, color: '#34d399' },
    { label: 'Error recovery', value: metrics?.errorRecoveryRate ?? 0, color: '#fbbf24' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <SectionTitle hint="system performance — not a measure of intelligence" icon="≣">
        TejaX System Metrics
      </SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        <Stat label="Tasks completed" icon="✓" value={metrics?.tasksCompleted ?? 0} accent="#34d399" />
        <Stat label="Experiments passed" icon="▣" value={metrics?.successfulExperiments ?? 0} accent="#3dd6ff" />
        <Stat label="Experiments failed" icon="✕" value={metrics?.failedExperiments ?? 0} accent="#fb7185" />
        <Stat label="Avg iterations" icon="↻" value={metrics?.averageIterations ?? 0} accent="#f472b6" decimals={1} />
      </div>

      <GlassCard className="p-5 page-enter">
        <SectionTitle hint="percentages">Performance</SectionTitle>
        <div className="space-y-4">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-dim">{b.label}</span>
                <span className="font-mono" style={{ color: b.color }}>{b.value.toFixed(1)}%</span>
              </div>
              <Bar value={b.value} color={b.color} height={7} />
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="p-5 page-enter">
          <SectionTitle hint="developer dashboard" icon="◈">Observability</SectionTitle>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Model runs" value={obs?.totals?.runs ?? 0} accent="#3dd6ff" />
            <Stat label="Failures" value={obs?.totals?.failures ?? 0} accent="#fb7185" />
            <Stat label="Avg latency" value={`${obs?.totals?.avgLatencyMs ?? 0}ms`} accent="#f472b6" animate={false} />
          </div>
          <div className="max-h-[280px] overflow-y-auto scroll-thin space-y-1.5">
            {(obs?.modelRuns ?? []).length === 0 && (
              <div className="text-faint text-sm py-2">No external model calls recorded yet (using local autonomous engine).</div>
            )}
            {(obs?.modelRuns ?? []).map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-[12px] font-mono rounded-lg border border-[rgba(125,165,255,0.08)] px-3 py-1.5">
                <span className={r.ok ? 'text-[#34d399]' : 'text-[#fb7185]'}>{r.ok ? '✓' : '✗'}</span>
                <span className="text-dim">{r.provider}</span>
                <span className="text-faint">{r.model || '—'}</span>
                <span className="text-faint">{r.agent}</span>
                <span className="ml-auto text-faint">{r.latencyMs}ms</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 page-enter">
          <SectionTitle hint="improvement across iterations" icon="↗">Improvement</SectionTitle>
          <div className="flex flex-col items-center justify-center h-full min-h-[160px]">
            <div className="text-5xl font-bold font-mono text-grad-accent">
              +{(metrics?.improvementPercentage ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs text-dim mt-2">average best-score improvement</div>
          </div>
        </GlassCard>
      </div>

      <p className="text-[11px] text-faint">
        These metrics describe how the autonomous swarm operates across planning, research, coding, and sandboxed benchmark iterations.
      </p>
    </div>
  )
}
