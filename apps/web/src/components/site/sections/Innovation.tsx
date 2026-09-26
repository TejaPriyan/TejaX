import Reveal from '../Reveal'
import { Section, SectionHead } from '../Section'
import { ChartFrame, Sparkline } from '../graphs'

const LOOP = ['Build', 'Test', 'Experiment', 'Critique', 'Improve']

function ImproveLoop() {
  const cx = 140
  const cy = 140
  const R = 86
  return (
    <svg viewBox="0 0 280 280" className="w-full h-auto" role="img" aria-label="TejaX improve loop">
      {LOOP.map((s, i) => {
        const ang = (i / LOOP.length) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(ang) * R
        const y = cy + Math.sin(ang) * R
        const next = (i + 1) % LOOP.length
        const na = (next / LOOP.length) * Math.PI * 2 - Math.PI / 2
        const nx = cx + Math.cos(na) * R
        const ny = cy + Math.sin(na) * R
        return (
          <g key={s}>
            <line x1={x} y1={y} x2={nx} y2={ny} stroke="rgba(61,214,255,0.3)" strokeWidth="1" className="s-flow" style={{ animationDelay: `${i * -1.1}s` }} />
          </g>
        )
      })}
      {LOOP.map((s, i) => {
        const ang = (i / LOOP.length) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(ang) * R
        const y = cy + Math.sin(ang) * R
        return (
          <g key={`n-${s}`} transform={`translate(${x},${y})`}>
            <circle r="24" fill="rgba(8,13,26,0.92)" stroke="rgba(120,170,255,0.35)" strokeWidth="1" />
            <text textAnchor="middle" dy="3.5" fontSize="9" fill="#bfeeff" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{s}</text>
            <circle r="30" fill="none" stroke="#3dd6ff" strokeOpacity="0.4" strokeWidth="1" className="s-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r="5" fill="#eaf2ff" />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="8" fill="#8fa3c4" fontFamily="JetBrains Mono, monospace" letterSpacing="2">LOOP</text>
    </svg>
  )
}

export default function Innovation() {
  return (
    <Section id="innovation">
      <div className="s-wrap">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <SectionHead
              eyebrow="Innovation"
              title="Improvement, bounded and measured."
              lead="Innovation here isn't a buzzword — it's a measurable loop. Agents synthesize code, mount real datasets, run sandboxed experiments, invite criticism and iteratively improve. Every iteration is scored against empirical evidence, and the loop is hard-capped so it can never run away."
            />
            <Reveal delay={160}>
              <p className="s-body mt-6 max-w-xl">
                The Critic is adversarial by design: agents don&apos;t blindly trust each other. Validation,
                evaluation and explicit uncertainty are required at every step. If the evidence isn&apos;t
                there, the system says so — no invented results.
              </p>
            </Reveal>
          </div>

          <div className="grid gap-6">
            <Reveal variant="right">
              <div className="s-panel s-corners p-7">
                <div className="flex items-center justify-between mb-5">
                  <span className="s-mono text-[10px] tracking-[0.24em] uppercase text-dim">The improve loop</span>
                  <span className="s-mono text-[9px] text-faint">MAX 5 ITERATIONS</span>
                </div>
                <ImproveLoop />
              </div>
            </Reveal>
            <Reveal variant="right" delay={100}>
              <ChartFrame title="Measured improvement" note="Scores climb as critique + revision compound. Prototype data.">
                <Sparkline values={[0.7, 0.73, 0.78, 0.8, 0.84, 0.85, 0.855]} color="#34d399" height={96} />
              </ChartFrame>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  )
}
