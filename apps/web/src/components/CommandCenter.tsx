import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { AGENTS, STATUS_COLOR } from '../lib/agents'
import { GlassCard, SectionTitle, Stat, StatusDot, ProgressRing, timeStr } from './ui'
import { api } from '../lib/api'

const EXAMPLES = [
  'Generate a large dataset on DNA',
  'Design an AI system for traffic accident prediction',
  'Autonomous API vulnerability fuzzer and patch verification',
  'Exoplanet transit light-curve classification pipeline',
]

const SHOWCASE_PRESETS = [
  {
    icon: '🧬',
    category: 'GENOMICS & BIOINFORMATICS',
    title: 'Generate a large dataset on DNA',
    desc: 'Synthesize 100,000 canonical human nucleotide sequences (GRCh38 aligned) with GC distribution analysis, mutation rate modeling, and exportable FASTA/CSV records.',
    color: '#38bdf8',
    tag: 'FEATURED SHOWCASE',
  },
  {
    icon: '🚗',
    category: 'SMART CITIES & PREDICTIVE ML',
    title: 'Design an AI system for traffic accident prediction',
    desc: 'Predict urban crash probabilities across road networks using temporal sequences, adverse weather factors, and spatial intersection graph networks.',
    color: '#34d399',
    tag: 'ML BENCHMARK',
  },
  {
    icon: '🛡️',
    category: 'CYBERSECURITY & AUDIT',
    title: 'Autonomous API vulnerability fuzzer and patch verification',
    desc: 'Deploy neural critic agents to generate adversarial payloads, audit API endpoints for zero-day CVE patterns, and verify synthetic remediation patches.',
    color: '#fbbf24',
    tag: 'SECURITY SUITE',
  },
  {
    icon: '🪐',
    category: 'ASTROPHYSICS & SPECTROMETRY',
    title: 'Exoplanet transit light-curve classification pipeline',
    desc: 'Mine Kepler and TESS deep space photometry time-series to detect planetary transits, filter false-positive stellar flares, and calculate orbital radii.',
    color: '#a78bfa',
    tag: 'DEEP RESEARCH',
  },
]

const PLACEHOLDERS = [
  'Build a system that predicts traffic accidents…',
  'Generate a large dataset on DNA…',
  'Design a computer vision model for crop diseases…',
  'Detect road safety violations from camera feeds…',
  'Create an autonomous research agent for materials science…',
]

