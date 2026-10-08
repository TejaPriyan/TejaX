import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { AGENTS } from '../lib/agents'

export default function LabConsole() {
  const s = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const mission = s.mission
  const running = !!mission && ['PLANNING','RESEARCHING','DEVELOPING','EXPERIMENTING','EVALUATING','IMPROVING','AWAITING_APPROVAL'].includes(mission.status)
  const completed = s.tasks.filter(t => t.status === 'COMPLETED').length
  const time = (value: string) => Date.parse(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
  const elapsed = mission?.startedAt ? Math.max(0, Math.floor(((mission.completedAt ? time(mission.completedAt) : now) - time(mission.startedAt)) / 1000)) : 0
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setError(''); try { await fn() } catch(e) { setError(e instanceof Error ? e.message : 'Action failed') } finally { setBusy(false) } }
  return <section className="lab-console" aria-label="Mission control">
    <div className="lab-console-heading"><div><span className="lab-eyebrow">TEJAX / AUTONOMOUS INTELLIGENCE LAB</span><h1>Enter an idea. Watch the lab work.</h1></div><span className="lab-mode">{s.systemStatus?.mode || 'DISCONNECTED'}</span></div>
    <div className="lab-mission-strip">
      <div className="lab-mission-title"><span className="lab-eyebrow">CURRENT MISSION</span><strong>{mission?.title || 'Your next discovery starts here'}</strong><small>{mission?.status || 'Connect the backend to begin'} · {mission?.currentPhase || 'Ready when you are'}</small></div>
      <div className="lab-reading"><strong>{completed}/{s.tasks.length}</strong><span>Tasks complete</span></div>
      <div className="lab-reading"><strong>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2,'0')}</strong><span>Elapsed wall time</span></div>
      <div className="lab-reading"><strong>{s.experiments.length}</strong><span>Experiments</span></div>
      <div className="lab-actions">
        {!s.systemStatus?.hosted && <button disabled={busy || !!s.connectionError || s.loading || running} onClick={() => void act(async () => { const id = await s.runDemo(); if (!id) throw new Error(useStore.getState().connectionError || 'Could not start demo') })}>▶ Run demo mission</button>}
        <button onClick={() => s.setPage('command')}>＋ New mission</button>
        {running && mission && <button disabled={busy} onClick={() => void act(() => s.pauseMission(mission.id))}>Pause</button>}
        {mission?.status === 'PAUSED' && <button disabled={busy} onClick={() => void act(() => s.startMission(mission.id))}>Resume</button>}
        {(running || mission?.status === 'PAUSED') && mission && <button disabled={busy} onClick={() => void act(() => s.cancelMission(mission.id))}>Cancel</button>}
        {mission?.report && <button onClick={() => s.setPage('missions')}>Open results →</button>}
      </div>
    </div>
    {mission?.status === 'AWAITING_APPROVAL' && <div className="lab-approval">Research is ready for review. <button disabled={busy} onClick={() => void act(() => s.approveMission(mission.id))}>Approve development</button><button disabled={busy} onClick={() => void act(() => s.rejectMission(mission.id))}>Reject</button></div>}
    {error && <p role="alert">{error}</p>}
    {mission?.error && <p role="alert">{mission.error}</p>}
    <div className="lab-stations" aria-label="Inspect agent workstations">{AGENTS.map(meta => {
      const agent = s.agents.find(a => a.type === meta.type)
      return <button key={meta.type} aria-pressed={s.selectedAgentType === meta.type} onClick={() => s.setSelectedAgentType(meta.type)} style={{ '--station-color': meta.color } as React.CSSProperties}><span className={agent?.status === 'ACTIVE' ? 'station-light active' : 'station-light'} /><strong>{meta.name}</strong><small>{agent?.status || 'OFFLINE'}</small></button>
    })}</div>
    <p className="lab-disclosure">{s.systemStatus?.notice || 'Demo mode runs a deterministic pipeline, not a live AI model. Experiment output is recorded; attaching data does not establish validated evidence. Provider cost is not yet metered.'}</p>
  </section>
}
