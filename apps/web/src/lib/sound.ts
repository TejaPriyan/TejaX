// Synthesized UI sound cues — no audio assets, pure Web Audio API.
// Sound is OFF by default (browsers require a user gesture for audio); the
// user enables it from the Lab HUD or Settings. Preference persists.

type Cue =
  | 'start'
  | 'complete'
  | 'fail'
  | 'experiment'
  | 'experimentFail'
  | 'critique'
  | 'code'
  | 'memory'
  | 'research'
  | 'task'
  | 'test'
  | 'approved'
  | 'holo'
  | 'drone'

const STORAGE_KEY = 'tejax.sound'

class SoundFX {
  private ctx: AudioContext | null = null
  enabled = false

  constructor() {
    try {
      this.enabled = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      this.enabled = false
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (v) this.ensure()
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    opts: {
      dur?: number
      type?: OscillatorType
      gain?: number
      when?: number
      glideTo?: number
    } = {},
  ) {
    const { dur = 0.14, type = 'sine', gain = 0.055, when = 0, glideTo } = opts
    const t0 = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  play(cue: Cue) {
    if (!this.enabled) return
    const ctx = this.ensure()
    if (!ctx) return
    switch (cue) {
      case 'start':
        this.tone(ctx, 392, { dur: 0.4, type: 'sine', glideTo: 784, gain: 0.05 })
        break
      case 'complete':
        this.tone(ctx, 523.25, { dur: 0.16 })
        this.tone(ctx, 659.25, { dur: 0.16, when: 0.12 })
        this.tone(ctx, 783.99, { dur: 0.3, when: 0.24, gain: 0.07 })
        break
      case 'fail':
        this.tone(ctx, 160, { dur: 0.4, type: 'sawtooth', gain: 0.05, glideTo: 90 })
        break
      case 'experiment':
        this.tone(ctx, 659.25, { dur: 0.14 })
        this.tone(ctx, 987.77, { dur: 0.22, when: 0.1, gain: 0.06 })
        break
      case 'experimentFail':
        this.tone(ctx, 220, { dur: 0.3, type: 'square', gain: 0.04, glideTo: 140 })
        break
      case 'critique':
        this.tone(ctx, 311.13, { dur: 0.22, type: 'triangle', gain: 0.06 })
        break
      case 'code':
        this.tone(ctx, 440, { dur: 0.09, type: 'square', gain: 0.035 })
        break
      case 'memory':
        this.tone(ctx, 1318.5, { dur: 0.12, gain: 0.045 })
        this.tone(ctx, 1760, { dur: 0.18, when: 0.08, gain: 0.04 })
        break
      case 'research':
        this.tone(ctx, 587.33, { dur: 0.16, gain: 0.05 })
        break
      case 'task':
        this.tone(ctx, 880, { dur: 0.05, type: 'sine', gain: 0.03 })
        break
      case 'test':
        this.tone(ctx, 740, { dur: 0.1 })
        this.tone(ctx, 932, { dur: 0.14, when: 0.09, gain: 0.05 })
        break
      case 'approved':
        this.tone(ctx, 660, { dur: 0.14, glideTo: 990, gain: 0.05 })
        break
      case 'holo':
        this.tone(ctx, 440, { dur: 0.12, type: 'sine', glideTo: 880, gain: 0.05 })
        this.tone(ctx, 880, { dur: 0.18, type: 'sine', glideTo: 1320, when: 0.08, gain: 0.04 })
        break
      case 'drone':
        this.tone(ctx, 1174.66, { dur: 0.07, type: 'sine', gain: 0.035 })
        this.tone(ctx, 1760, { dur: 0.1, type: 'sine', when: 0.05, gain: 0.03 })
        break
      default:
        break
    }
  }

  cueForEvent(type: string, payload?: Record<string, unknown>) {
    switch (type) {
      case 'MISSION_STARTED':
        this.play('start')
        break
      case 'MISSION_COMPLETED':
        this.play('complete')
        break
      case 'MISSION_FAILED':
      case 'MISSION_CANCELLED':
      case 'REJECTED':
        this.play('fail')
        break
      case 'EXPERIMENT_COMPLETED':
        this.play(payload?.status === 'PASSED' ? 'experiment' : 'experimentFail')
        break
      case 'CRITIQUE_CREATED':
        this.play('critique')
        break
      case 'CODE_GENERATED':
      case 'CODE_REVISED':
        this.play('code')
        break
      case 'MEMORY_CREATED':
        this.play('memory')
        break
      case 'RESEARCH_COMPLETED':
      case 'PLANNING_COMPLETED':
        this.play('research')
        break
      case 'TASK_STARTED':
        this.play('task')
        break
      case 'TEST_COMPLETED':
        this.play('test')
        break
      case 'APPROVED':
        this.play('approved')
        break
      default:
        break
    }
  }
}

export const sound = new SoundFX()
