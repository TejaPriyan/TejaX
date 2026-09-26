const ITEMS = [
  'Autonomous agents',
  'Live 3D laboratory',
  'Safe sandbox',
  'Long-term memory',
  'Real-time events',
  'Human checkpoints',
  'Local-first',
  'Model agnostic',
]

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS]
  return (
    <div className="relative border-y border-[var(--s-line)] py-5 overflow-hidden" aria-hidden>
      <div className="s-marquee">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10 shrink-0">
            <span className="s-mono text-[11px] tracking-[0.3em] uppercase text-faint">{t}</span>
            <span className="text-accent text-[10px]">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
}
