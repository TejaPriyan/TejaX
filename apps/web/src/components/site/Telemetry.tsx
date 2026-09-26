import { useStore } from '../../lib/store'

function Metric({ label, value, accent }: { label: string; value: string | number | undefined; accent: string }) {
  return (
    <div>
      <div className="s-mono text-[10px] tracking-[0.24em] uppercase text-faint">{label}</div>
      <div className="s-display text-3xl font-semibold mt-2" style={{ color: accent }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

/**
 * Telemetry — real, live numbers from the running TejaX backend (same store
 * the lab app uses). Falls back to a clearly-labelled offline state.
 */
export default function Telemetry({ compact = false }: { compact?: boolean }) {
  const systemStatus = useStore((s) => s.systemStatus)
  const metrics = useStore((s) => s.metrics)
  const online = !!systemStatus

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-[10px] font-mono text-faint">
        <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#34d399] animate-pulse' : 'bg-[#64748b]'}`} />
        {online
          ? `${systemStatus?.mode} · ${systemStatus?.agentsOnline} AGENTS · ${systemStatus?.websocketClients} LINKS`
          : 'SYSTEM OFFLINE — ILLUSTRATIVE'}
      </div>
    )
  }

  return (
    <div className="s-panel s-corners p-7">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-7">
        <Metric label="Agents online" value={systemStatus?.agentsOnline} accent="#3dd6ff" />
        <Metric label="Memories stored" value={systemStatus?.memoryCount} accent="#a78bfa" />
        <Metric label="Missions run" value={metrics?.totalMissions} accent="#34d399" />
        <Metric
          label="Experiment success"
          value={metrics ? `${Math.round(metrics.experimentSuccessRate * 100)}%` : '—'}
          accent="#f472b6"
        />
      </div>
      <div className="mt-6 pt-4 border-t border-[var(--s-line)] flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-faint">
        <span className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#34d399]' : 'bg-[#64748b]'}`} />
          {online ? 'LIVE TELEMETRY' : 'BACKEND OFFLINE — SHOWING PLACEHOLDERS'}
        </span>
        <span>{online ? `${systemStatus?.mode} · ${systemStatus?.modelStatus.model}` : 'start the API to stream live data'}</span>
      </div>
    </div>
  )
}
