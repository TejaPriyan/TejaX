import Reveal from '../Reveal'
import { Section, SectionHead } from '../Section'
import { GrowthCurve, ChartFrame } from '../graphs'

const STAGES = [
  {
    label: 'NOW',
    status: 'LIVE',
    color: '#34d399',
    title: 'Empirical multi-agent experimentation',
    body: 'A complete multi-agent pipeline — planning, research, real dataset ingestion, sandboxed experiments, critique and transparent mission ledgers.',
  },
  {
    label: 'NEXT',
    status: 'IN DEVELOPMENT',
    color: '#3dd6ff',
    title: 'Multi-modal data & benchmark harness',
    body: 'Automated benchmark suites, offline artifact reproduction packages, and multi-modal sensory dataset analysis.',
  },
  {
    label: 'HORIZON',
    status: 'EXPLORING',
    color: '#8b9bd8',
    title: 'Collaborative human + AI research teams',
    body: 'Interactive steering breakpoints, active hypothesis exploration, and peer-review ready whitepaper generation.',
  },
]

export default function Vision() {
  return (
    <Section id="vision">
      <div className="s-wrap">
        <SectionHead
          eyebrow="Vision"
          title="A roadmap, not a roadmap slide."
          lead="Three horizons. Each one builds on the last — moving from executing missions, to learning from them, to discovering what to attempt next."
        />

        <div className="relative mt-20">
          {/* connecting spine */}
          <div className="hidden lg:block absolute top-[34px] left-[16.66%] right-[16.66%] h-px bg-[var(--s-line-strong)]" aria-hidden />
          <div
            className="hidden lg:block absolute top-[34px] left-[16.66%] w-1/3 h-px"
            style={{ background: 'linear-gradient(90deg, #34d399, #3dd6ff)' }}
            aria-hidden
          />

          <div className="grid lg:grid-cols-3 gap-10">
            {STAGES.map((s, i) => (
              <Reveal key={s.label} delay={i * 120}>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="relative z-10 grid place-items-center h-[34px] w-[34px] rounded-full border"
                      style={{ borderColor: `${s.color}88`, background: '#05080f', boxShadow: `0 0 20px ${s.color}33` }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                    </span>
                    <span className="s-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: s.color }}>{s.label}</span>
                    <span className="s-tag ml-auto">
                      <span className="dot" style={{ color: s.color }} />
                      <span>{s.status}</span>
                    </span>
                  </div>
                  <h3 className="s-h3">{s.title}</h3>
                  <p className="s-body mt-3">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <ChartFrame title="Capability trajectory" note="Concept visualization — not measured data.">
            <GrowthCurve height={110} color="#3dd6ff" />
            <div className="flex justify-between mt-2 text-[9px] font-mono text-faint"><span>NOW</span><span>NEXT</span><span>FUTURE</span></div>
          </ChartFrame>
          <div className="md:col-span-2 s-panel p-7 flex flex-col justify-center">
            <div className="s-eyebrow mb-5">The end state</div>
            <p className="s-h3 !text-2xl leading-snug max-w-2xl">
              A research system that doesn&apos;t just answer — it <span className="s-grad">discovers, builds, tests and remembers,</span>{' '}
              with people in the loop at every consequential step.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}
