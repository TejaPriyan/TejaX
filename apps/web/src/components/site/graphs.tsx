import { useEffect, useId, useState, type ReactNode } from 'react'

/** Chart frame — instrument-style panel with mono corner labels. */
export function ChartFrame({
  title,
  tag = 'ILLUSTRATIVE',
  note,
  children,
  className = '',
}: {
  title: string
  tag?: string
  note?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`s-panel s-corners p-6 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <span className="s-mono text-[10px] tracking-[0.22em] uppercase text-dim">{title}</span>
        <span className="s-mono text-[9px] tracking-[0.2em] uppercase text-faint">{tag}</span>
      </div>
      {children}
      {note && <div className="s-mono text-[9px] text-faint mt-3 tracking-wide">{note}</div>}
    </div>
  )
}

function useMounted(delay = 60) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return on
}

/* ────────────────────────── sparkline / growth ────────────────────────── */

export function Sparkline({
  values,
  color = '#3dd6ff',
  height = 120,
  id,
}: {
  values: number[]
  color?: string
  height?: number
  id?: string
}) {
  const on = useMounted()
  const uid = id ?? useId().replace(/:/g, '')
  const w = 100
  const pad = 6
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = height - pad - ((v - min) / span) * (height - pad * 2)
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(2)},${height} L${pts[0][0].toFixed(2)},${height} Z`

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke="rgba(120,170,255,0.08)" strokeWidth="0.5" />
      ))}
      <path d={area} fill={`url(#g-${uid})`} style={{ opacity: on ? 1 : 0, transition: 'opacity 1s ease' }} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: on ? 0 : 1,
          transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)',
          filter: `drop-shadow(0 0 4px ${color}88)`,
        }}
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill={color} style={{ opacity: on ? 1 : 0, transition: `opacity .4s ease ${0.4 + i * 0.08}s` }} />
      ))}
    </svg>
  )
}

export function GrowthCurve({ height = 150, color = '#3dd6ff' }: { height?: number; color?: string }) {
  const on = useMounted(120)
  const uid = useId().replace(/:/g, '')
  const w = 100
  const pad = 6
  // S-curve from bottom-left to top-right
  const pts: [number, number][] = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const x = pad + t * (w - pad * 2)
    const s = 1 / (1 + Math.exp(-(t - 0.5) * 8))
    const y = height - pad - s * (height - pad * 2)
    pts.push([x, y])
  }
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gc-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke="rgba(120,170,255,0.08)" strokeWidth="0.5" />
      ))}
      <path d={`${line} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#gc-${uid})`} style={{ opacity: on ? 1 : 0, transition: 'opacity 1s ease' }} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1)' }}
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} style={{ opacity: on ? 1 : 0, transition: 'opacity .4s ease 1.2s' }} />
    </svg>
  )
}

/* ────────────────────────────── activity ─────────────────────────────── */

export function SignalBars({ bars = 24 }: { bars?: number }) {
  const on = useMounted()
  return (
    <div className="flex items-end gap-[4px] h-24">
      {Array.from({ length: bars }, (_, i) => {
        const h = 18 + Math.abs(Math.sin(i * 1.7 + 2)) * 82
        return (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: `${h}%`,
              background: 'linear-gradient(180deg, rgba(61,214,255,0.7), rgba(61,214,255,0.08))',
              transform: on ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'bottom',
              transition: `transform .7s cubic-bezier(0.22,1,0.36,1) ${i * 0.03}s`,
              animation: `sPulse ${2 + (i % 5) * 0.4}s ease-in-out ${i * 0.09}s infinite`,
            }}
          />
        )
      })}
    </div>
  )
}


