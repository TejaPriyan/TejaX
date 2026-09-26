import Reveal from '../Reveal'
import { Section, SectionHead } from '../Section'
import Telemetry from '../Telemetry'
import { ChartFrame, Sparkline } from '../graphs'

const PILLARS = [
  {
    n: '01',
    title: 'Mission-driven, not chat',
    body: 'You define an experimentation goal and attach optional real data. A coordinated swarm decomposes objectives into an executable DAG.',
  },
  {
    n: '02',
    title: 'Real dataset validation',
    body: 'Upload real CSV/JSON tabular records. The runner mounts them directly into ephemeral workspaces to benchmark models against empirical ground truth.',
  },
  {
    n: '03',
    title: 'Safe isolated sandbox',
    body: 'Every line of synthesized code executes within bounded local or containerized environments with strict resource caps and zero network leaks.',
  },
  {
    n: '04',
    title: 'Auditable mission ledger',
    body: 'Every hypothesis, test pass, benchmark delta, and security critique is permanently logged in a tamper-evident decision ledger.',
  },
]

export default function WhatIs() {
  return (
    <Section id="what">
      <div className="s-wrap">
        <div className="grid lg:grid-cols-12 gap-14">
          <div className="lg:col-span-7">
            <SectionHead
              eyebrow="What is TejaX?"
              title={
                <>
                  An AI experimentation and agent engineering platform, built as{' '}
                  <span className="s-grad">one living system.</span>
                </>
              }
              lead={
                <>
                  TejaX is a technology initiative focused on building ambitious intelligent systems.
                  It isn&apos;t a chatbot and it isn&apos;t a toy — it&apos;s an empirical platform where
                  planning, research, engineering, real-data experimentation and critique happen together, under
                  supervision, in the open.
                </>
              }
            />
            <Reveal delay={160}>
              <p className="s-body mt-6 max-w-2xl">
                A mission enters with an optional dataset. A Planner decomposes objectives into tasks.
                A Researcher synthesizes literature. A Coder writes Python architectures. A Tester performs
                AST syntax validation. A Scientist mounts data and runs sandboxed experiments. An Analyst
                computes true test scores. A Critic audits quality and security. The loop repeats against measurable
                metrics until high-confidence evidence is established.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <Reveal variant="right" delay={100}>
              <ChartFrame title="Iterative improvement" note="Each loop refines the solution against measurable evidence.">
                <Sparkline values={[0.62, 0.68, 0.71, 0.78, 0.82, 0.84, 0.88, 0.9]} />
                <div className="flex justify-between mt-2 text-[9px] font-mono text-faint">
                  <span>ITER 1</span><span>ITER 8</span>
                </div>
              </ChartFrame>
            </Reveal>
            <Reveal variant="right" delay={200}>
              <div className="s-panel p-6">
                <div className="s-mono text-[10px] tracking-[0.22em] uppercase text-dim mb-4">The loop</div>
                <div className="flex flex-wrap gap-2">
                  {['Understand', 'Plan', 'Research', 'Approve', 'Build', 'Test', 'Experiment', 'Critique', 'Improve', 'Report'].map((p, i) => (
                    <span key={p} className="s-tag">
                      <span className="text-accent">{String(i).padStart(2, '0')}</span>
                      <span>{p}</span>
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* pillars */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 mt-24">
          {PILLARS.map((p) => (
            <div key={p.n} className="relative">
              <div className="s-rule absolute -top-6 left-0 w-full" />
              <div className="s-num">{p.n}</div>
              <h3 className="s-h3 mt-4">{p.title}</h3>
              <p className="s-body mt-3">{p.body}</p>
            </div>
          ))}
        </div>

        {/* live telemetry */}
        <div className="mt-24">
          <Reveal>
            <div className="flex items-center justify-between mb-6">
              <span className="s-eyebrow">System telemetry</span>
              <span className="s-mono text-[10px] text-faint">FROM THE RUNNING PLATFORM</span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <Telemetry />
          </Reveal>
        </div>
      </div>
    </Section>
  )
}
