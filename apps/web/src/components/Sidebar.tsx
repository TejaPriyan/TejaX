import { useStore, type Page } from '../lib/store'
import { StatusDot } from './ui'

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'command', label: 'Command Center', icon: '◈' },
  { id: 'missions', label: 'Missions', icon: '◎' },
  { id: 'lab', label: 'AI Lab', icon: '⬡' },
  { id: 'agents', label: 'Agents', icon: '◇' },
  { id: 'experiments', label: 'Experiments', icon: '▣' },
  { id: 'memory', label: 'Memory', icon: '✦' },
  { id: 'analytics', label: 'Analytics', icon: '≣' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar() {
  const page = useStore((s) => s.page)
  const setPage = useStore((s) => s.setPage)
  const setView = useStore((s) => s.setView)
  const wsConnected = useStore((s) => s.wsConnected)
  const systemStatus = useStore((s) => s.systemStatus)

  return (
    <aside className="w-56 shrink-0 h-full glass-strong border-r hairline flex flex-col z-20">
      {/* Brand */}
      <button
        onClick={() => setPage('command')}
        className="flex items-center gap-3 px-5 py-5 text-left border-b hairline group"
        aria-label="TejaX home"
      >
        <div className="relative h-10 w-10 grid place-items-center animate-floaty">
          <svg viewBox="0 0 40 40" className="h-10 w-10">
            <defs>
              <linearGradient id="tx" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3dd6ff" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <path d="M20 2 L34 12 V28 L20 38 L6 28 V12 Z" fill="none" stroke="url(#tx)" strokeWidth="1.6" className="animate-spin-slow origin-center" style={{ transformOrigin: 'center' }} />
            <path d="M12 20 L28 20 M20 12 L20 28 M14 14 L26 26 M26 14 L14 26" stroke="url(#tx)" strokeWidth="1.4" />
          </svg>
        </div>
        <div>
          <div className="text-lg font-bold tracking-[0.28em] leading-none text-grad">TEJAX</div>
          <div className="text-[9px] text-dim tracking-[0.14em] mt-1">AI EXPERIMENTATION PLATFORM</div>
        </div>
      </button>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scroll-thin">
        {NAV.map((item) => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                active
                  ? 'text-white bg-[rgba(61,214,255,0.09)] border border-[rgba(61,214,255,0.28)]'
                  : 'text-dim hover:text-white hover:bg-[rgba(125,165,255,0.06)] border border-transparent'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-gradient-to-b from-[#3dd6ff] to-[#8b5cf6]" />
              )}
              <span className={`w-4 text-center ${active ? 'text-accent' : 'opacity-60'}`}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Status footer */}
      <div className="px-4 py-4 border-t hairline space-y-2.5">
        <div className="flex items-center gap-2 text-[11px] text-dim">
          <StatusDot status={wsConnected ? 'ONLINE' : 'OFFLINE'} />
          <span>{wsConnected ? 'Realtime link' : 'Reconnecting…'}</span>
        </div>
        <div className="text-[10px] text-faint font-mono leading-relaxed">
          {systemStatus ? (
            <>
              {systemStatus.agentsOnline} agents · {systemStatus.memoryCount} memories
              <br />
              model: {systemStatus.modelStatus.model}
            </>
          ) : (
            'initializing…'
          )}
        </div>
        <button
          onClick={() => setView('site')}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-[rgba(125,165,255,0.14)] px-3 py-2 text-[11px] font-mono tracking-wider text-dim hover:text-white hover:border-[rgba(61,214,255,0.4)] transition-colors"
        >
          ↖ WEBSITE
        </button>
      </div>
    </aside>
  )
}
