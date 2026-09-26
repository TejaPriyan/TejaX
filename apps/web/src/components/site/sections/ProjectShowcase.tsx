import { useEffect, useState } from 'react'
import { useStore } from '../../../lib/store'
import { AGENTS } from '../../../lib/agents'
import Magnetic from '../Magnetic'
import Reveal from '../Reveal'
import { Section, SectionHead } from '../Section'

const TABS = [
  {
    n: '01',
    title: 'Concept',
    body: 'A mission-driven paradigm: you define the goal, TejaX turns it into objectives, tasks and evidence — not a chat thread.',
  },
  {
    n: '02',
    title: 'Technology',
    body: 'Eight specialised agents, an isolated experiment sandbox, long-term memory and a real-time event stream — orchestrated as one pipeline.',
  },
  {
    n: '03',
    title: 'Experience',
    body: 'Everything renders into an interactive 3D laboratory and a command center. Watch agents light up as they work.',
  },
  {
    n: '04',
    title: 'Future',
    body: 'Compounding knowledge, opt-in live research, and human-in-the-loop checkpoints — autonomy with accountability.',
  },
]

const FEED = [
  'planner → decomposed mission into 7 objectives',
  'researcher → ingested real dataset "titanic_passengers.csv"',
  'coder → synthesized baseline logistic regressor v0',
  'tester → AST syntax & safety validation passed ✓',
  'scientist → mounted dataset in sandbox, iter #1 score 0.500',
  'critic → detected false negatives in minority class',
  'analyst → iteration #3 score reached 1.000 (+100%)',
  'ledger → recorded step #11 REAL EVIDENCE provenance',
  'mission → completed with verified empirical report ✓',
]

function hexPath(r: number) {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    const x = (Math.cos(a) * r).toFixed(2)
    const y = (Math.sin(a) * r).toFixed(2)
    pts.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
  }
  return pts.join(' ') + ' Z'
}

function LabRing() {
  const cx = 150
  const cy = 150
  const R = 102
  return (
    <svg viewBox="0 0 300 300" className="w-full h-auto" role="img" aria-label="TejaX agent lab diagram">
      <defs>
        <radialGradient id="lrcore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3dd6ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3dd6ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R * 0.85} fill="url(#lrcore)" />
      <circle cx={cx} cy={cy} r={R * 0.56} fill="none" stroke="rgba(120,170,255,0.16)" strokeWidth="1" strokeDasharray="2 5" className="animate-spin-slow" style={{ transformOrigin: '150px 150px' }} />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(120,170,255,0.14)" strokeWidth="1" />

      {AGENTS.map((a, i) => {
        const ang = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(ang) * R
        const y = cy + Math.sin(ang) * R
        return (
          <line key={`e-${a.type}`} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(61,214,255,0.25)" strokeWidth="1" className="s-flow" style={{ animationDelay: `${i * -0.6}s` }} />
        )
      })}

      <g transform={`translate(${cx},${cy})`}>
        <path d={hexPath(26)} fill="rgba(61,214,255,0.08)" stroke="#3dd6ff" strokeWidth="1.6" className="s-pulse" />
        <circle r="4.5" fill="#eaf2ff" />
      </g>

      {AGENTS.map((a, i) => {
        const ang = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(ang) * R
        const y = cy + Math.sin(ang) * R
        return (
          <g key={a.type} transform={`translate(${x},${y})`}>
            <circle r="15" fill="rgba(8,13,26,0.9)" stroke="rgba(120,170,255,0.35)" strokeWidth="1" />
            <text textAnchor="middle" dy="4" fontSize="13" fill={a.color}>{a.glyph}</text>
            <circle r="19" fill="none" stroke={a.color} strokeOpacity="0.5" strokeWidth="1" className="s-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
          </g>
        )
      })}
    </svg>
  )
}

function EventFeed() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((v) => v + 1), 1500)
    return () => clearInterval(t)
  }, [])
  const visible = FEED.slice(Math.max(0, idx - 3), Math.max(3, idx))
  const fill = Array.from({ length: 3 - visible.length }, () => null)
  return (
    <div className="font-mono text-[11px] leading-relaxed space-y-1.5">
      {fill.map((_, i) => <div key={`f-${i}`} className="h-4" />)}
      {visible.map((line, i) => (
        <div key={idx + i} className="flex gap-2 text-dim">
          <span className="text-accent shrink-0">›</span>
          <span className="truncate">{line}</span>
        </div>
      ))}
    </div>
  )
}

export default function ProjectShowcase() {
  const setView = useStore((s) => s.setView)
  const [tab, setTab] = useState(0)
  const t = TABS[tab]

  return (
    <Section id="project">
      <div className="s-wrap">
        <SectionHead
          eyebrow="Project"
          title="The platform, not a pitch deck."
          lead="This is what TejaX is actually building — a live, autonomous research platform you can enter and watch work."
        />

        <div className="grid lg:grid-cols-2 gap-10 mt-14">
          {/* interactive preview */}
          <Reveal variant="left">
            <div className="s-panel s-corners p-7">
              <div className="flex items-center justify-between mb-5">
                <span className="s-mono text-[10px] tracking-[0.24em] uppercase text-dim">AI Laboratory — live view</span>
                <span className="flex items-center gap-2 s-mono text-[9px] text-[#34d399]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" /> SIMULATION
                </span>
              </div>
              <div className="proj-visual">
                <LabRing />
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--s-line)]">
                <EventFeed />
              </div>
            </div>
          </Reveal>

          {/* tabs */}
          <div className="flex flex-col">
            <div className="flex flex-col divide-y divide-[var(--s-line)] border-y border-[var(--s-line)]">
              {TABS.map((x, i) => (
                <button
                  key={x.n}
                  onClick={() => setTab(i)}
                  className="group flex items-center gap-5 py-4 text-left transition-colors"
                  aria-pressed={tab === i}
                >
                  <span className={`s-num !text-2xl transition-colors`} style={tab === i ? { WebkitTextStroke: '0px', color: '#3dd6ff' } : undefined}>
                    {x.n}
                  </span>
                  <span className={`s-h3 !text-lg transition-colors ${tab === i ? 'text-[#eaf2ff]' : 'text-dim group-hover:text-[#cfe4ff]'}`}>
                    {x.title}
                  </span>
                  <span className={`ml-auto text-accent transition-all ${tab === i ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} aria-hidden>→</span>
                </button>
              ))}
            </div>
            <Reveal delay={0}>
              <p key={tab} className="s-body mt-6 min-h-[5.5rem]" style={{ animation: 'fadeUp .5s cubic-bezier(.22,1,.36,1) both' }}>
                {t.body}
              </p>
            </Reveal>
            <div className="mt-6">
              <Magnetic>
                <button onClick={() => setView('app')} className="btn-solid">
                  Enter TejaX <span aria-hidden>↗</span>
                </button>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
