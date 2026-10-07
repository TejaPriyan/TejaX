import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { api, type ModelStatus } from '../lib/api'
import { Badge, GlassCard, Pill, SectionTitle, Stat } from './ui'

const PROVIDERS = [
  { id: 'auto', label: '⚡ Auto (Groq → Gemini → OpenRouter)' },
  { id: 'groq', label: 'Groq Cloud (openai/gpt-oss-120b)' },
  { id: 'gemini', label: 'Google Gemini (gemini-3.6-flash)' },
  { id: 'openrouter', label: 'OpenRouter (Llama 3.3 70B)' },
  { id: 'nvidia', label: 'NVIDIA NIM' },
  { id: 'bytez', label: 'Bytez' },
  { id: 'ollama', label: 'Ollama (local)' },
  { id: 'openai_compat', label: 'Custom OpenAI-compatible' },
  { id: 'demo', label: 'Demo (deterministic, no AI model)' },
]

export default function SettingsPage() {
  const performanceMode = useStore((s) => s.performanceMode)
  const setPerformanceMode = useStore((s) => s.setPerformanceMode)
  const soundEnabled = useStore((s) => s.soundEnabled)
  const toggleSound = useStore((s) => s.toggleSound)
  const systemStatus = useStore((s) => s.systemStatus)
  const runDemo = useStore((s) => s.runDemo)
  const setPage = useStore((s) => s.setPage)
  const refreshSystem = useStore((s) => s.refreshSystem)

  const [model, setModel] = useState<ModelStatus | null>(null)
  const [provider, setProvider] = useState('demo')
  const [modelName, setModelName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [humanApproval, setHumanApproval] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    try {
      const m = await api.getModel()
      setModel(m)
      setProvider(m.config.provider || m.effectiveProvider || 'demo')
      setModelName(m.config.model || '')
      setBaseUrl(m.config.base_url || '')
      setHumanApproval(m.config.human_approval)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setTestResult(null)
    try {
      await api.updateModel({
        provider,
        model: modelName,
        base_url: baseUrl,
        api_key: apiKey || undefined,
        human_approval: humanApproval,
      })
      await load()
      await refreshSystem()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await api.testModel()
      setTestResult({
        ok: r.ok,
        msg: r.ok
          ? `OK — ${r.model} responded in ${r.latencyMs}ms: "${r.sample?.slice(0, 40)}"`
          : `Failed — ${r.error ?? 'unreachable'}`,
      })
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'test failed' })
    } finally {
      setTesting(false)
    }
  }

  const health = model?.health

  const saveApproval = async (v: boolean) => {
    setHumanApproval(v)
    try {
      await api.updateModel({ human_approval: v })
      await refreshSystem()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <SectionTitle hint="runtime configuration" icon="⚙">Settings</SectionTitle>

      {/* ─── Model provider ─── */}
      <GlassCard className="p-5 space-y-4 page-enter">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Model provider</div>
            <div className="text-xs text-dim mt-0.5">
              Connect a real local or remote model. Agents use it for planning, research, critique and analysis.
            </div>
          </div>
          <Pill color={health?.ok ? '#34d399' : '#8ba0c9'}>{model?.effectiveProvider ?? 'demo'}</Pill>
        </div>

        <div className="space-y-3">
          <div>
            <div className="hud-label mb-1.5">Provider</div>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`chip ${provider === p.id ? '!text-white !border-[#3dd6ff]/60' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {provider !== 'demo' && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="hud-label mb-1.5">Model name</div>
                  <input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder={provider === 'ollama' ? 'llama3.1' : 'gpt-4o-mini'}
                    className="field px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <div className="hud-label mb-1.5">Base URL</div>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
                    className="field px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {provider === 'openai_compat' && (
                <div>
                  <div className="hud-label mb-1.5">API key (optional — sent only to your endpoint)</div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-…"
                    className="field px-3 py-2 text-sm"
                  />
                </div>
              )}
            </>
          )}

          {health && provider !== 'demo' && (
            <div className="text-[11px] font-mono flex items-center gap-2">
              {health.ok ? (
                <span className="text-[#34d399]">● connected</span>
              ) : (
                <span className="text-[#fb7185]">● unreachable{health.error ? ` — ${health.error.slice(0, 90)}` : ''}</span>
              )}
              {health.models && health.models.length > 0 && (
                <span className="text-faint truncate">models: {health.models.slice(0, 6).join(', ')}</span>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="btn-primary !py-2 text-sm">
              {saving ? 'SAVING…' : 'SAVE'}
            </button>
            <button onClick={test} disabled={testing} className="btn-ghost !py-2 text-sm">
              {testing ? 'TESTING…' : '⚡ TEST CONNECTION'}
            </button>
            {saved && <span className="self-center text-xs text-[#34d399]">✓ saved</span>}
          </div>
          {testResult && (
            <div className={`rounded-lg p-3 text-xs font-mono border ${testResult.ok ? 'border-[rgba(52,211,153,0.3)] text-[#34d399]' : 'border-[rgba(251,113,133,0.3)] text-[#fb7185]'}`}>
              {testResult.msg}
            </div>
          )}
        </div>
      </GlassCard>

      {/* ─── Preferences ─── */}
      <GlassCard className="p-5 space-y-5 page-enter">
        <Toggle
          title="Human approval checkpoint"
          desc="Pause every mission after research and require an Approve/Reject decision before development begins."
          checked={humanApproval}
          onChange={saveApproval}
        />
        <Toggle
          title="Sound cues"
          desc="Play subtle synthesized tones when agents complete tasks, experiments pass/fail, and missions finish."
          checked={soundEnabled}
          onChange={() => toggleSound()}
        />
        <Toggle
          title="Performance mode"
          desc="Reduce particle counts and rendering resolution in the 3D lab."
          checked={performanceMode}
          onChange={(v) => setPerformanceMode(v)}
        />
      </GlassCard>

      {/* ─── Status ─── */}
      <GlassCard className="p-5 page-enter">
        <SectionTitle hint="current runtime" icon="◈">Status</SectionTitle>
        <div className="grid grid-cols-2 gap-3 stagger">
          <Stat label="Mode" value={systemStatus?.mode ?? '—'} accent="#f472b6" animate={false} />
          <Stat label="Model" value={systemStatus?.modelStatus.model ?? '—'} accent="#3dd6ff" animate={false} />
          <Stat label="Provider" value={systemStatus?.modelStatus.provider ?? '—'} animate={false} />
          <Stat label="WS clients" value={systemStatus?.websocketClients ?? 0} animate={false} />
        </div>
      </GlassCard>

      {/* ─── Benchmark ─── */}
      <GlassCard className="p-5 space-y-3 page-enter">
        <div className="text-sm font-semibold">Run Autonomous Benchmark Mission</div>
        <p className="text-xs text-dim leading-relaxed">
          Executes the full pipeline (Planner → Researcher → Coder → Tester → Scientist → Critic → Analyst → Memory)
          on the verified benchmark mission with end-to-end sandbox verification.
        </p>
        <button
          onClick={async () => {
            await runDemo()
            setPage('missions')
          }}
          className="btn-primary"
        >
          ▶ Run Benchmark Mission
        </button>
      </GlassCard>

      {/* ─── About ─── */}
      <GlassCard className="p-5 space-y-3 page-enter">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">About TejaX</div>
          <Badge color="#38bdf8">ARCHITECTURE</Badge>
        </div>
        <p className="text-xs text-dim leading-relaxed">
          TejaX is an <span className="text-[#dbe8ff]">autonomous multi-agent intelligence platform</span> engineered
          for empirical research, sandboxed experimentation, and self-improving code synthesis.
          Agents operate inside an isolated environment with strict resource limits; generated code is always audited
          and verified prior to execution.
        </p>
        <p className="text-[11px] text-faint font-mono">version 0.2.0 · Python FastAPI + React + Multi-Agent Swarm</p>
      </GlassCard>
    </div>
  )
}

function Toggle({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-dim mt-0.5">{desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 rounded-full transition-all duration-300 ${checked ? 'bg-gradient-to-r from-[#3dd6ff] to-[#8b5cf6]' : 'bg-[rgba(125,165,255,0.18)]'}`}
        style={{ width: 52, height: 28 }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300"
          style={{ left: checked ? 26 : 4 }}
        />
      </button>
    </div>
  )
}
