import { useState } from 'react'
import { useStore } from '../lib/store'

export function HostedCommand() {
  const s = useStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const launch = async () => {
    setBusy(true); setError('')
    try {
      const mission = await s.createMission(title.trim(), description.trim())
      await s.startMission(mission.id)
      s.setPage('lab')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start mission') }
    finally { setBusy(false) }
  }
  return <div className="max-w-3xl mx-auto p-8 space-y-5">
    <h1 className="text-3xl font-semibold">What would you like to work on?</h1>
    <p className="text-dim">Five AI stages help plan, analyze, draft and review your idea using Groq. This beta provides advice and proposed code; it cannot execute code, browse the web, train models or validate results.</p>
    <label className="block">Mission<input className="field px-4 py-3 mt-2" maxLength={300} value={title} onChange={e => setTitle(e.target.value)} placeholder="Design a study planner for college students" /></label>
    <label className="block">Context<textarea className="field px-4 py-3 mt-2" maxLength={4000} rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your requirements and constraints. Do not include secrets or sensitive data." /></label>
    <p className="text-sm text-amber-200">Your mission text is sent to Groq. Results belong to this browser session and may disappear when Render restarts. Save any results you need.</p>
    <p className="text-sm text-dim">Beta limits: one mission at a time across the service, three runs per browser per hour, twenty total runs per server session. Each mission has five AI stages; brief provider limits may delay a stage.</p>
    {error && <p role="alert" className="text-err">{error}</p>}
    <button className="btn-primary" disabled={busy || title.trim().length < 3} onClick={() => void launch()}>{busy ? 'Starting…' : 'Start AI mission'}</button>
  </div>
}

export function HostedResults() {
  const s = useStore()
  const [error, setError] = useState('')
  const m = s.mission
  const report = m?.report
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `tejax-${m?.id}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="max-w-4xl mx-auto p-8 space-y-5">
    <h1 className="text-3xl font-semibold">Your AI missions</h1>
    <p className="text-dim">Visible only in this browser session. Temporary history—download important results.</p>
    <div className="flex flex-wrap gap-2">{s.missions.map(item => <button key={item.id} className="chip" onClick={() => void s.selectMission(item.id)}>{item.title} · {item.status}</button>)}</div>
    {!m ? <button className="btn-primary" onClick={() => s.setPage('command')}>Create a mission</button> : <>
      <h2 className="text-xl font-semibold">{m.title}</h2><p>{m.status} · {m.currentPhase}</p>
      {m.error && <p role="alert" className="text-err">{m.error}</p>}
      {error && <p role="alert" className="text-err">{error}</p>}
      {['CREATED', 'FAILED', 'CANCELLED'].includes(m.status) && <button className="btn-primary" onClick={() => { setError(''); void s.startMission(m.id).catch(e => setError(String(e.message))) }}>Start / retry mission</button>}
      <ul className="space-y-2">{s.tasks.map(t => <li key={t.id}>{t.agentType}: {t.status} — {t.description}</li>)}</ul>
      {report && <>
        <button className="btn-primary" onClick={download}>Download result</button>
        <p className="text-amber-200">AI-generated, unverified. No experiments or tests were executed.</p>
        {[['Plan', report.approach], ['Analysis', report.research], ['Review', report.improvements.join('\n\n')], ['Final answer and proposed implementation', report.final_solution]].map(([heading, text]) => <section key={heading} className="glass rounded-xl p-5"><h3 className="text-lg font-semibold mb-3">{heading}</h3><div className="whitespace-pre-wrap break-words">{text}</div></section>)}
      </>}
    </>}
  </div>
}

export function HostedSettings() {
  const s = useStore()
  return <div className="max-w-3xl mx-auto p-8 space-y-5"><h1 className="text-3xl font-semibold">Online beta settings</h1>
    <p>Provider: Groq · Model: {s.systemStatus?.modelStatus.model}</p>
    <p className="text-dim">The operator manages provider credentials in Render. Visitors cannot change the model or access the key. Starting a mission makes real AI requests; failures are shown without a demo fallback.</p>
    <button className="btn-ghost" onClick={s.toggleSound}>Sound: {s.soundEnabled ? 'on' : 'off'}</button>
    <button className="btn-ghost" onClick={() => s.setPerformanceMode(!s.performanceMode)}>Performance mode: {s.performanceMode ? 'on' : 'off'}</button>
  </div>
}

export function HostedUnavailable() {
  return <div className="p-8 space-y-4"><h1 className="text-2xl font-semibold">Not available in the online advisory beta</h1><p>This deployment does not execute experiments or store shared long-term memory. Your AI responses are available under Missions.</p></div>
}
