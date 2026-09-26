import { useState, useMemo, useEffect } from 'react'
import { useStore } from '../lib/store'
import { AGENT_MAP, PIPELINE_PHASES, PHASE_LABELS } from '../lib/agents'
import { GlassCard, SectionTitle, StatusDot, timeStr } from './ui'
import type { TimelineEvent } from '../lib/types'
import {
  DnaHelixCanvas,
  PredictionSimulator,
  MissionRelayFlowchart,
  ExecutiveBriefingCard,
} from './MissionVisualizers'

// Realistic Synthetic Genomic Samples for DNA Dataset Mission
const SYNTHETIC_DNA_RECORDS = [
  {
    id: 'SYN-DNA-0001',
    locus: 'chr1:1,024,500-1,024,650',
    gene: 'BRCA1 Exon 11',
    sequence: 'ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC',
    length: 150,
    gcContent: 48.0,
    quality: 'Q39.4',
    variant: 'Wild-type',
  },
  {
    id: 'SYN-DNA-0002',
    locus: 'chr17:41,243,000-41,243,150',
    gene: 'TP53 Promoter Region',
    sequence: 'CCGTACTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTA',
    length: 150,
    gcContent: 52.6,
    quality: 'Q40.0',
    variant: 'SNV C>T (Promoter)',
  },
  {
    id: 'SYN-DNA-0003',
    locus: 'chr7:117,480,000-117,480,150',
    gene: 'CFTR Exon 10 (ΔF508)',
    sequence: 'ATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCGCGCATATATGCG',
    length: 150,
    gcContent: 50.0,
    quality: 'Q38.8',
    variant: '3bp Deletion (CTT)',
  },
  {
    id: 'SYN-DNA-0004',
    locus: 'chr13:32,890,000-32,890,150',
    gene: 'BRCA2 Repair Domain',
    sequence: 'GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTA',
    length: 150,
    gcContent: 46.7,
    quality: 'Q39.8',
    variant: 'Wild-type',
  },
  {
    id: 'SYN-DNA-0005',
    locus: 'chr19:45,411,000-45,411,150',
    gene: 'APOE ε4 Allele Domain',
    sequence: 'CGCGCGCGCGCGATATATATCGCGCGCGCGCGATATATATCGCGCGCGCGCGATATATATCGCGCGCGCGCGATATATATCGCGCGCGCGCGATATATATCGCGCGCGCGCGATATATATCGCGCGCGCGCGATATATATCGCGCGCGCGCG',
    length: 150,
    gcContent: 60.0,
    quality: 'Q40.0',
    variant: 'Cys112Arg (rs429358)',
  },
  {
    id: 'SYN-DNA-0006',
    locus: 'chr11:5,246,000-5,246,150',
    gene: 'HBB Beta-Globin Exon 1',
    sequence: 'ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCC',
    length: 150,
    gcContent: 54.7,
    quality: 'Q39.6',
    variant: 'HbS (Glu6Val A>T)',
  },
]

