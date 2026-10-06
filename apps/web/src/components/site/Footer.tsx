import { useStore } from '../../lib/store'
import Logo from './Logo'
import Magnetic from './Magnetic'

const NAV = [
  { id: 'home', label: 'Home' },
  { id: 'mission', label: 'Mission' },
  { id: 'technology', label: 'Technology' },
  { id: 'projects', label: 'Projects' },
  { id: 'vision', label: 'Vision' },
  { id: 'about', label: 'About' },
]

export default function Footer() {
  const setView = useStore((s) => s.setView)

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer className="relative border-t border-[var(--s-line)]">
      <div className="s-wrap py-16">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <Logo size={32} />
            <p className="s-body mt-5 max-w-sm">
              An AI experimentation and agent engineering platform — an empirical laboratory where specialized
              agents collaborate, build, benchmark on real data, and self-audit in secure sandboxes.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Magnetic>
                <button onClick={() => setView('app')} className="btn-line !px-5 !py-2.5">
                  Enter TejaX <span aria-hidden>↗</span>
                </button>
              </Magnetic>
              <a
                href="https://www.buymeacoffee.com/TejaPriyan"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-line !px-4 !py-2.5 inline-flex items-center gap-2 border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/10 hover:border-[#f59e0b]/70"
                title="Support TejaPriyan"
              >
                <span>🍕</span>
                <span>Buy me a pizza</span>
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="s-mono text-[10px] tracking-[0.26em] uppercase text-faint mb-5">Navigate</div>
            <ul className="space-y-3">
              {NAV.map((n) => (
                <li key={n.id}>
                  <button onClick={() => go(n.id)} className="nav-link">{n.label}</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <div className="s-mono text-[10px] tracking-[0.26em] uppercase text-faint mb-5">Platform</div>
            <ul className="space-y-3 s-body !text-[13px]">
              <li>Autonomous Mission Engine</li>
              <li>Real Dataset Ingestion &amp; Validation</li>
              <li>Safe Experiment Sandbox</li>
              <li>Tamper-Evident Mission Ledger</li>
              <li>Memory &amp; Knowledge Core</li>
              <li>Model Gateway · Human checkpoints</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-[var(--s-line)] flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-faint">
          <span>© {new Date().getFullYear()} TEJAX — ALL RIGHTS RESERVED</span>
          <span>AI EXPERIMENTATION &amp; AGENT ENGINEERING PLATFORM</span>
          <span>MIT LICENSE · BUILT IN THE OPEN</span>
        </div>
      </div>
    </footer>
  )
}
