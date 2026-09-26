import { useMemo, useRef, type ReactNode } from 'react'

/**
 * Magnetic — wraps a control and pulls it gently toward the pointer.
 * Snappy while hovering, smooth on release. Disabled under reduced motion.
 */
export default function Magnetic({
  children,
  strength = 0.22,
  max = 10,
  className = '',
}: {
  children: ReactNode
  strength?: number
  max?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  if (reduced) {
    return (
      <div className={`inline-block ${className}`}>{children}</div>
    )
  }

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left - r.width / 2) * strength
    const y = (e.clientY - r.top - r.height / 2) * strength
    el.style.transition = 'transform 0.12s ease-out'
    el.style.transform = `translate(${clamp(x, max)}px, ${clamp(y, max)}px)`
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
    el.style.transform = 'translate(0, 0)'
  }

  return (
    <div
      ref={ref}
      className={`magnetic inline-block ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </div>
  )
}

function clamp(v: number, max: number) {
  return Math.max(-max, Math.min(max, v))
}
