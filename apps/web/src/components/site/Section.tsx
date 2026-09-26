import type { ReactNode } from 'react'
import Reveal from './Reveal'

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`s-eyebrow ${className}`}>{children}</span>
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  align = 'left',
  className = '',
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lead?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  const centered = align === 'center'
  return (
    <div className={`${centered ? 'text-center mx-auto' : ''} max-w-3xl ${className}`}>
      {eyebrow && (
        <Reveal variant="fade">
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <Reveal delay={70}>
        <h2 className="s-h2 mt-5">{title}</h2>
      </Reveal>
      {lead && (
        <Reveal delay={140}>
          <p className={`s-lead mt-6 ${centered ? 'mx-auto' : ''}`}>{lead}</p>
        </Reveal>
      )}
    </div>
  )
}

export function Section({
  id,
  children,
  className = '',
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={`s-section ${className}`}>
      {children}
    </section>
  )
}

/** Numbered editorial block used in Mission / About. */
export function Block({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: ReactNode
}) {
  return (
    <Reveal variant="up" delay={0}>
      <div className="relative pt-8">
        <div className="s-rule absolute top-0 left-0 w-full" />
        <div className="s-num">{index}</div>
        <h3 className="s-h3 mt-4">{title}</h3>
        <p className="s-body mt-3 max-w-md">{children}</p>
      </div>
    </Reveal>
  )
}
