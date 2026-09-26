import { useStore, type Page } from '../../../lib/store'
import Reveal from '../Reveal'
import { Section, SectionHead } from '../Section'

interface Project {
  id: string
  index: string
  name: string
  desc: string
  tech: string[]
  status: string
  statusColor: string
  page: Page
  glyph: string
}

const PROJECTS: Project[] = [
  {
    id: 'engine',
    index: '01',
    name: 'Autonomous Mission Engine',
    desc: 'The orchestration core — decomposes missions into objectives, tasks and dependencies, then runs eight specialised agents through a bounded improve-loop.',
    tech: ['FastAPI', 'Python', 'asyncio'],
    status: 'LIVE',
    statusColor: '#34d399',
    page: 'command',
    glyph: '◈',
  },
  {
    id: 'lab',
    index: '02',
    name: 'The 3D Intelligence Lab',
    desc: 'A real-time WebGL laboratory where every agent, experiment and event becomes light and motion — the same stream that drives the dashboards.',
    tech: ['Three.js', 'WebGL', 'React'],
    status: 'LIVE',
    statusColor: '#34d399',
    page: 'lab',
    glyph: '⬡',
  },
  {
    id: 'sandbox',
    index: '03',
    name: 'Safe Experiment Sandbox',
    desc: 'Generated code executes in an isolated environment with time, memory and CPU limits — no network, no host access, no secrets.',
    tech: ['subprocess', 'RLIMIT', 'Docker'],
    status: 'LIVE',
    statusColor: '#34d399',
    page: 'experiments',
    glyph: '▣',
  },
  {
    id: 'memory',
    index: '04',
    name: 'Memory & Knowledge Core',
    desc: 'Typed, deduplicated long-term memory with keyword and semantic search — so missions compound instead of starting from zero.',
    tech: ['SQLAlchemy', 'SQLite', 'pgvector'],
    status: 'LIVE',
    statusColor: '#34d399',
    page: 'memory',
    glyph: '✦',
  },
  {
    id: 'model',
    index: '05',
    name: 'Model Gateway',
    desc: 'A runtime-configurable provider layer — local autonomous engine, Ollama, Groq, or OpenAI-compatible endpoints — with health checks and graceful fallback.',
    tech: ['Ollama', 'OpenAI-compat', 'HTTP'],
    status: 'LIVE',
    statusColor: '#34d399',
    page: 'settings',
    glyph: '◎',
  },
  {
    id: 'human',
    index: '06',
    name: 'Human-in-the-loop Approval',
    desc: 'An approval checkpoint that pauses missions after research and waits for a human Approve or Reject before development proceeds.',
    tech: ['Events', 'WebSocket', 'UI'],
    status: 'LIVE',
    statusColor: '#34d399',
    page: 'missions',
    glyph: '✋',
  },
  {
    id: 'dataset',
    index: '07',
    name: 'Real Dataset Ingestion & Validation',
    desc: 'Upload real CSV/JSON tabular datasets. The runner mounts them directly into ephemeral workspaces to benchmark models against empirical records with schema detection.',
    tech: ['CSV/JSON', 'Workspaces', 'Mounting'],
    status: 'LIVE',
    statusColor: '#34d399',
    page: 'command',
    glyph: '📁',
  },
  {
    id: 'ledger',
    index: '08',
    name: 'Tamper-Evident Mission Ledger',
    desc: 'Complete decision provenance — every hypothesis, benchmark delta, critique decision, and model revision logged in a chronological audit chain with REAL vs SYNTHETIC badges.',
    tech: ['Ledger', 'Provenance', 'Trust'],
    status: 'LIVE',
    statusColor: '#34d399',
    page: 'missions',
    glyph: '📜',
  },
]

export default function Projects() {
  const setPage = useStore((s) => s.setPage)
  const setView = useStore((s) => s.setView)

  const open = (p: Project) => {
    setPage(p.page)
    setView('app')
  }

  return (
    <Section id="projects">
      <div className="s-wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            eyebrow="Projects"
            title="What we're building."
            lead="Eight integrated systems, one platform. Each one is live today with empirical validation — not a mockup."
          />
          <Reveal variant="fade">
            <span className="s-mono text-[10px] text-faint hidden lg:block pb-2">SCROLL →</span>
          </Reveal>
        </div>
      </div>

      <div className="mt-12 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-6 px-[max(4vw,calc((100vw-1180px)/2))] pb-4" style={{ width: 'max-content' }}>
          {PROJECTS.map((p, i) => (
            <Reveal key={p.id} delay={i * 70} className="shrink-0">
              <article
                className="proj-panel w-[340px] sm:w-[400px] h-full p-7 flex flex-col"
              >
                <div className="flex items-center justify-between mb-7">
                  <span className="s-num !text-3xl">{p.index}</span>
                  <span className="s-tag">
                    <span className="dot" style={{ color: p.statusColor }} />
                    <span style={{ color: p.statusColor }}>{p.status}</span>
                  </span>
                </div>

                {/* visual preview */}
                <div className="proj-visual s-panel p-5 mb-7 grid place-items-center overflow-hidden" style={{ height: 150, background: 'radial-gradient(circle at 50% 60%, rgba(61,214,255,0.08), transparent 70%)' }}>
                  <div className="relative grid place-items-center">
                    <span className="text-[46px] select-none" style={{ color: 'rgba(120,170,255,0.5)' }}>{p.glyph}</span>
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="block h-16 w-16 rounded-full border border-[var(--s-line-strong)] animate-spin-slow" style={{ borderTopColor: 'rgba(61,214,255,0.5)' }} />
                    </span>
                  </div>
                </div>

                <h3 className="s-h3 !text-xl">{p.name}</h3>
                <p className="s-body mt-3 flex-1">{p.desc}</p>

                <div className="flex flex-wrap gap-2 mt-5">
                  {p.tech.map((t) => (
                    <span key={t} className="s-tag !text-[9px]">{t}</span>
                  ))}
                </div>

                <button onClick={() => open(p)} className="s-link mt-6 self-start">
                  Explore <span className="arr" aria-hidden>→</span>
                </button>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