const SAMPLE_DATASETS = [
  {
    id: 'titanic',
    name: 'Titanic Survival (CSV)',
    icon: '🚢',
    filename: 'titanic_passengers.csv',
    prompt: 'Predict Titanic passenger survival based on demographic and voyage features',
    desc: 'Train classification models (logistic regression, decision tree) on real passenger manifest records to evaluate survival probability and feature importance.',
    content: `PassengerId,Survived,Pclass,Sex,Age,SibSp,Parch,Fare,Embarked
1,0,3,male,22,1,0,7.25,S
2,1,1,female,38,1,0,71.2833,C
3,1,3,female,26,0,0,7.925,S
4,1,1,female,35,1,0,53.1,S
5,0,3,male,35,0,0,8.05,S
6,0,3,male,27,0,0,8.4583,Q
7,0,1,male,54,0,0,51.8625,S
8,0,3,male,2,3,1,21.075,S
9,1,3,female,27,0,2,11.1333,S
10,1,2,female,14,1,0,30.0708,C
11,1,3,female,4,1,1,16.7,S
12,1,1,female,58,0,0,26.55,S
13,0,3,male,20,0,0,8.05,S
14,0,3,male,39,1,5,31.275,S
15,0,3,female,14,0,0,7.8542,S
16,1,2,female,55,0,0,16.0,S
17,0,3,male,2,4,1,29.125,Q
18,1,2,male,30,0,0,13.0,S
19,0,3,female,31,1,0,18.0,C
20,1,3,female,22,0,0,7.225,C`,
  },
  {
    id: 'housing',
    name: 'California Housing (CSV)',
    icon: '🏡',
    filename: 'california_housing.csv',
    prompt: 'Predict California median block house values using geospatial and socioeconomic metrics',
    desc: 'Benchmark gradient boosting and linear ridge regression against block group median income, average rooms, and population to predict home valuation.',
    content: `MedInc,HouseAge,AveRooms,AveBedrms,Population,AveOccup,Latitude,Longitude,MedHouseVal
8.3252,41,6.984127,1.02381,322,2.555556,37.88,-122.23,4.526
8.3014,21,6.238137,0.97188,2401,2.109842,37.86,-122.22,3.585
7.2574,52,8.288136,1.073446,496,2.80226,37.85,-122.24,3.521
5.6431,52,5.817352,1.073059,558,2.547945,37.85,-122.25,3.413
3.8462,52,6.281853,1.081081,565,2.181467,37.85,-122.25,3.422
4.0368,52,4.761658,1.103627,413,2.139896,37.85,-122.25,2.697
3.6591,52,4.931907,0.951362,1094,2.128405,37.84,-122.25,2.992
3.12,52,4.797527,1.061824,1157,1.788253,37.84,-122.25,2.414
2.0804,42,4.294118,1.117647,1206,2.026891,37.84,-122.26,2.267
3.6912,52,4.970588,0.990196,1551,2.172269,37.84,-122.25,2.611
3.2031,52,5.477612,1.079602,910,2.263682,37.85,-122.26,2.815
3.2705,52,4.77248,1.024523,1504,2.049046,37.85,-122.26,2.418
3.075,52,5.32265,1.012821,1098,2.346154,37.85,-122.26,2.135
2.6736,52,4.0,1.097701,1212,1.966774,37.84,-122.26,1.913
1.9167,52,4.262903,1.009677,1212,1.954839,37.85,-122.26,1.592
2.125,50,4.242424,1.07197,697,2.640152,37.85,-122.26,1.4
2.775,52,5.939577,1.048338,993,2.990937,37.85,-122.27,1.525
2.1202,52,4.052805,1.019802,648,2.138614,37.85,-122.27,1.555
1.9911,50,4.0,1.044118,990,2.357143,37.84,-122.26,1.587
2.6033,52,5.465455,1.065455,1168,2.123636,37.84,-122.27,1.629`,
  },
  {
    id: 'heart',
    name: 'Heart Disease Clinical Risk (CSV)',
    icon: '❤️',
    filename: 'heart_disease_clinical.csv',
    prompt: 'Predict cardiovascular disease risk using patient hemodynamic measurements',
    desc: 'Train an interpretable clinical decision pipeline to classify risk based on age, cholesterol, resting blood pressure, and ST segment exercise depression.',
    content: `age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,target
63,1,3,145,233,1,0,150,0,2.3,1
37,1,2,130,250,0,1,187,0,3.5,1
41,0,1,130,204,0,0,172,0,1.4,1
56,1,1,120,236,0,1,178,0,0.8,1
57,0,0,120,354,0,1,163,1,0.6,1
57,1,0,140,192,0,1,148,0,0.4,1
56,0,1,140,294,0,0,153,0,1.3,1
44,1,1,120,263,0,1,173,0,0.0,1
52,1,2,172,199,1,1,162,0,0.5,1
57,1,2,150,168,0,1,174,0,1.6,1
54,1,0,140,239,0,1,160,0,1.2,1
48,0,2,130,275,0,1,139,0,0.2,1
49,1,1,130,266,0,1,171,0,0.6,1
64,1,3,110,211,0,0,144,1,1.8,1
58,0,3,150,283,1,0,162,0,1.0,1
50,0,2,120,219,0,1,158,0,1.6,1
58,0,2,120,340,0,1,172,0,0.0,1
66,0,3,150,226,0,1,114,0,2.6,1
43,1,0,150,247,0,1,171,0,1.5,1
69,1,2,140,254,0,0,146,0,2.0,1`,
  },
]

function useCyclePlaceholder(interval = 3200) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PLACEHOLDERS.length), interval)
    return () => clearInterval(t)
  }, [interval])
  return PLACEHOLDERS[i]
}

