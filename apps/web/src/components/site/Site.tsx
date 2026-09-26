import { useEffect, useRef, useState } from 'react'
import ParticleBackground from './ParticleBackground'
import SiteNav from './SiteNav'
import Marquee from './Marquee'
import Hero from './sections/Hero'
import WhatIs from './sections/WhatIs'
import ProjectShowcase from './sections/ProjectShowcase'
import Mission from './sections/Mission'
import Vision from './sections/Vision'
import Technology from './sections/Technology'
import Projects from './sections/Projects'
import Innovation from './sections/Innovation'
import Future from './sections/Future'
import About from './sections/About'
import Footer from './Footer'

/**
 * Site — the public TejaX company website. A single-page experience over a
 * persistent 3D particle-wave environment, sharing the same store/backend as
 * the lab application.
 */
export default function Site() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 40)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="site h-screen w-screen relative">
      <ParticleBackground scrollRef={scrollRef} />

      <div ref={scrollRef} className="s-scroll z-10">
        <SiteNav scrolled={scrolled} scrollRef={scrollRef} />

        <main className="relative">
          <Hero />
          <Marquee />
          <WhatIs />
          <ProjectShowcase />
          <Mission />
          <Vision />
          <Technology />
          <Projects />
          <Innovation />
          <Future />
          <About />
        </main>

        <Footer />
      </div>
    </div>
  )
}
