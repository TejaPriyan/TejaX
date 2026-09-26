import * as THREE from 'three'

/**
 * ParticleField — a subtle, generative 3D particle-wave environment.
 *
 * Thousands of particles form a continuously flowing digital surface that
 * reacts gently to the pointer (parallax + a soft wake) and to scrolling
 * (camera drift + wave phase). Designed to sit *behind* content: soft
 * additive points, low alpha, one material, no shadows, no post-processing.
 *
 * Performance: adaptive particle count and pixel ratio, pauses when the tab
 * is hidden, freezes to a single frame under prefers-reduced-motion, and
 * downscales if the frame budget is exceeded.
 */

const COL_TOP = new THREE.Color('#bfeeff')
const COL_MID = new THREE.Color('#2a9bd8')
const COL_DEEP = new THREE.Color('#0c2a4d')

function softSprite(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.minFilter = THREE.LinearFilter
  return t
}

export class ParticleField {
  private container: HTMLElement
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private group = new THREE.Group()

  private points!: THREE.Points
  private geometry!: THREE.BufferGeometry
  private material!: THREE.PointsMaterial
  private base: Float32Array = new Float32Array(0)
  private positions: Float32Array = new Float32Array(0)
  private count = 0

  private halfSpan = 11
  private depthSpan = 9

  private clock = new THREE.Clock()
  private raf = 0
  private disposed = false
  private reduced: boolean
  private running = false

  // interaction targets (lerped each frame for smoothness)
  private pointer = new THREE.Vector2(0, 0)
  private tPointer = new THREE.Vector2(0, 0)
  private scroll = 0
  private tScroll = 0

  // adaptive quality
  private frames = 0
  private cost = 0
  private downscaled = false

  private ro: ResizeObserver
  private onVis: () => void

  constructor(container: HTMLElement) {
    this.container = container
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

    const w = Math.max(1, container.clientWidth)
    const h = Math.max(1, container.clientHeight)

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'default' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.position = 'absolute'
    this.renderer.domElement.style.inset = '0'
    this.renderer.domElement.style.pointerEvents = 'none'
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 80)
    this.scene.add(this.group)

    this.applyPixelRatio()
    this.build(w, h)

    this.ro = new ResizeObserver(() => this.onResize())
    this.ro.observe(container)
    this.onVis = () => {
      if (document.hidden) this.pause()
      else if (!this.reduced) this.start()
    }
    document.addEventListener('visibilitychange', this.onVis)

