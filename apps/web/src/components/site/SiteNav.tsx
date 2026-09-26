import { useEffect, useState, type RefObject } from 'react'
import { useStore } from '../../lib/store'
import Logo from './Logo'
import Magnetic from './Magnetic'

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'mission', label: 'Mission' },
  { id: 'technology', label: 'Technology' },
  { id: 'projects', label: 'Projects' },
  { id: 'vision', label: 'Vision' },
  { id: 'about', label: 'About' },
]

export default function SiteNav({
  scrolled,
  scrollRef,
}: {
  scrolled: boolean
  scrollRef: RefObject<HTMLElement>
}) {
  const setView = useStore((s) => s.setView)
  const [active, setActive] = useState('home')
  const [open, setOpen] = useState(false)

  // scroll-spy + active link
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ids = LINKS.map((l) => l.id)
    const onScroll = () => {
      const pos = el.scrollTop + el.clientHeight * 0.35
      let current = 'home'
      for (const id of ids) {
        const sec = document.getElementById(id)
        if (sec && sec.offsetTop <= pos) current = id
      }
      setActive(current)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollRef])

  const go = (id: string) => {
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          scrolled ? 'backdrop-blur-xl bg-[rgba(4,7,15,0.72)] border-b border-[var(--s-line)]' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="s-wrap flex items-center justify-between" style={{ height: scrolled ? 58 : 78, transition: 'height .5s cubic-bezier(.22,1,.36,1)' }}>
          <button onClick={() => go('home')} className="text-left" aria-label="TejaX home">
            <Logo size={scrolled ? 26 : 30} />
          </button>

          <nav className="hidden lg:flex items-center gap-8" aria-label="Primary">
            {LINKS.map((l) => (
              <button key={l.id} onClick={() => go(l.id)} className={`nav-link ${active === l.id ? 'active' : ''}`}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:block">
            <Magnetic>
              <button onClick={() => setView('app')} className="btn-line !px-5 !py-2.5">
                Enter TejaX <span aria-hidden>↗</span>
              </button>
            </Magnetic>
          </div>

          {/* mobile toggle */}
          <button
            className="lg:hidden flex flex-col justify-center gap-[5px] w-9 h-9 items-end"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            <span className={`block h-px bg-[#eaf2ff] transition-all duration-300 ${open ? 'w-6 translate-y-[6px] rotate-45' : 'w-6'}`} />
            <span className={`block h-px bg-[#eaf2ff] transition-all duration-300 ${open ? 'opacity-0' : 'w-4'}`} />
            <span className={`block h-px bg-[#eaf2ff] transition-all duration-300 ${open ? 'w-6 -translate-y-[6px] -rotate-45' : 'w-5'}`} />
          </button>
        </div>
      </header>

      {/* mobile menu */}
      <div
        className={`lg:hidden fixed inset-0 z-30 transition-all duration-400 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(3,5,11,0.94)', backdropFilter: 'blur(20px)' }}
      >
        <nav className="h-full flex flex-col justify-center px-10 gap-2" aria-label="Mobile">
          {LINKS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="s-display text-left text-3xl font-semibold py-3 border-b border-[var(--s-line)] text-dim hover:text-[#eaf2ff] transition-colors"
              style={{ transitionDelay: open ? `${i * 40}ms` : '0ms', transform: open ? 'translateY(0)' : 'translateY(10px)', opacity: open ? 1 : 0, transition: `opacity .3s ease ${i * 40}ms, transform .3s ease ${i * 40}ms, color .2s ease` }}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => {
              setOpen(false)
              setView('app')
            }}
            className="btn-solid mt-8 self-start"
          >
            Enter TejaX ↗
          </button>
        </nav>
      </div>
    </>
  )
}
