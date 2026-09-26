import { useId } from 'react'

/** TejaX mark — a hexagon containing an X and a core. */
export function TejaXMark({ size = 34 }: { size?: number }) {
  const id = useId()
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fe7ff" />
          <stop offset="100%" stopColor="#2a9bd8" />
        </linearGradient>
      </defs>
      <path d="M20 3 L34 12 V28 L20 37 L6 28 V12 Z" fill="none" stroke={`url(#${id})`} strokeWidth="1.8" />
      <path
        d="M13.5 20 H26.5 M20 13.5 V26.5 M15.5 15.5 L24.5 24.5 M24.5 15.5 L15.5 24.5"
        stroke={`url(#${id})`}
        strokeWidth="1.5"
      />
      <circle cx="20" cy="20" r="2.4" fill="#eaf2ff" />
    </svg>
  )
}

export default function Logo({ size = 34, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 select-none">
      <TejaXMark size={size} />
      {withWord && (
        <span className="s-display font-bold tracking-[0.3em] text-[16px] leading-none text-[#eaf2ff]">TEJAX</span>
      )}
    </span>
  )
}
