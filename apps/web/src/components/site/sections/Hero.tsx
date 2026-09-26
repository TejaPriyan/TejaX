import { useStore } from '../../../lib/store'
import Magnetic from '../Magnetic'
import Telemetry from '../Telemetry'

const TAGLINE = ['Turn', 'ideas', 'into', 'experiments,', 'evidence,', 'and', 'decisions.']

export default function Hero() {
  const setView = useStore((s) => s.setView)
  const scrollToMission = () => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section id="home" className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      <div className="s-wrap relative z-10 text-center py-24">
        <div className="flex justify-center">
          <span className="s-eyebrow">
            AI Experimentation & Agent Engineering Platform
          </span>
        </div>

        <h1 className="s-wordmark s-grad mt-8" aria-label="TEJAX">
          <span className="s-clip"><span style={{ animationDelay: '0.08s' }}>TEJAX</span></span>
        </h1>

        <h2 className="s-h1 mt-8 max-w-4xl mx-auto" style={{ fontSize: 'clamp(1.7rem, 4.4vw, 3.2rem)' }}>
          {TAGLINE.map((w, i) => (
            <span key={w} className="s-clip mr-[0.3em]">
              <span style={{ animationDelay: `${0.5 + i * 0.08}s` }}>{w}</span>
            </span>
          ))}
        </h2>

        <p className="s-lead mt-8 mx-auto" style={{ animation: 'fadeUp .9s cubic-bezier(.22,1,.36,1) 0.95s both' }}>
          TejaX is an autonomous AI experimentation and agent engineering platform — a living laboratory where specialized
          software agents plan, write code, benchmark on real datasets, and self-audit in secure sandboxes.
        </p>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-4" style={{ animation: 'fadeUp .9s cubic-bezier(.22,1,.36,1) 1.1s both' }}>
          <Magnetic>
            <button onClick={() => setView('app')} className="btn-solid">
              Launch Experiment Platform <span aria-hidden>↗</span>
            </button>
          </Magnetic>
          <Magnetic>
            <button onClick={scrollToMission} className="btn-line">
              Discover the Architecture
            </button>
          </Magnetic>
        </div>
      </div>

      {/* bottom strip */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{ animation: 'fadeUp .9s cubic-bezier(.22,1,.36,1) 1.3s both' }}
      >
        <div className="s-wrap flex flex-wrap items-center justify-between gap-4 py-6 border-t border-[var(--s-line)] text-[10px] font-mono text-faint">
          <Telemetry compact />
          <span className="hidden md:inline">v0.2.0 — RESEARCH PLATFORM</span>
          <button onClick={scrollToMission} className="flex items-center gap-2 text-dim hover:text-[#eaf2ff] transition-colors" aria-label="Scroll down">
            <span className="tracking-[0.24em] uppercase">Scroll</span>
            <span className="inline-block animate-floaty" aria-hidden>↓</span>
          </button>
        </div>
      </div>
    </section>
  )
}
