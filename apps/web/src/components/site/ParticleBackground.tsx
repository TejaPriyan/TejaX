import { useEffect, useRef } from 'react'
import { ParticleField } from '../../three/particleField'

/**
 * ParticleBackground — mounts the generative particle-wave field behind the
 * whole site and feeds it pointer + scroll signals.
 */
export default function ParticleBackground({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLElement>
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<ParticleField | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let field: ParticleField | null = null
    try {
      field = new ParticleField(mount)
      fieldRef.current = field
    } catch (err) {
      // WebGL unavailable/failed — the site still renders, just without the
      // particle background.
      console.warn('ParticleField disabled:', err)
    }

    const onPointer = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      field?.setPointer(x, y)
    }
    const onScroll = () => {
      const el = scrollRef.current
      if (!el) return
      const max = el.scrollHeight - el.clientHeight
      field?.setScroll(max > 0 ? el.scrollTop / max : 0)
    }

    window.addEventListener('pointermove', onPointer, { passive: true })
    const scroller = scrollRef.current
    scroller?.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointer)
      scroller?.removeEventListener('scroll', onScroll)
      field?.dispose()
      fieldRef.current = null
    }
  }, [scrollRef])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0" />
      {/* Soft Vignette and Ambient Depth Gradient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(3,6,15,0.65)_75%,rgba(2,4,10,0.95)_100%)] pointer-events-none" />
    </div>
  )
}
