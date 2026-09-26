import Reveal from '../Reveal'
import { Section } from '../Section'
import { SignalBars } from '../graphs'

const BLOCKS = [
  {
    n: '01',
    title: 'Autonomy with accountability',
    body: 'Agents act on their own — but human checkpoints stand between research and deployment. Progress is always reversible and always visible.',
  },
  {
    n: '02',
    title: 'Intelligence you can watch',
    body: 'No black boxes. Every plan, experiment, critique and decision streams out as a live event you can inspect.',
  },
  {
    n: '03',
    title: 'Safety as a first principle',
    body: 'Generated code is untrusted by default. It runs in an isolated sandbox with hard limits — never on your machine, never with your secrets.',
  },
  {
    n: '04',
    title: 'Open, local-first',
    body: 'TejaX runs without paid APIs and without the cloud. It is built to be understood, audited and extended.',
  },
]

const STEPS = ['Understand', 'Plan', 'Research', 'Approve', 'Build', 'Test', 'Experiment', 'Critique', 'Improve', 'Report']

export default function Mission() {
  return (
    <Section id="mission">
      <div className="s-wrap">
        <div className="max-w-4xl">
          <Reveal variant="fade">
            <span className="s-eyebrow">Our mission</span>
          </Reveal>
          <Reveal delay={80}>
            <p className="s-h1 mt-6">
              We build technology that moves ideas from{' '}
              <span className="s-grad">imagination into reality.</span>
            </p>
          </Reveal>
          <Reveal delay={160}>
            <p className="s-lead mt-8">
              Most ambitious ideas die between concept and working system. TejaX exists to close that
              gap — to give intelligent, autonomous systems a place to think, build and prove themselves,
              safely and in the open.
            </p>
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-12 gap-14 mt-24">
          {/* pipeline flow */}
          <div className="lg:col-span-7">
            <Reveal variant="left">
              <div className="s-panel s-corners p-7">
                <div className="s-mono text-[10px] tracking-[0.24em] uppercase text-dim mb-6">The pipeline</div>
                <div className="flex flex-wrap gap-y-3">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center">
                      <span className="s-tag">
                        <span className="text-accent">{String(i).padStart(2, '0')}</span>
                        <span>{s}</span>
                      </span>
                      {i < STEPS.length - 1 && <span className="text-accent text-[10px] mx-2" aria-hidden>→</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <SignalBars />
                </div>
                <div className="mt-3 flex justify-between text-[9px] font-mono text-faint">
                  <span>SYSTEM ACTIVITY</span>
                  <span>ILLUSTRATIVE</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* editorial blocks */}
          <div className="lg:col-span-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-10">
              {BLOCKS.map((b) => (
                <div key={b.n} className="relative pt-7">
                  <div className="s-rule absolute top-0 left-0 w-full" />
                  <div className="flex items-baseline gap-3">
                    <span className="s-num !text-xl">{b.n}</span>
                    <h3 className="s-h3">{b.title}</h3>
                  </div>
                  <p className="s-body mt-3">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