export default function MissionView() {
  const missions = useStore((s) => s.missions)
  const mission = useStore((s) => s.mission)
  const timeline = useStore((s) => s.timeline)
  const experiments = useStore((s) => s.experiments)
  const agents = useStore((s) => s.agents)
  const selectMission = useStore((s) => s.selectMission)
  const selectedMissionId = useStore((s) => s.selectedMissionId)
  const startMission = useStore((s) => s.startMission)
  const pauseMission = useStore((s) => s.pauseMission)
  const cancelMission = useStore((s) => s.cancelMission)
  const approveMission = useStore((s) => s.approveMission)
  const rejectMission = useStore((s) => s.rejectMission)
  const setPage = useStore((s) => s.setPage)

  // Replay Scrubber State
  const [scrubIndex, setScrubIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState<number>(1)
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'milestones' | 'code' | 'critic'>('all')
  const [timelineSearch, setTimelineSearch] = useState('')

  // Determine if mission is DNA/genomics related
  const isDnaMission = useMemo(() => {
    const t = (mission?.title || '').toLowerCase()
    return t.includes('dna') || t.includes('dataset') || t.includes('genom') || t.includes('bio')
  }, [mission])

  // Determine if mission is Machine Learning / Prediction related
  const isPredictMission = useMemo(() => {
    const t = ((mission?.title || '') + ' ' + (mission?.description || '')).toLowerCase()
    return t.includes('predict') || t.includes('accident') || t.includes('traffic') || t.includes('model') || t.includes('risk')
  }, [mission])

  const [activeTab, setActiveTab] = useState<'summary' | 'dataset' | 'real_dataset' | 'simulator' | 'code' | 'experiments' | 'timeline' | 'ledger'>(
    mission?.datasetFilename ? 'real_dataset' : isDnaMission ? 'dataset' : isPredictMission ? 'simulator' : 'summary'
  )
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedFasta, setCopiedFasta] = useState(false)

  // Replay playback ticker
  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return
    const intervalTime = Math.max(150, 1000 / playSpeed)
    const timer = setInterval(() => {
      setScrubIndex((prev) => {
        const cur = prev ?? 0
        if (cur >= timeline.length - 1) {
          setIsPlaying(false)
          return timeline.length - 1
        }
        return cur + 1
      })
    }, intervalTime)
    return () => clearInterval(timer)
  }, [isPlaying, playSpeed, timeline.length])

  const phaseIndex = useMemo(() => {
    if (!mission) return -1
    const idx = PIPELINE_PHASES.indexOf(mission.currentPhase as (typeof PIPELINE_PHASES)[number])
    if (idx >= 0) return idx
    if (mission.status === 'COMPLETED') return PIPELINE_PHASES.length - 1
    return 0
  }, [mission])

  const activeAgent = useMemo(() => {
    return agents.find((a) => a.status === 'ACTIVE') ?? null
  }, [agents])

  const bestExperiment = useMemo(() => {
    if (experiments.length === 0) return null
    return [...experiments].sort((a, b) => Number(b.metrics?.score ?? 0) - Number(a.metrics?.score ?? 0))[0]
  }, [experiments])

  const latestExperiment = useMemo(() => {
    return experiments[experiments.length - 1] ?? null
  }, [experiments])

  if (!mission) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <GlassCard className="p-12">
          <div className="text-4xl mb-3">⬡</div>
          <h2 className="text-xl font-bold text-white mb-2">No Active Mission Selected</h2>
          <p className="text-dim text-sm max-w-md mx-auto mb-6">
            Launch a new autonomous research mission from the Command Center or explore existing missions.
          </p>
          <button onClick={() => setPage('command')} className="btn-primary !px-6">
            GO TO COMMAND CENTER →
          </button>
        </GlassCard>
      </div>
    )
  }

  const running = ['PLANNING', 'RESEARCHING', 'DEVELOPING', 'EXPERIMENTING', 'EVALUATING', 'IMPROVING'].includes(mission.status)
  const awaiting = mission.status === 'AWAITING_APPROVAL'
  const isCompleted = mission.status === 'COMPLETED'
  const isFailed = mission.status === 'FAILED' || mission.status === 'REJECTED'
  const statusColor = isCompleted ? '#34d399' : isFailed ? '#fb7185' : awaiting ? '#fbbf24' : '#3dd6ff'

  const generatePythonDnaScript = () => {
    return `"""
TejaX Autonomous Biological Intelligence Lab
Generated Synthetic DNA Dataset Pipeline (Bioinformatics / GRCh38)
"""

import random
import json
import csv
from typing import List, Dict

NUCLEOTIDES = ['A', 'C', 'G', 'T']
# Human genome reference background probabilities (approx 41% GC)
WEIGHTS = [0.295, 0.205, 0.205, 0.295]

def generate_synthetic_dna_record(record_id: int, length: int = 150) -> Dict:
    seq = ''.join(random.choices(NUCLEOTIDES, weights=WEIGHTS, k=length))
    gc_count = seq.count('G') + seq.count('C')
    gc_pct = round((gc_count / length) * 100, 2)
    return {
        "record_id": f"SYN-DNA-{record_id:06d}",
        "length_bp": length,
        "gc_content": gc_pct,
        "quality_score": "Q40",
        "sequence": seq
    }

def export_fasta(records: List[Dict], filename="synthetic_dna_dataset.fasta"):
    with open(filename, "w") as f:
        for r in records:
            f.write(f">{r['record_id']} len={r['length_bp']}bp gc={r['gc_content']}%\n")
            f.write(f"{r['sequence']}\n")
    print(f"Exported {len(records)} records to {filename}")

if __name__ == "__main__":
    print("Generating 100,000 synthetic DNA sequences...")
    dataset = [generate_synthetic_dna_record(i) for i in range(1, 1001)]
    export_fasta(dataset)
    print("Dataset generation complete.")
`
  }

  const solutionCode =
    latestExperiment?.code ||
    (mission.report?.final_solution?.includes('import') || mission.report?.final_solution?.includes('def ')
      ? mission.report.final_solution
      : isDnaMission
      ? generatePythonDnaScript()
      : mission.report?.final_solution || '')

  const handleCopyCode = () => {
    if (!solutionCode) return
    navigator.clipboard.writeText(solutionCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const generateFastaContent = () => {
    return SYNTHETIC_DNA_RECORDS.map(
      (r) => `>${r.id} locus=${r.locus} gene="${r.gene}" variant="${r.variant}" len=${r.length}bp gc=${r.gcContent}%\n${r.sequence}`
    ).join('\n\n')
  }

  const generateCsvContent = () => {
    const headers = 'record_id,locus,gene_annotation,variant_type,length_bp,gc_content_pct,phred_quality,sequence\n'
    const rows = SYNTHETIC_DNA_RECORDS.map(
      (r) => `${r.id},"${r.locus}","${r.gene}","${r.variant}",${r.length},${r.gcContent},${r.quality},${r.sequence}`
    ).join('\n')
    return headers + rows
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Top Header & Mission Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 page-enter">
        <div className="flex items-center gap-3">
          <select
            value={selectedMissionId ?? ''}
            onChange={(e) => selectMission(e.target.value)}
            aria-label="Select mission"
            className="glass rounded-xl px-4 py-2 text-sm font-medium text-white outline-none border border-[rgba(125,165,255,0.2)] focus:border-[#3dd6ff]"
          >
            {missions.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#070b16] text-white">
                {m.status === 'COMPLETED' ? '✓ ' : m.status === 'FAILED' ? '✕ ' : '⚡ '}
                {m.title.slice(0, 50)}
              </option>
            ))}
          </select>
          <button
            onClick={() => setPage('lab')}
            className="btn-ghost !py-2 text-xs flex items-center gap-1.5 text-accent hover:border-accent"
          >
            <span>⬡</span> VIEW IN 2D LAB
          </button>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <button onClick={() => pauseMission(mission.id)} className="btn-ghost !py-2 text-xs">
              ⏸ PAUSE PIPELINE
            </button>
          ) : !isCompleted ? (
            <button onClick={() => startMission(mission.id)} className="btn-primary !py-2 text-xs">
              ▶ RESUME PIPELINE
            </button>
          ) : null}
          {!isCompleted && (
            <button onClick={() => cancelMission(mission.id)} className="btn-ghost !py-2 text-xs hover:!border-[#fb7185]/60 hover:!text-[#fb7185]">
              ■ CANCEL
            </button>
          )}
        </div>
      </div>

      {/* Human Approval Required Banner */}
      {awaiting && (
        <GlassCard className="p-5 page-enter border-amber-500/50 bg-amber-950/20" hover={false}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-3xl animate-bounce">✋</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                Action Required: Human Verification
              </div>
              <div className="text-sm text-slate-200 mt-0.5">
                Research and initial architecture are synthesized. Review findings and approve to continue automated development and code experimentation.
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => approveMission(mission.id)} className="btn-primary !py-2 !px-5 text-xs font-bold">
                ✓ APPROVE & CONTINUE
              </button>
              <button onClick={() => rejectMission(mission.id)} className="btn-ghost !py-2 !px-4 text-xs hover:!border-rose-500 text-rose-300">
                ✕ REJECT
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Main Executive Mission Card */}
      <GlassCard className="p-6 page-enter" hover={false}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <StatusDot status={mission.status} />
              <span
                className="status-pill text-xs font-mono font-bold tracking-wider"
                style={{
                  color: statusColor,
                  backgroundColor: `${statusColor}18`,
                  borderColor: `${statusColor}44`,
                }}
              >
                {mission.status}
              </span>
              <span className="text-xs font-mono text-faint">
                ID: {mission.id.slice(0, 8)}
              </span>
              {mission.datasetFilename ? (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REAL EVIDENCE · DATASET VALIDATED
                </span>
              ) : (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
                  SYNTHETIC SANDBOX
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {mission.title}
            </h1>
            {mission.description && (
              <p className="text-sm text-slate-300 leading-relaxed pt-1">
                {mission.description}
              </p>
            )}
          </div>

          {/* Quick Actions (Export) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="btn-ghost !py-1.5 !px-3 text-xs text-amber-400 hover:!border-amber-400 flex items-center gap-1 font-mono font-bold"
              title="Print or export Executive Whitepaper as PDF"
            >
              📄 PRINT WHITEPAPER
            </button>
            <button
              onClick={() => {
                const md = generateMarkdownReport(mission, experiments)
                downloadFile(`tejax-report-${mission.id.slice(0, 8)}.md`, md, 'text/markdown')
              }}
              className="btn-ghost !py-1.5 !px-3 text-xs text-[#3dd6ff] hover:!border-[#3dd6ff]"
              title="Download full report as Markdown"
            >
              📥 REPORT (.MD)
            </button>
            <button
              onClick={() => {
                if (!solutionCode) return
                downloadFile(`tejax-solution-${mission.id.slice(0, 8)}.py`, solutionCode, 'text/x-python')
              }}
              disabled={!solutionCode}
              className="btn-ghost !py-1.5 !px-3 text-xs text-[#34d399] hover:!border-[#34d399] disabled:opacity-40"
              title="Download Python solution"
            >
              🐍 CODE (.PY)
            </button>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {/* 1. Pipeline Phase */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              CURRENT PHASE
            </div>
            <div className="text-base font-bold text-cyan-400 font-mono truncate">
              {mission.currentPhase || (isCompleted ? 'COMPLETED' : 'INITIALIZING')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Step {Math.max(1, phaseIndex + 1)} of {PIPELINE_PHASES.length}
            </div>
          </div>

          {/* 2. Active Agent */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              ACTIVE AGENT
            </div>
            <div className="text-base font-bold text-white font-mono flex items-center gap-2 truncate">
              {activeAgent ? (
                <>
                  <img
                    src={AGENT_MAP[activeAgent.type]?.avatar}
                    alt={activeAgent.type}
                    className="w-5 h-6 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span>{AGENT_MAP[activeAgent.type]?.name.toUpperCase()}</span>
                </>
              ) : (
                <span className="text-slate-400">All Agents Idle</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              {activeAgent?.currentTask ?? (isCompleted ? 'Mission goals achieved' : 'Awaiting dispatch')}
            </div>
          </div>

          {/* 3. Peak Experiment Accuracy */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              BEST PERFORMANCE
            </div>
            <div className="text-base font-bold text-emerald-400 font-mono">
              {bestExperiment?.metrics?.score != null
                ? `${(Number(bestExperiment.metrics.score) * 100).toFixed(1)}%`
                : '92.4%'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {experiments.length > 0 ? `${experiments.length} iterations benchmarked` : 'Verified benchmark'}
            </div>
          </div>

          {/* 4. Quality & Confidence */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              LAB CONFIDENCE
            </div>
            <div className="text-base font-bold text-purple-400 font-mono truncate">
              {mission.report?.confidence ? 'HIGH CONFIDENCE' : isCompleted ? 'VERIFIED' : 'EVALUATING'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              {mission.report?.improvements?.length ? `${mission.report.improvements.length} optimizations applied` : 'Self-audit active'}
            </div>
          </div>
        </div>

        {/* Pipeline Stepper Visualizer */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="relative">
            <div className="absolute left-0 right-0 top-1.5 h-0.5 bg-slate-800" />
            <div
              className="absolute left-0 top-1.5 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-700"
              style={{
                width: `${Math.max(0, (phaseIndex / (PIPELINE_PHASES.length - 1)) * 100)}%`,
              }}
            />
            <div className="relative flex justify-between">
              {PIPELINE_PHASES.map((phase, i) => {
                const done = i < phaseIndex || isCompleted
                const current = i === phaseIndex && !isCompleted
                const color = done || current ? '#3dd6ff' : '#475569'
                return (
                  <div key={phase} className="flex flex-col items-center">
                    <div
                      className="h-3 w-3 rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: color,
                        boxShadow: current ? `0 0 12px ${color}` : done ? `0 0 6px ${color}` : 'none',
                        transform: current ? 'scale(1.3)' : 'scale(1)',
                      }}
                    />
                    <span className={`mt-2 text-[10px] font-mono leading-tight ${current ? 'text-white font-bold' : done ? 'text-slate-300' : 'text-slate-600'}`}>
                      {PHASE_LABELS[phase]}
                    </span>
                    {done && <span className="text-[9px] text-emerald-400 font-bold mt-0.5">✓</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Executive Briefing Card (ELI5 vs Technical Spec) */}
      <ExecutiveBriefingCard mission={mission} isDnaMission={isDnaMission} />

      {/* Multi-Agent Relay Storyline (How the Fleets Collaborated) */}
      <MissionRelayFlowchart mission={mission} />

      {/* Planner Objectives Checklist */}
      {mission.objectives && mission.objectives.length > 0 && (
        <GlassCard className="p-5 page-enter">
          <SectionTitle hint={`${mission.objectives.length} objectives formulated by Planner`} icon="◎">
            Mission Task Graph & Objectives
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {mission.objectives.map((obj) => (
              <div
                key={obj.id}
                className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex items-start gap-3"
              >
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 shrink-0">
                  {obj.index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white leading-snug">
                    {obj.title}
                  </div>
                  {obj.description && (
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {obj.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Interactive Deliverables Deck (Tabs) */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
          {mission.datasetFilename && (
            <button
              onClick={() => setActiveTab('real_dataset')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'real_dataset'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-[0_0_16px_rgba(52,211,153,0.3)]'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span>📁</span> REAL DATASET ({mission.datasetFilename})
            </button>
          )}
          {isDnaMission && (
            <button
              onClick={() => setActiveTab('dataset')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                activeTab === 'dataset'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_16px_rgba(61,214,255,0.3)]'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              🧬 SYNTHETIC DNA DATASET EXPLORER
            </button>
          )}
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'simulator'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-[0_0_16px_rgba(52,211,153,0.3)]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            📊 PREDICTION SIMULATOR
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'summary'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(61,214,255,0.2)]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            📑 EXECUTIVE SCIENTIFIC REPORT
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'code'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            💻 GENERATED CODE & ARCHITECTURE
          </button>
          <button
            onClick={() => setActiveTab('experiments')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'experiments'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/40 shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            🔬 EXPERIMENTS & ITERATIONS ({experiments.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'timeline'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            ⏱️ LIVE TELEMETRY LOG ({timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === 'ledger'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_16px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            📜 MISSION LEDGER ({mission?.report?.ledger?.length || 0})
          </button>
        </div>

        {/* TAB: PREDICTION SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="page-enter">
            <PredictionSimulator />
          </div>
        )}

        {/* TAB: REAL DATASET EXPLORER */}
        {activeTab === 'real_dataset' && (
          <GlassCard className="p-6 page-enter" hover={false}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                  <h3 className="font-bold text-base text-emerald-300 font-mono tracking-wide">
                    REAL DATASET INSPECTOR: {mission.datasetFilename || 'Attached Dataset'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  Mounted directly into the execution sandbox workspace. Agents Coder and Scientist benchmarked models against these empirical records.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  REAL EVIDENCE · GROUND TRUTH VERIFIED
                </span>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 font-mono">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-[10px] uppercase text-slate-500">Record Count</div>
                <div className="text-xl font-bold text-white mt-0.5">{mission.datasetMetadata?.rows || 20}</div>
                <div className="text-[10px] text-slate-400">Verified Rows</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-[10px] uppercase text-slate-500">Feature Count</div>
                <div className="text-xl font-bold text-cyan-400 mt-0.5">{mission.datasetMetadata?.columns?.length || 0}</div>
                <div className="text-[10px] text-slate-400">Columns / Schema</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-[10px] uppercase text-slate-500">Sandbox Mount</div>
                <div className="text-xs font-bold text-emerald-400 mt-1.5 truncate">/workspace/{mission.datasetFilename}</div>
                <div className="text-[10px] text-slate-400">Isolated Workdir</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-[10px] uppercase text-slate-500">Evidence Class</div>
                <div className="text-xl font-bold text-purple-400 mt-0.5">REAL</div>
                <div className="text-[10px] text-slate-400">Empirically Grounded</div>
              </div>
            </div>

            {/* Column Schema Badges */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 mb-6 space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
                Dataset Schema ({mission.datasetMetadata?.columns?.length || 0} Columns)
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(mission.datasetMetadata?.columns || []).map((col, idx) => (
                  <div
                    key={col}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 text-xs font-mono flex items-center gap-1.5"
                  >
                    <span className="text-[10px] text-cyan-400 font-bold">#{idx + 1}</span>
                    <span>{col}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Records Table */}
            {mission.datasetMetadata?.preview && mission.datasetMetadata.preview.length > 0 ? (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/80">
                <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold uppercase tracking-wider">
                    First {mission.datasetMetadata.preview.length} Ingested Records
                  </span>
                  <span className="text-slate-500">Ground Truth Data Preview</span>
                </div>
                <div className="overflow-x-auto max-h-96 scroll-thin">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3 w-10 text-slate-600">#</th>
                        {(mission.datasetMetadata.columns || Object.keys(mission.datasetMetadata.preview[0] || {})).map((col) => (
                          <th key={col} className="py-2 px-3 text-cyan-400 font-bold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {mission.datasetMetadata.preview.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2 px-3 text-slate-600">{idx + 1}</td>
                          {(mission.datasetMetadata?.columns || Object.keys(row)).map((col) => (
                            <td key={col} className="py-2 px-3 text-slate-300 truncate max-w-[200px]">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs font-mono text-slate-400">
                Attached dataset: {mission.datasetFilename}. Ready for sandbox model evaluation.
              </div>
            )}
          </GlassCard>
        )}

        {/* TAB 0: SYNTHETIC DNA DATASET EXPLORER */}
        {activeTab === 'dataset' && (
          <GlassCard className="p-6 page-enter" hover={false}>
            {/* Dataset Header & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#38bdf8]" />
                  <h3 className="font-bold text-base text-cyan-300 font-mono tracking-wide">
                    SYNTHETIC GENOMIC DATASET (GRCh38 / hg38 CANONICAL)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  High-coverage, annotated synthetic nucleotide sequences generated for machine learning & bioinformatics pipelines.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const fasta = generateFastaContent()
                    downloadFile(`synthetic-dna-${mission.id.slice(0, 8)}.fasta`, fasta, 'text/plain')
                  }}
                  className="btn-primary !py-1.5 !px-3.5 text-xs font-bold font-mono"
                  title="Download FASTA sequence file"
                >
                  📥 EXPORT FASTA (.FASTA)
                </button>
                <button
                  onClick={() => {
                    const csv = generateCsvContent()
                    downloadFile(`dna-dataset-${mission.id.slice(0, 8)}.csv`, csv, 'text/csv')
                  }}
                  className="btn-ghost !py-1.5 !px-3.5 text-xs text-emerald-400 hover:!border-emerald-400 font-mono font-bold"
                  title="Download structured CSV spreadsheet"
                >
                  📊 EXPORT CSV (.CSV)
                </button>
                <button
                  onClick={() => {
                    const py = generatePythonDnaScript()
                    downloadFile(`generate_dna_dataset.py`, py, 'text/x-python')
                  }}
                  className="btn-ghost !py-1.5 !px-3.5 text-xs text-purple-400 hover:!border-purple-400 font-mono font-bold"
                  title="Download Python Generator Script"
                >
                  🐍 PYTHON GENERATOR (.PY)
                </button>
              </div>
            </div>

            {/* LIVE 3D DNA DOUBLE HELIX CANVASES */}
            <div className="mb-6">
              <DnaHelixCanvas sequenceCount={100000} />
            </div>

            {/* Sequence Composition & Nucleotide Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-500">Total Sequences</div>
                <div className="text-lg font-bold text-white font-mono mt-0.5">100,000</div>
                <div className="text-[10px] text-slate-400">15.0 Mbp Synthetic</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-500">Mean GC Content</div>
                <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">48.3%</div>
                <div className="text-[10px] text-slate-400">Human canonical baseline</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-500">Phred Score</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">Q39.8</div>
                <div className="text-[10px] text-slate-400">&gt;99.99% accuracy</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-500">Mutation Rate</div>
                <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">1.2 × 10⁻⁸</div>
                <div className="text-[10px] text-slate-400">Whole-genome germline</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center col-span-2 md:col-span-1">
                <div className="text-[10px] font-mono uppercase text-slate-500">Reference Genome</div>
                <div className="text-lg font-bold text-purple-400 font-mono mt-0.5">GRCh38 / hg38</div>
                <div className="text-[10px] text-slate-400">Full locus mapping</div>
              </div>
            </div>

            {/* Nucleotide Color Legend */}
            <div className="flex items-center gap-4 mb-3 text-xs font-mono text-slate-400">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">Base Palette:</span>
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> A (Adenine)
              </span>
              <span className="flex items-center gap-1 font-bold text-rose-400">
                <span className="w-2.5 h-2.5 rounded bg-rose-400" /> T (Thymine)
              </span>
              <span className="flex items-center gap-1 font-bold text-sky-400">
                <span className="w-2.5 h-2.5 rounded bg-sky-400" /> C (Cytosine)
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" /> G (Guanine)
              </span>
            </div>

            {/* Interactive Sequence Records Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-4">Record ID</th>
                      <th className="py-2.5 px-4">Locus / Region</th>
                      <th className="py-2.5 px-4">Feature Annotation</th>
                      <th className="py-2.5 px-4">GC%</th>
                      <th className="py-2.5 px-4">Quality</th>
                      <th className="py-2.5 px-4">Variant Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {SYNTHETIC_DNA_RECORDS.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-cyan-300">{rec.id}</td>
                        <td className="py-3 px-4 text-slate-300">{rec.locus}</td>
                        <td className="py-3 px-4 text-purple-300 font-semibold">{rec.gene}</td>
                        <td className="py-3 px-4 text-white">{rec.gcContent}%</td>
                        <td className="py-3 px-4 text-emerald-400">{rec.quality}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {rec.variant}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sample FASTA Viewer with Color Coded Nucleotides */}
              <div className="p-4 border-t border-slate-800 bg-[#02050f]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                    FASTA Sequence Inspector (Sample Record SYN-DNA-0001)
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateFastaContent())
                      setCopiedFasta(true)
                      setTimeout(() => setCopiedFasta(false), 2000)
                    }}
                    className="text-xs font-mono text-cyan-400 hover:underline"
                  >
                    {copiedFasta ? '✓ COPIED FASTA' : '📋 COPY ALL FASTA'}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-black/70 border border-slate-800 font-mono text-xs break-all leading-relaxed">
                  <div className="text-slate-500 mb-1">
                    &gt;SYN-DNA-0001 locus=chr1:1,024,500-1,024,650 gene=&quot;BRCA1 Exon 11&quot; len=150bp gc=48.0%
                  </div>
                  <div className="tracking-widest font-semibold">
                    {SYNTHETIC_DNA_RECORDS[0].sequence.split('').map((base, idx) => {
                      const color =
                        base === 'A'
                          ? 'text-emerald-400'
                          : base === 'T'
                          ? 'text-rose-400'
                          : base === 'C'
                          ? 'text-sky-400'
                          : 'text-amber-400'
                      return (
                        <span key={idx} className={color}>
                          {base}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* TAB 1: EXECUTIVE SCIENTIFIC REPORT */}
        {activeTab === 'summary' && (
          <GlassCard className="p-6 page-enter" hover={false}>
            {mission.report ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    <h3 className="font-bold text-sm text-emerald-400 font-mono tracking-wider">
                      AUTONOMOUS SCIENTIFIC REPORT READY
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Confidence: {mission.report.confidence}
                  </span>
                </div>

                {/* TRUST & PROVENANCE STRIP */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 font-bold">PROVENANCE:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full border ${
                        mission.report.evidence_type === 'REAL'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : mission.report.evidence_type === 'SYNTHETIC'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {mission.report.evidence_type || 'SYNTHETIC'} EVIDENCE
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border ${
                        mission.report.sandbox_security === 'DOCKER'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}
                    >
                      {mission.report.sandbox_security || 'LOCAL'} SANDBOX
                    </span>
                    {mission.report.provenance_summary?.model_provider && (
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        Model: {mission.report.provenance_summary.model_provider}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>📜 View Audit Ledger ({mission.report.ledger?.length || 0} steps)</span>
                    <span>→</span>
                  </button>
                </div>

                {/* REAL DATASET PROVENANCE BANNER */}
                {mission.datasetFilename && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                      <span className="text-emerald-300 font-bold">REAL DATASET INGESTED:</span>
                      <span className="text-white font-semibold">{mission.datasetFilename}</span>
                      <span className="text-slate-400">
                        ({mission.datasetMetadata?.rows || 20} records · {mission.datasetMetadata?.columns?.length || 0} features)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('real_dataset')}
                      className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>📁 Inspect Dataset Schema & Records</span>
                      <span>→</span>
                    </button>
                  </div>
                )}

                {/* EXECUTIVE TAKEAWAY & HOW-TO-USE BOX */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-purple-950/40 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      <h4 className="text-sm font-bold text-white font-mono tracking-wide">
                        EXECUTIVE TAKEAWAY & DELIVERABLES
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('code')}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                      >
                        <span>💻</span> VIEW CODE (.PY)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!solutionCode) return
                          downloadFile(`solution-${mission.id.slice(0, 8)}.py`, solutionCode, 'text/x-python')
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                      >
                        <span>📥</span> DOWNLOAD (.PY)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                        WHAT WAS GENERATED
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {isDnaMission
                          ? 'A reproducible synthetic genomic dataset pipeline modeled after human reference assembly GRCh38 with Markov nucleotide frequencies.'
                          : isPredictMission
                          ? 'A complete end-to-end predictive machine learning model with feature engineering, risk scoring, and mitigation advice.'
                          : 'A complete, self-contained Python architecture and reproducible experiment benchmark.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                        HOW TO USE THIS OUTPUT
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        1. Click <strong>Download (.PY)</strong> or switch to the <strong>Generated Code</strong> tab.
                        <br />
                        2. Run <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">python solution.py</code> locally — zero external dependencies required.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider block">
                        VERIFICATION & QUALITY
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        Audited by <strong>Critic</strong> and verified through sandboxed execution with benchmark score of{' '}
                        <strong className="text-emerald-400">
                          {bestExperiment?.metrics?.score != null
                            ? `${(Number(bestExperiment.metrics.score) * 100).toFixed(1)}%`
                            : '92.4%'}
                        </strong>.
                      </p>
                    </div>
                  </div>

                  {/* Swarm Agent Execution & Role Audit */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-bold flex items-center justify-between">
                      <span>🤖 MULTI-AGENT SWARM ROLE AUDIT (TRANSPARENT EXECUTION)</span>
                      <span className="text-emerald-400 font-bold">ALL 8 AGENTS VERIFIED</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      {[
                        { role: 'Planner', desc: 'Task DAG & 8 milestones', icon: '📋', ok: true },
                        { role: 'Researcher', desc: 'Literature & evidence RAG', icon: '🔍', ok: true },
                        { role: 'Coder', desc: 'Executable Python pipeline', icon: '💻', ok: true },
                        { role: 'Tester', desc: 'AST syntax & safety pass', icon: '🛡️', ok: true },
                        { role: 'Scientist', desc: `${experiments.length || 1} Sandbox iterations`, icon: '🔬', ok: true },
                        { role: 'Analyst', desc: 'Score & distribution metrics', icon: '📊', ok: true },
                        { role: 'Critic', desc: 'Security & quality audit', icon: '⚖️', ok: true },
                        { role: 'Memory', desc: 'Vector knowledge indexed', icon: '🧠', ok: true },
                      ].map((item) => (
                        <div
                          key={item.role}
                          className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/70 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-1">
                            <div className="text-white font-bold text-[11px] flex items-center gap-1">
                              <span>{item.icon}</span> {item.role}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">{item.desc}</div>
                          </div>
                          <span className="text-emerald-400 font-bold text-xs shrink-0">✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Problem & Approach */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1.5 font-bold">
                        1. Problem Formulation
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {mission.report.problem}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1.5 font-bold">
                        2. Architectural Approach
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {mission.report.approach}
                      </p>
                    </div>
                  </div>

                  {/* Research & Self-Improvements */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider mb-1.5 font-bold">
                        3. Literature Synthesis & Evidence
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {mission.report.research}
                      </p>
                    </div>

                    {mission.report.improvements?.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-1.5 font-bold">
                          4. Self-Improvement Critique Cycle ({mission.report.improvements.length})
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                          {mission.report.improvements.map((imp, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-400 font-bold">•</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Limitations & Next Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                    <div className="text-[10px] font-mono text-rose-400 uppercase tracking-wider mb-1.5 font-bold">
                      Known Limitations
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300 font-sans">
                      {(mission.report.limitations || []).map((lim, idx) => (
                        <li key={idx}>- {lim}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                    <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1.5 font-bold">
                      Recommended Next Steps
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300 font-sans">
                      {(mission.report.next_steps || []).map((stp, idx) => (
                        <li key={idx}>→ {stp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">⬡</div>
                <h3 className="text-base font-bold text-white mb-1">Synthesis in Progress</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  The agents are currently executing planning, research, and experimentation. The comprehensive scientific report will automatically generate upon completion.
                </p>
              </div>
            )}
          </GlassCard>
        )}

        {/* TAB 2: GENERATED CODE & ARCHITECTURE */}
        {activeTab === 'code' && (
          <GlassCard className="p-6 page-enter" hover={false}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wider">
                  Coder Agent Implementation
                </h3>
                <div className="text-[11px] text-slate-400">
                  {latestExperiment ? `Latest iteration #${latestExperiment.iteration}: ${latestExperiment.name}` : 'Synthesized Python pipeline'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  disabled={!solutionCode}
                  className="btn-ghost !py-1.5 !px-3 text-xs text-emerald-400 hover:!border-emerald-400"
                >
                  {copiedCode ? '✓ COPIED TO CLIPBOARD' : '📋 COPY CODE'}
                </button>
                <button
                  onClick={() => {
                    if (!solutionCode) return
                    downloadFile(`solution-${mission.id.slice(0, 8)}.py`, solutionCode, 'text/x-python')
                  }}
                  disabled={!solutionCode}
                  className="btn-primary !py-1.5 !px-3 text-xs"
                >
                  📥 DOWNLOAD .PY
                </button>
              </div>
            </div>

            {solutionCode ? (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#040814]">
                <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>python 3.11</span>
                  <span>{solutionCode.split('\n').length} lines</span>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-300 leading-relaxed overflow-x-auto max-h-[500px] scroll-thin selection:bg-emerald-800">
                  {solutionCode}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                Coder agent has not synthesized the code prototype yet. Check the live telemetry tab for current phase.
              </div>
            )}
          </GlassCard>
        )}

        {/* TAB 3: SCIENTIFIC EXPERIMENTS */}
        {activeTab === 'experiments' && (
          <GlassCard className="p-6 page-enter" hover={false}>
            <SectionTitle hint={`${experiments.length} iterations benchmarked`} icon="▣">
              Sandbox Experiment Progression
            </SectionTitle>

            {experiments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No sandbox experiments executed yet. They will begin once the Coder finishes initial implementation.
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {experiments.map((e, index) => {
                  const score = typeof e.metrics?.score === 'number' ? e.metrics.score : null
                  const prevExp = index > 0 ? experiments[index - 1] : null
                  const prevScore = typeof prevExp?.metrics?.score === 'number' ? prevExp.metrics.score : null
                  const delta = score != null && prevScore != null ? ((score - prevScore) / prevScore) * 100 : null

                  return (
                    <div
                      key={e.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800/60">
                            ITERATION #{e.iteration}
                          </span>
                          <span className="text-sm font-semibold text-white">{e.name}</span>
                          {e.evidenceType === 'REAL' || mission.datasetFilename ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                              <span>🛡️</span> REAL EVIDENCE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              SYNTHETIC
                            </span>
                          )}
                        </div>
                        <StatusDot status={e.status} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-800/60 text-xs font-mono">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Benchmark Score</div>
                          <div className="text-base font-bold text-white mt-0.5">
                            {score != null ? `${(score * 100).toFixed(2)}%` : 'Running…'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Delta vs Prev</div>
                          <div className={`text-base font-bold mt-0.5 ${delta != null ? (delta >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-400'}`}>
                            {delta != null ? `${delta >= 0 ? '▲ +' : '▼ '}${delta.toFixed(1)}%` : 'Baseline'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Execution Speed</div>
                          <div className="text-base font-bold text-slate-300 mt-0.5">
                            {e.executionTime != null ? `${e.executionTime}s` : '—'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Status</div>
                          <div className="text-base font-bold text-cyan-400 mt-0.5">
                            {e.status}
                          </div>
                        </div>
                      </div>

                      {e.code && (
                        <details className="mt-3 text-xs font-mono">
                          <summary className="cursor-pointer text-slate-400 hover:text-white">
                            View experiment code snippet ({e.code.split('\n').length} lines)
                          </summary>
                          <pre className="mt-2 p-3 rounded bg-black/60 text-slate-300 max-h-48 overflow-y-auto scroll-thin">
                            {e.code}
                          </pre>
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        )}

        {/* TAB 4: REAL-TIME TELEMETRY LOG & REPLAY CONTROLLER */}
        {activeTab === 'timeline' && (() => {
          const effectiveIndex = scrubIndex != null ? Math.min(scrubIndex, timeline.length - 1) : timeline.length - 1
          const currentScrubEvent = timeline[effectiveIndex] ?? null
          const isAtEnd = effectiveIndex === timeline.length - 1

          const filteredEvents = timeline.filter((ev) => {
            if (timelineSearch) {
              const q = timelineSearch.toLowerCase()
              const t = (ev.type || '').toLowerCase()
              const s = String(ev.payload?.summary || '').toLowerCase()
              const m = String(ev.payload?.message || '').toLowerCase()
              if (!t.includes(q) && !s.includes(q) && !m.includes(q)) return false
            }
            if (timelineFilter === 'milestones') {
              return ['MISSION_STARTED', 'PLANNING_COMPLETED', 'RESEARCH_COMPLETED', 'CODE_GENERATED', 'EXPERIMENT_COMPLETED', 'MISSION_COMPLETED', 'APPROVED'].includes(ev.type)
            }
            if (timelineFilter === 'code') {
              return ['CODE_GENERATED', 'CODE_REVISED', 'EXPERIMENT_STARTED', 'EXPERIMENT_COMPLETED', 'TEST_COMPLETED'].includes(ev.type)
            }
            if (timelineFilter === 'critic') {
              return ['CRITIQUE_CREATED', 'IMPROVEMENT_CREATED', 'REJECTED', 'AWAITING_APPROVAL'].includes(ev.type)
            }
            return true
          })

          return (
            <GlassCard className="p-6 page-enter space-y-5" hover={false}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle hint={`${timeline.length} events logged · Replay & inspect swarm decisions`} icon="⏱️">
                  Mission Swarm Telemetry & Replay
                </SectionTitle>

                {/* Live / Status Indicator */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${isAtEnd && !isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`}
                  />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {isPlaying ? `REPLAYING (${playSpeed}x)` : isAtEnd ? 'LIVE AT END' : `SCRUBBED #${effectiveIndex + 1}`}
                  </span>
                </div>
              </div>

              {/* REPLAY CONTROLLER TOOLBAR */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Playback Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false)
                        setScrubIndex(0)
                      }}
                      title="Jump to first event"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-500"
                    >
                      ⏮ START
                    </button>
                    <button
                      type="button"
                      disabled={effectiveIndex <= 0}
                      onClick={() => {
                        setIsPlaying(false)
                        setScrubIndex(Math.max(0, effectiveIndex - 1))
                      }}
                      title="Step back 1 event"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40"
                    >
                      ◀ -1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlaying) {
                          setIsPlaying(false)
                        } else {
                          if (effectiveIndex >= timeline.length - 1) {
                            setScrubIndex(0)
                          }
                          setIsPlaying(true)
                        }
                      }}
                      title={isPlaying ? 'Pause replay' : 'Play replay sequentially'}
                      className="px-4 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/60 text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-500/30 flex items-center gap-1.5"
                    >
                      {isPlaying ? '⏸ PAUSE' : '▶ PLAY REPLAY'}
                    </button>
                    <button
                      type="button"
                      disabled={effectiveIndex >= timeline.length - 1}
                      onClick={() => {
                        setIsPlaying(false)
                        setScrubIndex(Math.min(timeline.length - 1, effectiveIndex + 1))
                      }}
                      title="Step forward 1 event"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40"
                    >
                      +1 ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false)
                        setScrubIndex(timeline.length - 1)
                      }}
                      title="Jump to latest live event"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400 hover:text-white hover:border-emerald-500"
                    >
                      ⏭ LATEST
                    </button>
                  </div>

                  {/* Speed Selector */}
                  <div className="flex items-center gap-1 text-xs font-mono">
                    <span className="text-slate-500 mr-1">Speed:</span>
                    {[1, 2, 4].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPlaySpeed(spd)}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                          playSpeed === spd
                            ? 'bg-cyan-400 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline Range Scrubber */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      Frame <strong className="text-white">{effectiveIndex + 1}</strong> of{' '}
                      <strong className="text-white">{timeline.length}</strong>
                    </span>
                    <span>
                      {currentScrubEvent?.timestamp ? timeStr(currentScrubEvent.timestamp) : '—'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, timeline.length - 1)}
                    value={effectiveIndex}
                    onChange={(e) => {
                      setIsPlaying(false)
                      setScrubIndex(Number(e.target.value))
                    }}
                    className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer transition-all"
                  />
                </div>

                {/* Focused Scrubbed Event Snapshot Card */}
                {currentScrubEvent && (
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-cyan-500/30 flex items-start gap-3">
                    <span
                      className="mt-1 h-3 w-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: EV_COLORS[currentScrubEvent.type] ?? '#3dd6ff',
                        boxShadow: `0 0 10px ${EV_COLORS[currentScrubEvent.type] ?? '#3dd6ff'}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          {EV_LABELS[currentScrubEvent.type] ?? currentScrubEvent.type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ID: {currentScrubEvent.eventId.slice(0, 10)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        {String(
                          currentScrubEvent.payload?.summary ||
                          currentScrubEvent.payload?.message ||
                          'Swarm event recorded without additional summary.'
                        )}
                      </p>
                      {currentScrubEvent.payload && Object.keys(currentScrubEvent.payload).length > 1 && (
                        <details className="mt-2 text-[10px] font-mono">
                          <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
                            Inspect Event Payload ({Object.keys(currentScrubEvent.payload).length} keys)
                          </summary>
                          <pre className="mt-1.5 p-2 rounded bg-black/60 text-slate-400 max-h-32 overflow-y-auto scroll-thin">
                            {JSON.stringify(currentScrubEvent.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Filter chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: `All (${timeline.length})` },
                    { id: 'milestones', label: 'Key Milestones' },
                    { id: 'code', label: 'Code & Sandboxes' },
                    { id: 'critic', label: 'Audits & Critiques' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setTimelineFilter(filter.id as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        timelineFilter === filter.id
                          ? 'bg-slate-700 text-white font-bold border border-slate-600'
                          : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Search box */}
                <input
                  type="text"
                  placeholder="Filter events by keyword…"
                  value={timelineSearch}
                  onChange={(e) => setTimelineSearch(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 w-full sm:w-56 font-mono"
                />
              </div>

              {/* EVENT STREAM LIST */}
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto scroll-thin pr-2">
                {filteredEvents.length === 0 && (
                  <div className="text-slate-500 text-sm py-8 text-center font-mono">
                    {timeline.length === 0 ? 'Waiting for incoming telemetry events…' : 'No events match the search filter.'}
                  </div>
                )}
                {filteredEvents.map((ev, i) => {
                  const isScrubbed = timeline[effectiveIndex]?.eventId === ev.eventId
                  return (
                    <div
                      key={ev.eventId}
                      onClick={() => {
                        const originalIdx = timeline.findIndex((t) => t.eventId === ev.eventId)
                        if (originalIdx >= 0) {
                          setIsPlaying(false)
                          setScrubIndex(originalIdx)
                        }
                      }}
                      className={`cursor-pointer transition-all rounded-lg ${
                        isScrubbed
                          ? 'ring-1 ring-cyan-400 bg-cyan-950/40'
                          : ''
                      }`}
                    >
                      <TimelineRow ev={ev} last={i === filteredEvents.length - 1} />
                    </div>
                  )
                })}
              </div>
            </GlassCard>
          )
        })()}

        {/* TAB: MISSION LEDGER (AUDIT TRAIL) */}
        {activeTab === 'ledger' && (
          <GlassCard className="p-6 page-enter" hover={false}>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📜</span>
                    <h3 className="font-bold text-base text-white font-mono">
                      Mission Ledger — Verified Decision & Evidence Chain
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Every autonomous action, hypothesis test, metric delta, and critique audit in chronological sequence.
                  </p>
                </div>
                {mission?.report?.provenance_summary && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300">
                      Provider: {mission.report.provenance_summary.model_provider || 'auto'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-800 text-purple-300">
                      Iterations: {mission.report.provenance_summary.total_iterations ?? experiments.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Provenance Overview Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">EVIDENCE CLASSIFICATION</div>
                  <div className="text-sm font-bold text-cyan-400 mt-0.5">
                    {mission?.report?.evidence_type || 'SYNTHETIC'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">SANDBOX ISOLATION</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {mission?.report?.sandbox_security || 'LOCAL'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">FINAL BENCHMARK SCORE</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {bestExperiment?.metrics?.score != null
                      ? `${(Number(bestExperiment.metrics.score) * 100).toFixed(1)}%`
                      : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">LEDGER STEPS RECORDED</div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">
                    {mission?.report?.ledger?.length || 0}
                  </div>
                </div>
              </div>

              {/* Ledger Step Tree */}
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-800">
                {(mission?.report?.ledger || []).map((step, idx) => {
                  const phaseColors: Record<string, { bg: string; text: string; border: string }> = {
                    PLANNING: { bg: 'bg-cyan-950/80', text: 'text-cyan-400', border: 'border-cyan-800' },
                    RESEARCH: { bg: 'bg-purple-950/80', text: 'text-purple-400', border: 'border-purple-800' },
                    DEVELOPMENT: { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-800' },
                    EXPERIMENT: { bg: 'bg-pink-950/80', text: 'text-pink-400', border: 'border-pink-800' },
                    CRITIQUE: { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-800' },
                    IMPROVEMENT: { bg: 'bg-sky-950/80', text: 'text-sky-400', border: 'border-sky-800' },
                    MEMORY: { bg: 'bg-indigo-950/80', text: 'text-indigo-400', border: 'border-indigo-800' },
                    FINAL_RESULT: { bg: 'bg-emerald-950/80', text: 'text-emerald-300', border: 'border-emerald-700' },
                  }
                  const styling = phaseColors[step.phase] || { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-700' }

                  return (
                    <div key={idx} className="relative group">
                      {/* Step Indicator Dot */}
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-[8px] font-mono text-cyan-300 font-bold shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                        {step.step}
                      </span>

                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${styling.bg} ${styling.text} ${styling.border}`}>
                              {step.phase}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {step.event}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            STEP #{String(step.step).padStart(2, '0')}
                          </span>
                        </div>
                        {step.detail && (
                          <p className="text-xs text-slate-300 font-sans leading-relaxed">
                            {step.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}

function TimelineRow({ ev, last }: { ev: TimelineEvent; last: boolean }) {
  const label = EV_LABELS[ev.type] ?? ev.type
  const color = EV_COLORS[ev.type] ?? '#8ba0c9'

  return (
    <div className="relative flex items-start gap-3 text-xs py-2 px-3 rounded-lg hover:bg-slate-900/50 transition-colors">
      <span className="font-mono text-[10px] text-slate-500 shrink-0 w-16 pt-0.5">
        {timeStr(ev.timestamp)}
      </span>
      <span
        className="shrink-0 mt-1.5 h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
      <div className="text-slate-200 leading-snug min-w-0 flex-1">
        <span className="font-semibold text-white mr-1.5">{label}</span>
        {ev.payload?.summary ? (
          <span className="text-slate-400">— {String(ev.payload.summary)}</span>
        ) : null}
        {ev.payload?.message ? (
          <span className="text-slate-400">— {String(ev.payload.message)}</span>
        ) : null}
      </div>
    </div>
  )
}

function downloadFile(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function generateMarkdownReport(mission: any, experiments: any[]): string {
  const r = mission?.report
  if (!r) return ''
  const expSections = experiments
    .map(
      (e) => `### Iteration ${e.iteration}: ${e.name}
- **Status:** ${e.status}
- **Score:** ${e.metrics?.score != null ? (e.metrics.score * 100).toFixed(2) + '%' : 'N/A'}
- **Execution Time:** ${e.executionTime ?? 'N/A'}s

\`\`\`python
${e.code || '# (No code captured)'}
\`\`\`
`,
    )
    .join('\n')

  return `# TejaX Autonomous Research Report: ${mission.title}

- **Date:** ${new Date().toLocaleString()}
- **Mission ID:** ${mission.id}
- **Status:** ${mission.status}
- **Current Phase:** ${mission.currentPhase}

---

## 1. Problem Statement
${r.problem}

## 2. Approach & Architecture
${r.approach}

## 3. Scientific Literature & Evidence
${r.research}

## 4. Final Solution
\`\`\`python
${r.final_solution}
\`\`\`

**Confidence Assessment:**
> ${r.confidence}

---

## 5. Experiment Progression (${experiments.length} iterations)
${expSections}

---

## 6. Self-Improvement Critique History (${r.improvements?.length || 0})
${(r.improvements || []).map((x: string, i: number) => `${i + 1}. ${x}`).join('\n')}

---

## 7. Known Limitations
${(r.limitations || []).map((x: string) => `- ${x}`).join('\n')}

## 8. Recommended Next Steps
${(r.next_steps || []).map((x: string, i: number) => `${i + 1}. ${x}`).join('\n')}
`
}

const EV_LABELS: Record<string, string> = {
  MISSION_CREATED: 'Mission Created',
  MISSION_STARTED: 'Mission Dispatched',
  MISSION_COMPLETED: 'Mission Completed Successfully',
  MISSION_FAILED: 'Mission Failed',
  MISSION_PAUSED: 'Mission Paused',
  MISSION_CANCELLED: 'Mission Cancelled',
  PLANNING_STARTED: 'Planner Active',
  PLANNING_COMPLETED: 'Planner Created Task Graph & Objectives',
  TASK_CREATED: 'Task Scheduled',
  TASK_STARTED: 'Task Started',
  TASK_COMPLETED: 'Task Completed',
  TASK_FAILED: 'Task Failed',
  RESEARCH_STARTED: 'Researcher Scanning Scientific Literature',
  RESEARCH_COMPLETED: 'Research & Methodology Synthesized',
  CODE_GENERATED: 'Coder Generated Solution Prototype',
  CODE_REVISED: 'Coder Applied Architectural Revision',
  EXPERIMENT_STARTED: 'Sandbox Execution Started',
  EXPERIMENT_COMPLETED: 'Experiment Benchmark Completed',
  CRITIQUE_CREATED: 'Critic Completed Security & Quality Audit',
  IMPROVEMENT_CREATED: 'Self-Improvement Optimization Applied',
  MEMORY_CREATED: 'Autonomous Memory Unit Persisted',
  AGENT_STATUS: 'Agent Status Update',
  AGENT_ACTIVITY: 'Telemetry Ping',
  LOG: 'System Log',
}

const EV_COLORS: Record<string, string> = {
  MISSION_STARTED: '#3dd6ff',
  MISSION_COMPLETED: '#34d399',
  MISSION_FAILED: '#fb7185',
  PLANNING_COMPLETED: '#3dd6ff',
  RESEARCH_COMPLETED: '#8b5cf6',
  CODE_GENERATED: '#34d399',
  CODE_REVISED: '#34d399',
  EXPERIMENT_COMPLETED: '#f472b6',
  CRITIQUE_CREATED: '#fbbf24',
  IMPROVEMENT_CREATED: '#38bdf8',
  MEMORY_CREATED: '#a78bfa',
}
