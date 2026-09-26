import { useEffect, useRef, useState, type ReactNode } from 'react'

export function GlassCard({
  children,
  className = '',
  onClick,
  hover = true,
  style,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`glass rounded-2xl ${hover ? 'card' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  children,
  hint,
  icon,
}: {
  children: ReactNode
  hint?: string
  icon?: string
}) {
  return (
    <div className="flex items-baseline justify-between mb-3 gap-3">
      <h2 className="hud-label flex items-center gap-2">
        {icon && <span className="text-[12px] text-accent/80">{icon}</span>}
        {children}
      </h2>
      {hint && <span className="text-[10px] text-faint font-mono truncate">{hint}</span>}
    </div>
  )
}

export function StatusDot({ status, pulse = true }: { status: string; pulse?: boolean }) {
  const color: Record<string, string> = {
    ONLINE: '#3dd6ff',
    ACTIVE: '#34d399',
    WAITING: '#94a3b8',
    WARNING: '#fbbf24',
    ERROR: '#fb7185',
    OFFLINE: '#475569',
    COMPLETED: '#34d399',
    PASSED: '#34d399',
    FAILED: '#fb7185',
    RUNNING: '#3dd6ff',
    QUEUED: '#94a3b8',
    TIMED_OUT: '#fb7185',
    CANCELLED: '#64748b',
    PAUSED: '#fbbf24',
    AWAITING_APPROVAL: '#fbbf24',
    REJECTED: '#fb7185',
    idle: '#475569',
  }
  const c = color[status] ?? '#94a3b8'
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && (
        <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ backgroundColor: c }} />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }}
      />
    </span>
  )
}

export function Badge({ children, color = '#3dd6ff' }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ color, backgroundColor: `${color}14`, border: `1px solid ${color}30` }}
    >
      {children}
    </span>
  )
}

export function Pill({ children, color = '#3dd6ff', dot = true }: { children: ReactNode; color?: string; dot?: boolean }) {
  return (
    <span
      className="status-pill"
      style={{ color, backgroundColor: `${color}12`, border: `1px solid ${color}2e` }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />}
      {children}
    </span>
  )
}

export function ProgressRing({
  value,
  size = 48,
  stroke = 4,
  color = '#3dd6ff',
  label,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  label?: boolean
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <defs>
        <linearGradient id={`rg-${color.replace('#', '')}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(125,165,255,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#rg-${color.replace('#', '')})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 5px ${color}88)` }}
      />
      {label && (
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#e7f0ff" fontSize={size * 0.26} fontFamily="JetBrains Mono, monospace">
          {Math.round(pct * 100)}
        </text>
      )}
    </svg>
  )
}

export function Stat({
  label,
  value,
  accent = '#3dd6ff',
  icon,
  animate = true,
  decimals = 0,
}: {
  label: string
  value: ReactNode
  accent?: string
  icon?: string
  animate?: boolean
  decimals?: number
}) {
  const num = typeof value === 'number' ? value : null
  return (
    <div className="glass rounded-xl p-3.5 card">
      <div className="flex items-center gap-1.5 hud-label">
        {icon && <span style={{ color: accent }}>{icon}</span>}
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold tracking-tight" style={{ color: accent }}>
        {num !== null && animate ? <AnimatedNumber value={num} decimals={decimals} /> : value}
      </div>
    </div>
  )
}

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 900,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number
  decimals?: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const from = prev.current
    const to = value
    prev.current = value
    if (from === to) {
      setDisplay(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}

export function Bar({ value, color = '#3dd6ff', height = 6 }: { value: number; color?: string; height?: number }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(Math.max(0, Math.min(100, value))))
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <div className="w-full rounded-full" style={{ height, background: 'rgba(125,165,255,0.12)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${w}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 12px ${color}66`,
        }}
      />
    </div>
  )
}

export function LineChart({
  values,
  color = '#3dd6ff',
  height = 120,
  labels,
  unit = '',
}: {
  values: number[]
  color?: string
  height?: number
  labels?: string[]
  unit?: string
}) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60)
    return () => clearTimeout(t)
  }, [])

  const w = 100
  if (values.length < 2) {
    return (
      <div className="flex items-center justify-center text-faint text-xs" style={{ height }}>
        Not enough data yet
      </div>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 10
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
        <linearGradient id={`lc-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke="rgba(125,165,255,0.08)" strokeWidth="0.5" />
      ))}
      <path d={area} fill={`url(#lc-${color.replace('#', '')})`} style={{ opacity: on ? 1 : 0, transition: 'opacity 0.8s ease' }} />
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
          transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)',
          filter: `drop-shadow(0 0 4px ${color}aa)`,
        }}
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill={color} style={{ opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.3 + i * 0.1}s` }} />
      ))}
      {labels &&
        pts.map(([x], i) => (
          <text key={i} x={x} y={height - 2} textAnchor="middle" fontSize="4.5" fill="#52658f" fontFamily="JetBrains Mono, monospace">
            {labels[i] ?? ''}
          </text>
        ))}
    </svg>
  )
}

export function timeStr(ms?: number | null): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleTimeString([], { hour12: false })
}
