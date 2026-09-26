import { useState } from 'react'
import Reveal from '../Reveal'
import { Section, SectionHead } from '../Section'

interface Node {
  id: string
  label: string
  desc: string
  angle: number
  color: string
}

const NODES: Node[] = [
  { id: 'ai', label: 'AI', desc: 'A pluggable model gateway — local core engine, Ollama, Groq, Anthropic, Gemini, or OpenAI. Automated fallbacks ensure missions run reliably even offline.', angle: -Math.PI / 2, color: '#3dd6ff' },
  { id: '3d', label: '3D', desc: 'A real-time WebGL laboratory that renders multi-agent swarm activity as light, arcs and motion — one unified WebSocket event stream drives UI and world alike.', angle: -Math.PI / 7, color: '#34d399' },
  { id: 'web', label: 'WEB', desc: 'A reactive command center with dataset ingestion, live telemetry, experiment timelines, and tamper-evident mission audit ledgers.', angle: Math.PI / 5, color: '#f472b6' },
  { id: 'auto', label: 'LOOP', desc: 'Bounded multi-agent iteration loop — Planner, Researcher, Coder, Tester, Scientist, Analyst, Critic and Memory orchestrate hypothesis testing with AST safety verification.', angle: Math.PI / 2.05, color: '#fbbf24' },
  { id: 'inter', label: 'EVIDENCE', desc: 'Real evidence classification (REAL vs SYNTHETIC) with human-in-the-loop checkpoints and experiment explainability drawers.', angle: Math.PI - Math.PI / 5, color: '#22d3ee' },
  { id: 'data', label: 'DATA', desc: 'Real dataset mounting (CSV/JSON into isolated workdir) combined with typed long-term memory (SQLite + vector semantic indexing).', angle: Math.PI + Math.PI / 7, color: '#a78bfa' },
  { id: 'future', label: 'SANDBOX', desc: 'Isolated local and Docker runners with hard memory, execution time, and CPU boundaries — zero host network egress.', angle: Math.PI / 2 + Math.PI / 5, color: '#8b9bd8' },
]

function TechNetwork({ active, onHover }: { active: string | null; onHover: (id: string | null) => void }) {
  const cx = 150
  const cy = 150
  const R = 96
  return (
    <svg viewBox="0 0 300 300" className="w-full h-auto" role="img" aria-label="TejaX technology network">
      <defs>
        <radialGradient id="tncore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3dd6ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#3dd6ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R * 0.95} fill="url(#tncore)" />
      <circle cx={cx} cy={cy} r={R * 0.5} fill="none" stroke="rgba(120,170,255,0.14)" strokeWidth="1" strokeDasharray="2 5" className="animate-spin-slow" style={{ transformOrigin: '150px 150px' }} />

      {NODES.map((n) => {
        const x = cx + Math.cos(n.angle) * R
        const y = cy + Math.sin(n.angle) * R
        const on = active === n.id || active === null
        return (
          <line
            key={`e-${n.id}`}
            x1={cx} y1={cy} x2={x} y2={y}
            stroke={active === n.id ? n.color : 'rgba(120,170,255,0.22)'}
            strokeOpacity={on ? 1 : 0.35}
            strokeWidth={active === n.id ? 1.4 : 1}
            className="s-flow"
            style={{ animationDelay: `${NODES.indexOf(n) * -0.7}s` }}
          />
        )
      })}

      {/* core */}
      <g transform={`translate(${cx},${cy})`} onMouseEnter={() => onHover('core')} onMouseLeave={() => onHover(null)} style={{ cursor: 'pointer' }}>
        <path d="M0,-24 L20.8,-12 L20.8,12 L0,24 L-20.8,12 L-20.8,-12 Z" fill="rgba(61,214,255,0.1)" stroke="#3dd6ff" strokeWidth="1.6" className="s-pulse" />
        <text textAnchor="middle" dy="4" fontSize="9" fill="#bfeeff" fontFamily="JetBrains Mono, monospace" letterSpacing="1">TEJAX</text>
      </g>

      {NODES.map((n) => {
        const x = cx + Math.cos(n.angle) * R
        const y = cy + Math.sin(n.angle) * R
        const on = active === n.id
        return (
          <g key={n.id} transform={`translate(${x},${y})`} onMouseEnter={() => onHover(n.id)} onMouseLeave={() => onHover(null)} style={{ cursor: 'pointer' }}>
            <circle r={on ? 22 : 18} fill="rgba(8,13,26,0.9)" stroke={on ? n.color : 'rgba(120,170,255,0.35)'} strokeWidth={on ? 1.4 : 1} style={{ transition: 'r .25s ease, stroke .25s ease' }} />
            <text textAnchor="middle" dy="3.5" fontSize="8" fill={on ? n.color : '#8fa3c4'} fontFamily="JetBrains Mono, monospace" letterSpacing="1">
              {n.label}
            </text>
            {on && <circle r="26" fill="none" stroke={n.color} strokeOpacity="0.5" strokeWidth="1" />}
          </g>
        )
      })}
    </svg>
  )
}

export default function Technology() {
  const [active, setActive] = useState<string | null>(null)
  const node = NODES.find((n) => n.id === active)
  const desc = active === 'core'
    ? 'The TejaX core orchestrates everything: event bus, mission service, sandbox and memory.'
    : node?.desc

  return (
    <Section id="technology">
      <div className="s-wrap">
        <SectionHead
          eyebrow="Technology"
          title="One system, many layers."
          lead="TejaX is a stack of cooperating technologies — orchestration, agents, a safe sandbox, memory and a live 3D interface — bound together by a single event stream."
        />

        <div className="grid lg:grid-cols-2 gap-12 items-center mt-14">
          <Reveal variant="left">
            <div className="s-panel s-corners p-7">
              <div className="flex items-center justify-between mb-4">
                <span className="s-mono text-[10px] tracking-[0.24em] uppercase text-dim">Architecture</span>
                <span className="s-mono text-[9px] text-faint">HOVER TO INSPECT</span>
              </div>
              <TechNetwork active={active} onHover={setActive} />
              <div className="mt-4 pt-4 border-t border-[var(--s-line)] min-h-[4.5rem]">
                <div className="s-mono text-[10px] tracking-[0.24em] uppercase text-accent mb-2">
                  {active === 'core' ? 'TejaX core' : node?.label ?? 'Select a node'}
                </div>
                <p className="s-body !text-[13px]">{desc ?? 'Point at a node to see what it does.'}</p>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-3">
            {[
              ['FastAPI + Asyncio', 'Python 3.11 · DAG task graph · typed WebSocket event bus'],
              ['React + Three.js', 'Vite · TypeScript · 3D Canvas + 2D Pixel Lab'],
              ['Isolated Sandbox', 'Ephemeral workspace · real dataset mounting · AST validation'],
              ['Evidence & Ledger', 'REAL vs SYNTHETIC badges · tamper-evident decision log'],
              ['Memory & Gateway', 'SQLite + vector search · multi-provider LLM gateway'],
            ].map(([k, v], i) => (
              <Reveal key={k} variant="right" delay={i * 90}>
                <div className="flex items-baseline justify-between gap-6 border-b border-[var(--s-line)] py-4">
                  <span className="s-h3 !text-lg">{k}</span>
                  <span className="s-body !text-[13px] text-right">{v}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
