import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type Variant = 'up' | 'left' | 'right' | 'scale' | 'fade'

/**
 * Reveal — scroll-triggered entrance. Fades + moves children in once they
 * enter the viewport. Respects prefers-reduced-motion via CSS.
 */
export default function Reveal({
  children,
  className = '',
  variant = 'up',
  delay = 0,
  style,
}: {
  children: ReactNode
  className?: string
  variant?: Variant
  delay?: number
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const variantClass = variant === 'up' ? '' : `reveal-${variant}`
  return (
    <div
      ref={ref}
      className={`reveal ${variantClass} ${inView ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  )
}
