import Reveal from '../Reveal'
import { Section, SectionHead } from '../Section'

const PRINCIPLES = [
  'Honesty over hype — no invented results, no fabricated sources.',
  'Safety by default — untrusted code is always sandboxed.',
  'Observability — every decision leaves a trace.',
  'Local-first — it must run without paid APIs or the cloud.',
]

export default function About() {
  return (
    <Section id="about">
      <div className="s-wrap">
        <div className="grid lg:grid-cols-12 gap-14">
          <div className="lg:col-span-7">
            <SectionHead
              eyebrow="About TejaX"
              title="An evolving technology initiative."
              lead="TejaX is a research platform and a product, built as one project by a small team of engineers and researchers who believe the future of software is systems that build, test and learn on their own — under human supervision."
            />
            <Reveal delay={160}>
              <p className="s-body mt-6 max-w-2xl">
                It is deliberately open and self-contained: the pipeline is explained, the experiments are
                reproducible, and the whole thing runs on a laptop. We build in public because autonomy
                without accountability is not a future anyone should want.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal variant="right">
              <div className="s-panel s-corners p-7">
                <div className="s-mono text-[10px] tracking-[0.24em] uppercase text-dim mb-5">Principles</div>
                <ul className="space-y-4">
                  {PRINCIPLES.map((p) => (
                    <li key={p} className="flex gap-3 s-body !text-[13.5px]">
                      <span className="text-accent shrink-0 mt-0.5" aria-hidden>◆</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>

        {/* disclaimer */}
        <Reveal delay={100}>
          <div className="mt-16 border border-[var(--s-line-strong)] border-l-2 border-l-[#3dd6ff] p-6" style={{ borderRadius: 3 }}>
            <div className="flex gap-4">
              <span className="s-mono text-[11px] tracking-[0.2em] uppercase text-accent shrink-0">Mission</span>
              <p className="s-body !text-[13px] max-w-3xl">
                TejaX is an <span className="text-[#eaf2ff]">autonomous multi-agent</span> intelligence research platform.
                It is engineered for systematic problem formulation, empirical scientific research, and verifiable code execution in safe isolated sandboxes.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
