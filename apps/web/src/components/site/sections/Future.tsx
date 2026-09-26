import Reveal from '../Reveal'
import { Section } from '../Section'

const DIRECTIONS = [
  'Knowledge graphs & opt-in live research',
  'Multi-modal input — vision, audio, documents',
  'Collaborative human + AI workflows',
  'Benchmarking suites for reproducible results',
  'Distributed agents across machines',
]

export default function Future() {
  return (
    <Section id="future">
      <div className="s-wrap">
        <div className="max-w-4xl">
          <Reveal variant="fade">
            <span className="s-eyebrow">Future</span>
          </Reveal>
          <Reveal delay={80}>
            <p className="s-h1 mt-6">
              The lab is just <span className="s-grad">the beginning.</span>
            </p>
          </Reveal>
          <Reveal delay={160}>
            <p className="s-lead mt-8">
              TejaX is an evolving platform. What ships next is guided by one question: how do we make
              autonomous research more capable, more transparent and safer to run?
            </p>
          </Reveal>
        </div>

        <div className="mt-16 border-t border-[var(--s-line)]">
          {DIRECTIONS.map((d, i) => (
            <Reveal key={d} delay={i * 70}>
              <div className="group flex items-center gap-6 py-5 border-b border-[var(--s-line)]">
                <span className="s-num !text-2xl">{String(i + 1).padStart(2, '0')}</span>
                <span className="s-h3 !text-xl group-hover:text-[#eaf2ff] transition-colors">{d}</span>
                <span className="ml-auto text-accent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden>→</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