export default function CommandCenter() {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const systemStatus = useStore((s) => s.systemStatus)
  const metrics = useStore((s) => s.metrics)
  const missions = useStore((s) => s.missions)
  const mission = useStore((s) => s.mission)
  const agents = useStore((s) => s.agents)
  const setPage = useStore((s) => s.setPage)
  const createMission = useStore((s) => s.createMission)
  const startMission = useStore((s) => s.startMission)
  const selectMission = useStore((s) => s.selectMission)
  const setSelectedAgentType = useStore((s) => s.setSelectedAgentType)
  const runDemo = useStore((s) => s.runDemo)

  const ph = useCyclePlaceholder()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [dataset, setDataset] = useState<{
    filename: string
    rows: number
    columns: string[]
    size_bytes: number
    preview: Record<string, unknown>[]
    content: string
  } | null>(null)
  const [uploadingDataset, setUploadingDataset] = useState(false)

  const handleFileUpload = async (file: File) => {
    setUploadingDataset(true)
    setError(null)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const text = e.target?.result as string
        if (!text) return
        const meta = await api.uploadDataset(file.name, text)
        setDataset(meta)
      }
      reader.readAsText(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse dataset file')
    } finally {
      setUploadingDataset(false)
    }
  }

  const attachSampleDataset = async (s: (typeof SAMPLE_DATASETS)[0]) => {
    setTitle(s.prompt)
    setDesc(s.desc)
    try {
      const meta = await api.uploadDataset(s.filename, s.content)
      setDataset(meta)
    } catch {
      // ignore
    }
  }

  const launch = async () => {
    if (!title.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const m = await createMission(
        title.trim(),
        desc.trim(),
        dataset
          ? {
              filename: dataset.filename,
              content: dataset.content,
              metadata: {
                rows: dataset.rows,
                columns: dataset.columns,
                size_bytes: dataset.size_bytes,
                preview: dataset.preview,
              },
            }
          : null,
      )
      await startMission(m.id)
      setPage('missions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to launch mission')
    } finally {
      setBusy(false)
    }
  }

  const launchDemo = async () => {
    setBusy(true)
    setError(null)
    try {
      await runDemo()
      setPage('missions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Benchmark run failed')
    } finally {
      setBusy(false)
    }
  }

  const launchPreset = async (pTitle: string, pDesc: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setTitle(pTitle)
    setDesc(pDesc)
    try {
      const m = await createMission(pTitle, pDesc)
      await startMission(m.id)
      setPage('missions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to launch preset mission')
    } finally {
      setBusy(false)
    }
  }

  const live = mission && mission.status !== 'CREATED'

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-faint mb-5">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-[rgba(125,165,255,0.5)]" />
          AI Experimentation & Agent Engineering Platform
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-[rgba(125,165,255,0.5)]" />
        </div>

        {/* animated brand mark */}
        <div className="flex justify-center mb-4">
          <div className="relative h-20 w-20 grid place-items-center">
            <svg viewBox="0 0 80 80" className="h-20 w-20">
              <defs>
                <linearGradient id="ccx" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3dd6ff" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <g className="animate-spin-slow origin-center" style={{ transformOrigin: '40px 40px' }}>
                <path d="M40 6 L68 22 V58 L40 74 L12 58 V22 Z" fill="none" stroke="url(#ccx)" strokeWidth="2" />
                <path d="M40 6 L68 22 L40 38 L12 22 Z" fill="url(#ccx)" opacity="0.22" />
              </g>
              <path d="M26 40 L54 40 M40 26 L40 54 M30 30 L50 50 M50 30 L30 50" stroke="url(#ccx)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="40" cy="40" r="6" fill="none" stroke="#fff" strokeWidth="1.4" className="animate-pulse-glow" />
            </svg>
          </div>
        </div>

        <h1 className="text-6xl font-bold tracking-[0.16em] text-grad drop-shadow-[0_0_30px_rgba(61,214,255,0.25)]">
          TEJAX
        </h1>
        <p className="text-dim text-lg mt-3 tracking-wide">Give intelligence a mission.</p>
      </div>

      {/* Mission input */}
      <GlassCard className="p-6 mb-6">
        <SectionTitle hint="mission → plan → research → build → experiment → report" icon="◈">
          What should TejaX solve?
        </SectionTitle>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && launch()}
          placeholder={ph}
          aria-label="Mission statement"
          className="field px-4 py-3.5 text-lg"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Optional context — constraints, data, success criteria…"
          rows={2}
          className="field mt-3 px-4 py-3 text-sm resize-none"
        />

        {/* Real Dataset Ingestion Dropzone & Selector */}
        <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-cyan-400 font-bold">📁 ATTACH DATASET (CSV / JSON)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                PHASE 2: REAL DATA VALIDATION
              </span>
            </div>
            {dataset && (
              <button
                type="button"
                onClick={() => setDataset(null)}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 hover:underline"
              >
                ✕ REMOVE DATASET
              </button>
            )}
          </div>

          {dataset ? (
            <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-xs font-mono font-bold text-white">{dataset.filename}</span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    ({dataset.rows} rows · {dataset.columns.length} columns)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/60">
                  REAL EVIDENCE BADGE ACTIVE
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {dataset.columns.slice(0, 10).map((col) => (
                  <span
                    key={col}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                  >
                    {col}
                  </span>
                ))}
                {dataset.columns.length > 10 && (
                  <span className="text-[10px] font-mono text-slate-500 py-0.5">
                    +{dataset.columns.length - 10} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-xl p-4 text-center transition-all bg-slate-900/30 hover:bg-slate-900/60"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileUpload(f)
                  }}
                />
                <div className="text-xs text-slate-300">
                  {uploadingDataset ? (
                    <span className="text-cyan-400 font-mono animate-pulse">Uploading and parsing schema…</span>
                  ) : (
                    <>
                      <span className="font-semibold text-white">Click or drag & drop</span> to attach real CSV or JSON
                      data for experiments
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  Sandbox will mount the file and agents will benchmark models on real records
                </div>
              </div>

              {/* Quick sample datasets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">1-Click Real Datasets:</span>
                {SAMPLE_DATASETS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => attachSampleDataset(s)}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-800 transition-all flex items-center gap-1.5"
                  >
                    <span>{s.icon}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setTitle(ex)
                setDesc('')
              }}
              className="chip"
            >
              {ex}
            </button>
          ))}
        </div>
        {error && <div className="mt-3 text-sm text-err">{error}</div>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={launch} disabled={!title.trim() || busy} className="btn-primary">
            {busy ? 'LAUNCHING…' : 'START MISSION'}
          </button>
          <button onClick={() => setPage('lab')} className="btn-ghost">ENTER LAB</button>
          <button onClick={() => setPage('missions')} className="btn-ghost">VIEW MISSIONS</button>
          <button onClick={launchDemo} disabled={busy} className="btn-ghost">
            ⚡ RUN BENCHMARK
          </button>
        </div>
      </GlassCard>

      {/* Research & Simulation Showcase Benchmarks */}
      <div className="mb-6">
        <SectionTitle hint="1-click verified multi-agent benchmark workflows" icon="⚡">
          Showcase Benchmarks & Simulations
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {SHOWCASE_PRESETS.map((preset) => (
            <GlassCard
              key={preset.title}
              className="p-5 flex flex-col justify-between group hover:border-[rgba(61,214,255,0.4)] transition-all duration-300 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-full blur-3xl opacity-15"
                style={{ backgroundColor: preset.color }}
              />
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{preset.icon}</span>
                    <span
                      className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                      style={{
                        color: preset.color,
                        backgroundColor: `${preset.color}15`,
                        border: `1px solid ${preset.color}35`,
                      }}
                    >
                      {preset.category}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-faint tracking-wider">{preset.tag}</span>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-[#3dd6ff] transition-colors leading-snug">
                  {preset.title}
                </h3>
                <p className="text-xs text-dim mt-2 leading-relaxed line-clamp-3">
                  {preset.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTitle(preset.title)
                    setDesc(preset.desc)
                    window.scrollTo({ top: 120, behavior: 'smooth' })
                  }}
                  className="text-xs text-faint hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span>📋</span> Load Prompt
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => launchPreset(preset.title, preset.desc)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                  style={{
                    backgroundColor: `${preset.color}22`,
                    color: preset.color,
                    border: `1px solid ${preset.color}55`,
                  }}
                >
                  <span>⚡</span> {busy ? 'Launching…' : 'Launch Benchmark'}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* System status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        <Stat label="Agents online" icon="◇" value={systemStatus?.agentsOnline ?? 0} accent="#3dd6ff" />
        <Stat label="Memory entries" icon="✦" value={systemStatus?.memoryCount ?? 0} accent="#a78bfa" />
        <Stat
          label="Current mission"
          value={systemStatus?.currentMission ? 'RUNNING' : 'idle'}
          accent={systemStatus?.currentMission ? '#34d399' : '#52658f'}
        />
        <Stat label="Model" value={systemStatus?.mode ?? 'demo'} accent="#f472b6" />
      </div>

      {/* Agent Fleet Overview */}
      <SectionTitle hint="click any agent to inspect" icon="◇">Agent Fleet</SectionTitle>
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-6 stagger">
        {AGENTS.map((meta) => {
          const liveAgent = agents.find((a) => a.type === meta.type)
          const status = liveAgent?.status ?? 'OFFLINE'
          const active = status === 'ACTIVE'
          return (
            <div
              key={meta.type}
              onClick={() => {
                setSelectedAgentType(meta.type)
                setPage('agents')
              }}
              className="glass rounded-xl p-3 card cursor-pointer text-center transition-all"
              style={{
                borderColor: active ? meta.color : undefined,
                boxShadow: active ? `0 0 16px ${meta.color}22` : undefined,
              }}
            >
              <div className="w-12 h-14 mx-auto mb-1 flex items-center justify-center">
                <img
                  src={meta.avatar}
                  alt={meta.name}
                  className="w-10 h-12 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="text-[10px] font-bold tracking-wide truncate" style={{ color: meta.color }}>
                {meta.name}
              </div>
              <div className="mt-1.5 flex justify-center">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLOR[status], boxShadow: `0 0 6px ${STATUS_COLOR[status]}` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Live mission strip */}
      {live && mission && (
        <GlassCard className="p-4 mb-6 flex items-center gap-4">
          <StatusDot status="ACTIVE" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{mission.title}</div>
            <div className="text-[11px] text-faint font-mono">
              {mission.status} · {mission.currentPhase || '…'}
            </div>
          </div>
          <button onClick={() => setPage('missions')} className="ml-auto text-xs text-accent hover:underline">
            Follow →
          </button>
        </GlassCard>
      )}

      {/* Recent missions */}
      <SectionTitle hint="most recent first" icon="◎">Recent missions</SectionTitle>
      <div className="space-y-2 stagger">
        {missions.length === 0 && (
          <GlassCard className="p-8 text-center text-dim text-sm">
            No missions yet — enter one above or launch a benchmark.
          </GlassCard>
        )}
        {missions.slice(0, 6).map((m) => (
          <GlassCard
            key={m.id}
            className="p-3.5 flex items-center gap-4"
            onClick={() => {
              selectMission(m.id).then(() => setPage('missions'))
            }}
          >
            <StatusDot status={m.status} />
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{m.title}</div>
              <div className="text-[10px] text-faint font-mono">
                {timeStr(m.createdAt ? new Date(m.createdAt).getTime() : null)}
                {m.report?.experiments?.length ? ` · ${m.report.experiments.length} experiments` : ''}
              </div>
            </div>
            <span
              className="status-pill"
              style={{
                color: m.status === 'COMPLETED' ? '#34d399' : m.status === 'FAILED' ? '#fb7185' : '#3dd6ff',
                backgroundColor: `${m.status === 'COMPLETED' ? '#34d399' : m.status === 'FAILED' ? '#fb7185' : '#3dd6ff'}12`,
                border: `1px solid ${m.status === 'COMPLETED' ? '#34d399' : m.status === 'FAILED' ? '#fb7185' : '#3dd6ff'}2e`,
              }}
            >
              {m.status}
            </span>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