    if (this.reduced) this.renderOnce()
    else this.start()
  }

  private applyPixelRatio() {
    const coarse = matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    const cap = coarse ? 1 : 1.2
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap))
  }

  private idealCount(w: number, h: number): number {
    const area = w * h
    const coarse = matchMedia('(pointer: coarse)').matches
    let c = coarse ? 1200 : 2200
    if (area > 1600 * 900) c = coarse ? 1600 : 2800
    if (area < 720 * 720) c = 1000
    return Math.round(c * (this.reduced ? 0.5 : 1))
  }

  private build(w: number, h: number) {
    if (this.geometry) {
      this.geometry.dispose()
      this.material.dispose()
      this.group.remove(this.points)
    }
    this.count = this.idealCount(w, h)
    const cols = Math.max(2, Math.round(Math.sqrt(this.count * (w / Math.max(1, h))) * 1.15))
    const rows = Math.max(2, Math.ceil(this.count / cols))
    const n = cols * rows

    this.base = new Float32Array(n * 3)
    this.positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)

    const cTop = COL_TOP
    const cMid = COL_MID
    const cDeep = COL_DEEP
    const tmp = new THREE.Color()

    for (let i = 0; i < n; i++) {
      const ix = i % cols
      const iz = Math.floor(i / cols)
      const x = (ix / (cols - 1) - 0.5) * this.halfSpan * 2
      const z = -this.depthSpan * 0.15 - (iz / (rows - 1)) * this.depthSpan
      // gentle foreground bias so the surface reads front-to-back
      this.base[i * 3] = x
      this.base[i * 3 + 1] = 0
      this.base[i * 3 + 2] = z

      const t = iz / (rows - 1) // 0 front → 1 back
      if (t < 0.45) tmp.copy(cTop).lerp(cMid, t / 0.45)
      else tmp.copy(cMid).lerp(cDeep, (t - 0.45) / 0.55)
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    this.material = new THREE.PointsMaterial({
      size: this.reduced ? 0.05 : 0.05,
      map: softSprite(),
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.group.add(this.points)

    // initial layout
    this.advance(0, 0, 0, 0)
  }

  /** Compute particle y for the given time + scroll + pointer. */
  private advance(t: number, scroll: number, px: number, py: number) {
    const pos = this.positions
    const base = this.base
    const n = this.count
    const speed = 1 + scroll * 1.6
    const amp = 0.42 + scroll * 0.3

    // pointer wake (world-space)
    const wx = px * this.halfSpan * 0.9
    const wz = -this.depthSpan * 0.55 + py * 2.2
    const R2 = 2.4 * 2.4
    const sigma2 = 1.15

    for (let i = 0; i < n; i++) {
      const x = base[i * 3]
      const z = base[i * 3 + 2]

      let y =
        Math.sin(x * 0.42 + t * 0.55 * speed) * Math.cos(z * 0.5 - t * 0.42 * speed) * amp * 0.6 +
        Math.sin((x + z) * 0.26 - t * 0.34 * speed) * amp * 0.55 +
        Math.sin(x * 0.11 + z * 0.2 + t * 0.2 * speed) * amp * 0.5

      const dx = x - wx
      const dz = z - wz
      const d2 = dx * dx + dz * dz
      if (d2 < R2) y += 0.7 * Math.exp(-d2 / (2 * sigma2))

      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
    }
    this.geometry.attributes.position.needsUpdate = true
  }

  private lastRender = 0

  private frame = () => {
    if (this.disposed || !this.running) return
    this.raf = requestAnimationFrame(this.frame)
    const t = this.clock.getElapsedTime()

    // Smooth ~35-40fps pacing to keep CPU and GPU cool (prevents laptop fans from spinning up)
    if (t - this.lastRender < 0.026) return
    this.lastRender = t

    // smooth interaction
    this.pointer.lerp(this.tPointer, 0.045)
    this.scroll += (this.tScroll - this.scroll) * 0.05

    this.advance(t, this.scroll, this.pointer.x, this.pointer.y)

    // parallax + scroll drift
    this.group.rotation.y = this.pointer.x * 0.06
    this.group.rotation.x = -this.pointer.y * 0.04
    this.camera.position.set(0, 3.6 - this.scroll * 1.6, 9.2 - this.scroll * 2.2)
    this.camera.lookAt(0, 0.2 - this.scroll * 0.4, -this.depthSpan * 0.5)

    this.renderer.render(this.scene, this.camera)

    // adaptive downscale if the frame budget is blown
    if (!this.downscaled) {
      this.frames++
      this.cost += this.clock.getDelta() * 1000 + 0.001
      if (this.frames >= 50) {
        const avg = this.cost / this.frames
        if (avg > 26) {
          this.downscaled = true
          this.renderer.setPixelRatio(Math.min(this.renderer.getPixelRatio(), 1))
          this.downscaleCount()
        }
        this.frames = 0
        this.cost = 0
      }
    }
  }

  private downscaleCount() {
    // rebuild at ~60% density
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.count = Math.round(this.idealCount(w, h) * 0.6)
    this.build(w, h)
  }

  private renderOnce() {
    this.advance(0, 0, 0, 0)
    this.camera.position.set(0, 3.6, 9.2)
    this.camera.lookAt(0, 0.2, -this.depthSpan * 0.5)
    this.renderer.render(this.scene, this.camera)
  }

  private onResize() {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    if (this.reduced) this.renderOnce()
  }

  private start() {
    if (this.running || this.disposed || this.reduced) return
    this.running = true
    this.clock.start()
    this.raf = requestAnimationFrame(this.frame)
  }

  private pause() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  /** Pointer position in normalized space, x/y ∈ [-1, 1]. */
  setPointer(x: number, y: number) {
    this.tPointer.set(x, y)
    if (this.reduced) {
      // still give a static parallax hint under reduced motion
      this.pointer.set(x, y)
      this.group.rotation.y = x * 0.06
      this.group.rotation.x = -y * 0.04
      this.renderOnce()
    }
  }

  /** Scroll progress 0..1 across the whole page. */
  setScroll(p: number) {
    this.tScroll = Math.max(0, Math.min(1, p))
  }

  dispose() {
    this.disposed = true
    this.pause()
    this.ro.disconnect()
    document.removeEventListener('visibilitychange', this.onVis)
    this.geometry?.dispose()
    this.material?.dispose()
    this.material?.map?.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
