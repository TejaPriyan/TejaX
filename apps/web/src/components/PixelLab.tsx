import { useEffect, useRef, useCallback, useState } from 'react'
import type { AgentInfo, Mission } from '../lib/types'
import { AGENT_MAP, STATUS_COLOR } from '../lib/agents'
import { sound } from '../lib/sound'

/* ============================================================================
   PixelLab — 2D Autonomous AI Research Facility
   ============================================================================
   State-of-the-art Laboratory Environment:
     ✦ Two Raised Research Platforms (Bay Alpha: Discovery / Bay Beta: Engineering)
     ✦ Central Concourse Runway with glowing LED guide lights
     ✦ Quantum Nexus Magnetic Containment Circle with radial hazard sectors
     ✦ Supercomputer Server Mainframes & Cryo-Tanks along the walls
     ✦ 8 Unobstructed, fully visible 2D Agent Characters (64×80px) on glowing platforms
     ✦ Dual machine consoles & animated oscilloscopes behind each agent
     ✦ Clean typography, no text overlap, and smooth 60 FPS performance
   =========================================================================== */

interface PixelLabProps {
  mission: Mission | null
  agents: AgentInfo[]
  selectedAgentType: string | null
  onSelectAgent: (type: string | null) => void
  activeAgentType: string | null
  activeMessage: string | null
  soundEnabled: boolean
  isReplaying?: boolean
}

interface StationConfig {
  type: string
  folder: string
  idlePose: string
  workPose: string
  cheerPose: string
  stationTitle: string
  badgeColor: string
  machineTiles: string[]
}

const STATION_CONFIGS: Record<string, StationConfig> = {
  planner: {
    type: 'planner',
    folder: '/pixel/characters/male_adventurer',
    idlePose: 'character_maleAdventurer_idle.png',
    workPose: 'character_maleAdventurer_think.png',
    cheerPose: 'character_maleAdventurer_cheer0.png',
    stationTitle: 'Command Holo-Desk',
    badgeColor: '#3dd6ff',
    machineTiles: ['/pixel/tiles/tile_0024.png', '/pixel/tiles/tile_0012.png'],
  },
  researcher: {
    type: 'researcher',
    folder: '/pixel/characters/female_person',
    idlePose: 'character_femalePerson_idle.png',
    workPose: 'character_femalePerson_think.png',
    cheerPose: 'character_femalePerson_cheer0.png',
    stationTitle: 'Satellite Radar Lab',
    badgeColor: '#8b5cf6',
    machineTiles: ['/pixel/tiles/tile_0028.png', '/pixel/tiles/tile_0014.png'],
  },
  coder: {
    type: 'coder',
    folder: '/pixel/characters/robot',
    idlePose: 'character_robot_idle.png',
    workPose: 'character_robot_interact.png',
    cheerPose: 'character_robot_cheer0.png',
    stationTitle: 'Matrix Dev Rig',
    badgeColor: '#34d399',
    machineTiles: ['/pixel/tiles/tile_0025.png', '/pixel/tiles/tile_0013.png'],
  },
  tester: {
    type: 'tester',
    folder: '/pixel/characters/robot',
    idlePose: 'character_robot_idle.png',
    workPose: 'character_robot_attack1.png',
    cheerPose: 'character_robot_cheer1.png',
    stationTitle: 'Sandbox Test Cage',
    badgeColor: '#fb923c',
    machineTiles: ['/pixel/tiles/tile_0054.png', '/pixel/tiles/tile_0087.png'],
  },
  analyst: {
    type: 'analyst',
    folder: '/pixel/characters/female_adventurer',
    idlePose: 'character_femaleAdventurer_idle.png',
    workPose: 'character_femaleAdventurer_interact.png',
    cheerPose: 'character_femaleAdventurer_cheer0.png',
    stationTitle: 'Telemetry Wall',
    badgeColor: '#22d3ee',
    machineTiles: ['/pixel/tiles/tile_0027.png', '/pixel/tiles/tile_0015.png'],
  },
  memory: {
    type: 'memory',
    folder: '/pixel/characters/male_person',
    idlePose: 'character_malePerson_idle.png',
    workPose: 'character_malePerson_interact.png',
    cheerPose: 'character_malePerson_cheer0.png',
    stationTitle: 'Mainframe Vault',
    badgeColor: '#a78bfa',
    machineTiles: ['/pixel/tiles/tile_0036.png', '/pixel/tiles/tile_0037.png'],
  },
  scientist: {
    type: 'scientist',
    folder: '/pixel/characters/male_person',
    idlePose: 'character_malePerson_idle.png',
    workPose: 'character_malePerson_think.png',
    cheerPose: 'character_malePerson_cheer0.png',
    stationTitle: 'Quantum Chem Bench',
    badgeColor: '#f472b6',
    machineTiles: ['/pixel/tiles/tile_0064.png', '/pixel/tiles/tile_0066.png'],
  },
  critic: {
    type: 'critic',
    folder: '/pixel/characters/male_adventurer',
    idlePose: 'character_maleAdventurer_think.png',
    workPose: 'character_maleAdventurer_talk.png',
    cheerPose: 'character_maleAdventurer_cheer0.png',
    stationTitle: 'Security & Audit Wall',
    badgeColor: '#fbbf24',
    machineTiles: ['/pixel/tiles/tile_0026.png', '/pixel/tiles/tile_0038.png'],
  },
}

const WORLD_W = 1280
const WORLD_H = 800

interface StationPos { x: number; y: number }

const STATION_POSITIONS: Record<string, StationPos> = {
  // Top Row (Y = 270)
  planner:    { x: 200,  y: 270 },
  researcher: { x: 450,  y: 270 },
  coder:      { x: 830,  y: 270 },
  tester:     { x: 1080, y: 270 },

  // Bottom Row (Y = 620)
  analyst:    { x: 200,  y: 620 },
  memory:     { x: 450,  y: 620 },
  scientist:  { x: 830,  y: 620 },
  critic:     { x: 1080, y: 620 },
}

const CORE_POS = { x: WORLD_W / 2, y: 440 }
const HOLOGRAPH_POS = { x: WORLD_W / 2, y: 185 }

const imgCache = new Map<string, HTMLImageElement>()

function loadImg(src: string): HTMLImageElement {
  if (imgCache.has(src)) return imgCache.get(src)!
  const img = new Image()
  img.src = src
  imgCache.set(src, img)
  return img
}

function preloadAllAssets() {
  const configs = Object.values(STATION_CONFIGS)
  for (const cfg of configs) {
    loadImg(`${cfg.folder}/${cfg.idlePose}`)
    loadImg(`${cfg.folder}/${cfg.workPose}`)
    loadImg(`${cfg.folder}/${cfg.cheerPose}`)
    for (const t of cfg.machineTiles) loadImg(t)
  }
  for (let i = 0; i <= 7; i++) loadImg(`/pixel/characters/robot/character_robot_walk${i}.png`)
  loadImg('/pixel/characters/robot/character_robot_idle.png')
  loadImg('/pixel/characters/robot/character_robot_interact.png')
  loadImg('/pixel/characters/robot/character_robot_back.png')
  loadImg('/pixel/characters/robot/character_robot_side.png')
}

interface AABB { x: number; y: number; w: number; h: number }

function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

interface Particle {
  sx: number; sy: number
  ex: number; ey: number
  t: number
  speed: number
  color: string
}

export default function PixelLab({
  mission,
  agents,
  selectedAgentType,
  onSelectAgent,
  activeAgentType,
  activeMessage,
  soundEnabled,
}: PixelLabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    px: 640,
    py: 680,
    pvx: 0,
    pvy: 0,
    facing: 'down' as 'up' | 'down' | 'left' | 'right',
    walkFrame: 0,
    walkTimer: 0,
    isMoving: false,
    interactCooldown: 0,
    keys: new Set<string>(),
    tick: 0,
    particles: [] as Particle[],
    stars: Array.from({ length: 48 }, () => ({
      x: Math.random() * WORLD_W,
      y: Math.random() * 140,
      size: 1 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
      brightness: 0.3 + Math.random() * 0.7,
    })),
    nearStation: null as string | null,
    nearCore: false,
    coreHoloActive: true,
    drone: {
      x: 640,
      y: 330,
      tx: 640,
      ty: 330,
      carrying: false,
      packetColor: '#38bdf8',
    },
    mission: null as Mission | null,
    agents: [] as AgentInfo[],
    activeAgentType: null as string | null,
    activeMessage: null as string | null,
    soundEnabled: false,
    selectedAgentType: null as string | null,
  })

  const onSelectAgentRef = useRef(onSelectAgent)
  onSelectAgentRef.current = onSelectAgent

  useEffect(() => {
    const s = stateRef.current
    s.mission = mission
    s.agents = agents
    s.activeAgentType = activeAgentType
    s.activeMessage = activeMessage
    s.soundEnabled = soundEnabled
    s.selectedAgentType = selectedAgentType
  }, [mission, agents, activeAgentType, activeMessage, soundEnabled, selectedAgentType])

  const colliders = useRef<AABB[]>([])
  const [inspectedEntity, setInspectedEntity] = useState<'drone' | 'core' | null>(null)

  useEffect(() => {
    const boxes: AABB[] = []
    const wallThick = 24
    const skyH = 140

    // Room boundaries
    boxes.push({ x: 0, y: skyH - 10, w: WORLD_W, h: wallThick })
    boxes.push({ x: 0, y: WORLD_H - wallThick, w: WORLD_W, h: wallThick })
    boxes.push({ x: 0, y: 0, w: wallThick, h: WORLD_H })
    boxes.push({ x: WORLD_W - wallThick, y: 0, w: wallThick, h: WORLD_H })

    // Workstation colliders
    for (const [, pos] of Object.entries(STATION_POSITIONS)) {
      boxes.push({ x: pos.x - 70, y: pos.y - 50, w: 140, h: 80 })
    }

    // Central Core collider
    boxes.push({ x: CORE_POS.x - 50, y: CORE_POS.y - 50, w: 100, h: 100 })

    colliders.current = boxes
  }, [])

  // Keyboard input
  useEffect(() => {
    const s = stateRef.current
    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      s.keys.add(key)
      if (key === 'e' && s.nearStation && s.interactCooldown <= 0) {
        s.interactCooldown = 25
        setInspectedEntity(null)
        onSelectAgentRef.current(s.nearStation)
        if (s.soundEnabled) sound.play('task')
      } else if (key === 'e' && s.nearCore && s.interactCooldown <= 0) {
        s.interactCooldown = 25
        s.coreHoloActive = !s.coreHoloActive
        setInspectedEntity((prev) => (prev === 'core' ? null : 'core'))
        if (s.soundEnabled) sound.play('holo')
      }
    }
    const onUp = (e: KeyboardEvent) => {
      s.keys.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  // Canvas click interaction
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = WORLD_W / rect.width
    const scaleY = WORLD_H / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    // 1. Check Courier Drone Bot-09 click
    const dr = stateRef.current.drone
    if (Math.hypot(mx - dr.x, my - dr.y) < 45) {
      setInspectedEntity((prev) => (prev === 'drone' ? null : 'drone'))
      if (soundEnabled) sound.play('drone')
      return
    }

    // 2. Check Quantum Nexus Core click
    if (Math.hypot(mx - CORE_POS.x, my - CORE_POS.y) < 70) {
      stateRef.current.coreHoloActive = !stateRef.current.coreHoloActive
      setInspectedEntity((prev) => (prev === 'core' ? null : 'core'))
      if (soundEnabled) sound.play('holo')
      return
    }

    // 3. Check Agent Workstation clicks
    for (const [type, pos] of Object.entries(STATION_POSITIONS)) {
      const dx = mx - pos.x
      const dy = my - pos.y
      if (Math.abs(dx) < 85 && Math.abs(dy) < 70) {
        setInspectedEntity(null)
        onSelectAgent(type)
        if (soundEnabled) sound.play('task')
        return
      }
    }

    // Deselect if clicked elsewhere on empty floor
    onSelectAgent(null)
    setInspectedEntity(null)
  }, [onSelectAgent, soundEnabled])

  // Game loop
  useEffect(() => {
    preloadAllAssets()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    let animId = 0
    const PLAYER_SPEED = 3.2
    const PLAYER_W = 26
    const PLAYER_H = 16
    const INTERACT_DIST = 135

    function update() {
      const s = stateRef.current
      s.tick++
      if (s.interactCooldown > 0) s.interactCooldown--

      let vx = 0, vy = 0
      if (s.keys.has('w') || s.keys.has('arrowup')) vy = -1
      if (s.keys.has('s') || s.keys.has('arrowdown')) vy = 1
      if (s.keys.has('a') || s.keys.has('arrowleft')) vx = -1
      if (s.keys.has('d') || s.keys.has('arrowright')) vx = 1

      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2
        vy *= Math.SQRT1_2
      }

      s.isMoving = vx !== 0 || vy !== 0

      if (s.isMoving) {
        if (Math.abs(vx) > Math.abs(vy)) {
          s.facing = vx > 0 ? 'right' : 'left'
        } else {
          s.facing = vy > 0 ? 'down' : 'up'
        }

        s.walkTimer++
        if (s.walkTimer >= 5) {
          s.walkTimer = 0
          s.walkFrame = (s.walkFrame + 1) % 8
        }
      } else {
        s.walkFrame = 0
        s.walkTimer = 0
      }

      const nx = s.px + vx * PLAYER_SPEED
      const ny = s.py + vy * PLAYER_SPEED

      const playerBox: AABB = { x: nx - PLAYER_W / 2, y: ny - PLAYER_H / 2, w: PLAYER_W, h: PLAYER_H }
      let blocked = false
      for (const c of colliders.current) {
        if (aabbOverlap(playerBox, c)) {
          blocked = true
          break
        }
      }

      if (!blocked) {
        s.px = nx
        s.py = ny
      } else {
        const boxX: AABB = { x: nx - PLAYER_W / 2, y: s.py - PLAYER_H / 2, w: PLAYER_W, h: PLAYER_H }
        let blockedX = false
        for (const c of colliders.current) {
          if (aabbOverlap(boxX, c)) { blockedX = true; break }
        }
        if (!blockedX) s.px = nx

        const boxY: AABB = { x: s.px - PLAYER_W / 2, y: ny - PLAYER_H / 2, w: PLAYER_W, h: PLAYER_H }
        let blockedY = false
        for (const c of colliders.current) {
          if (aabbOverlap(boxY, c)) { blockedY = true; break }
        }
        if (!blockedY) s.py = ny
      }

      let nearest: string | null = null
      let nearestDist = INTERACT_DIST
      for (const [type, pos] of Object.entries(STATION_POSITIONS)) {
        const dx = s.px - pos.x
        const dy = s.py - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = type
        }
      }
      s.nearStation = nearest

      // Check proximity to Quantum Core
      const cdx = s.px - CORE_POS.x
      const cdy = s.py - CORE_POS.y
      s.nearCore = Math.sqrt(cdx * cdx + cdy * cdy) < 85

      // Courier Drone Flight AI
      const drone = s.drone
      if (s.activeAgentType && STATION_POSITIONS[s.activeAgentType]) {
        const st = STATION_POSITIONS[s.activeAgentType]
        if (!drone.carrying) {
          // Fly to active agent station to collect data packet
          drone.tx = st.x
          drone.ty = st.y - 20
          const distToSt = Math.sqrt((drone.x - drone.tx) ** 2 + (drone.y - drone.ty) ** 2)
          if (distToSt < 28) {
            drone.carrying = true
            drone.packetColor = STATION_CONFIGS[s.activeAgentType]?.badgeColor || '#38bdf8'
          }
        } else {
          // Fly to Quantum Core to deposit data packet
          drone.tx = CORE_POS.x
          drone.ty = CORE_POS.y - 30
          const distToCore = Math.sqrt((drone.x - drone.tx) ** 2 + (drone.y - drone.ty) ** 2)
          if (distToCore < 28) {
            drone.carrying = false
            // Burst particles at core!
            for (let k = 0; k < 6; k++) {
              s.particles.push({
                sx: CORE_POS.x,
                sy: CORE_POS.y - 30,
                ex: CORE_POS.x + (Math.random() - 0.5) * 60,
                ey: CORE_POS.y + (Math.random() - 0.5) * 60,
                t: 0,
                speed: 0.04,
                color: drone.packetColor,
              })
            }
          }
        }
      } else {
        // Idle gentle hover patrol across central concourse
        drone.carrying = false
        drone.tx = 640 + Math.sin(s.tick * 0.03) * 60
        drone.ty = 330 + Math.cos(s.tick * 0.04) * 25
      }

      // Smooth drone velocity & easing
      drone.x += (drone.tx - drone.x) * 0.05
      drone.y += (drone.ty - drone.y) * 0.05

      // Conduit particle pulses
      if (s.activeAgentType && s.tick % 16 === 0) {
        const stPos = STATION_POSITIONS[s.activeAgentType]
        if (stPos) {
          s.particles.push({
            sx: stPos.x,
            sy: stPos.y,
            ex: CORE_POS.x,
            ey: CORE_POS.y,
            t: 0,
            speed: 0.025,
            color: STATION_CONFIGS[s.activeAgentType]?.badgeColor || '#3dd6ff',
          })
        }
      }

      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i]
        p.t += p.speed
        if (p.t >= 1) s.particles.splice(i, 1)
      }
    }

    function draw() {
      const s = stateRef.current
      const W = WORLD_W
      const H = WORLD_H
      const skyH = 140

      ctx.clearRect(0, 0, W, H)

      // =====================================================================
      // LAYER 0: Space / Megacity Observation Deck (Top Panorama)
      // =====================================================================
      const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH)
      skyGrad.addColorStop(0, '#020510')
      skyGrad.addColorStop(0.5, '#071026')
      skyGrad.addColorStop(1, '#0e1c3d')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, skyH)

      // Twinkling Stars
      for (const star of s.stars) {
        const twinkle = Math.sin(s.tick * 0.04 + star.twinkleOffset)
        const alpha = Math.max(0.15, star.brightness + twinkle * 0.35)
        ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), Math.ceil(star.size), Math.ceil(star.size))
      }

      // Distant Cyberpunk Skyline
      ctx.fillStyle = '#0b1329'
      const buildings = [
        { x: 30, w: 45, h: 70 }, { x: 85, w: 60, h: 100 }, { x: 155, w: 40, h: 55 },
        { x: 210, w: 75, h: 85 }, { x: 295, w: 50, h: 70 }, { x: 360, w: 65, h: 110 },
        { x: 440, w: 45, h: 60 }, { x: 500, w: 80, h: 95 }, { x: 595, w: 50, h: 75 },
        { x: 660, w: 70, h: 115 }, { x: 745, w: 45, h: 65 }, { x: 810, w: 75, h: 90 },
        { x: 900, w: 60, h: 105 }, { x: 975, w: 45, h: 60 }, { x: 1035, w: 85, h: 85 },
        { x: 1135, w: 50, h: 75 }, { x: 1200, w: 60, h: 100 },
      ]
      for (const b of buildings) {
        ctx.fillRect(b.x, skyH - b.h, b.w, b.h)
      }

      // Skyline Neon Windows
      const winColors = ['#38bdf8', '#fbbf24', '#f472b6', '#34d399', '#a78bfa']
      for (const b of buildings) {
        for (let wy = skyH - b.h + 8; wy < skyH - 6; wy += 10) {
          for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 8) {
            const flicker = Math.sin(s.tick * 0.03 + wx * 0.15 + wy * 0.2) > -0.2
            if (flicker) {
              ctx.fillStyle = winColors[Math.floor((wx + wy) * 0.4) % winColors.length]
              ctx.globalAlpha = 0.7 + 0.3 * Math.sin(s.tick * 0.05 + wx)
              ctx.fillRect(wx, wy, 4, 3)
            }
          }
        }
      }
      ctx.globalAlpha = 1

      // Reinforced Window Struts & Cross-beams
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 0, 18, skyH)
      ctx.fillRect(W - 18, 0, 18, skyH)
      ctx.fillRect(18, skyH - 12, W - 36, 12)

      // Glass Reflection Gradient
      const glassReflect = ctx.createLinearGradient(0, 0, W, skyH)
      glassReflect.addColorStop(0.2, 'rgba(56, 189, 248, 0.08)')
      glassReflect.addColorStop(0.3, 'rgba(56, 189, 248, 0.0)')
      glassReflect.addColorStop(0.6, 'rgba(139, 92, 246, 0.06)')
      glassReflect.addColorStop(0.7, 'rgba(139, 92, 246, 0.0)')
      ctx.fillStyle = glassReflect
      ctx.fillRect(18, 0, W - 36, skyH - 12)

      // Orbital HUD Telemetry on Window Glass
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)'
      ctx.font = '8px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('ORBITAL TELEMETRY // ALT: 418 KM  VEL: 7.66 KM/S  SECTOR 09', 28, skyH - 18)

      // Warning hazard transition stripe
      for (let hx = 0; hx < W; hx += 16) {
        ctx.fillStyle = (Math.floor(hx / 8) % 2 === 0) ? '#d97706' : '#0f172a'
        ctx.fillRect(hx, skyH - 4, 8, 4)
      }

      // =====================================================================
      // LAYER 1: High-Tech Cyber Deck Flooring (HEXAGONAL COMPOSITE TILES - NO PLAIN SQUARES!)
      // =====================================================================
      const floorGrad = ctx.createLinearGradient(0, skyH, 0, H)
      floorGrad.addColorStop(0, '#060b18')
      floorGrad.addColorStop(0.5, '#040813')
      floorGrad.addColorStop(1, '#02040a')
      ctx.fillStyle = floorGrad
      ctx.fillRect(0, skyH, W, H - skyH)

      // Hexagonal Honeycomb Deck Plate Matrix (Radius 28px, interlocking tech cells)
      const hexR = 28
      const hexH = Math.sqrt(3) * hexR
      const hexW = hexR * 1.5
      ctx.lineWidth = 1

      for (let row = 0, y = skyH + 10; y < H + hexR; row++, y += hexH / 2) {
        const xOffset = (row % 2 === 1) ? hexW : 0
        for (let x = -hexR + xOffset; x < W + hexR * 2; x += hexW * 2) {
          // Draw regular hexagon plate
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3
            const hx = x + hexR * Math.cos(angle)
            const hy = y + hexR * Math.sin(angle)
            if (i === 0) ctx.moveTo(hx, hy)
            else ctx.lineTo(hx, hy)
          }
          ctx.closePath()

          // Hex fill with subtle metallic shading
          const isHighlight = (row + Math.floor(x / hexW)) % 5 === 0
          ctx.fillStyle = isHighlight ? '#081126' : '#050a16'
          ctx.fill()

          // Beveled hexagon seam
          ctx.strokeStyle = isHighlight ? 'rgba(56, 189, 248, 0.12)' : 'rgba(30, 41, 59, 0.5)'
          ctx.stroke()

          // Center micro-rivet on select tiles
          if ((row + Math.floor(x / hexW)) % 3 === 0) {
            ctx.fillStyle = 'rgba(100, 116, 139, 0.35)'
            ctx.fillRect(x - 1, y - 1, 2, 2)
          }
        }
      }

      // =====================================================================
      // LAYER 2: Dedicated Raised Research Platforms (Bay Alpha & Bay Beta)
      // =====================================================================
      // Helper function to draw an animated 3-blade industrial cooling fan
      const drawCoolingFan = (fx: number, fy: number, fanColor: string) => {
        // Outer circular bezel
        ctx.fillStyle = '#020612'
        ctx.beginPath()
        ctx.arc(fx, fy, 26, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 2
        ctx.stroke()

        // Fan intake ring
        ctx.strokeStyle = `${fanColor}44`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(fx, fy, 22, 0, Math.PI * 2)
        ctx.stroke()

        // Rotating fan blades
        const fanAngle = s.tick * 0.08
        ctx.fillStyle = `${fanColor}bb`
        for (let b = 0; b < 3; b++) {
          const ba = fanAngle + (b * Math.PI * 2) / 3
          ctx.beginPath()
          ctx.moveTo(fx, fy)
          ctx.arc(fx, fy, 19, ba - 0.25, ba + 0.25)
          ctx.closePath()
          ctx.fill()
        }

        // Center hub
        ctx.fillStyle = '#334155'
        ctx.beginPath()
        ctx.arc(fx, fy, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = fanColor
        ctx.beginPath()
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2)
        ctx.fill()

        // Protective wire mesh grille over fan
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(fx - 24, fy); ctx.lineTo(fx + 24, fy)
        ctx.moveTo(fx, fy - 24); ctx.lineTo(fx, fy + 24)
        ctx.moveTo(fx - 17, fy - 17); ctx.lineTo(fx + 17, fy + 17)
        ctx.moveTo(fx - 17, fy + 17); ctx.lineTo(fx + 17, fy - 17)
        ctx.stroke()
      }

      // ---------------------------------------------------------------------
      // 1. BAY ALPHA PLATFORM (Left: Strategy, Discovery & Telemetry)
      // ---------------------------------------------------------------------
      const bayAW = 476
      const bayAH = 565
      const bayAX = 68
      const bayAY = 158

      // Drop shadow for elevated height
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      ctx.fillRect(bayAX + 8, bayAY + 8, bayAW, bayAH)

      // Raised carbon deck surface
      const bayAGrad = ctx.createLinearGradient(bayAX, bayAY, bayAX + bayAW, bayAY + bayAH)
      bayAGrad.addColorStop(0, '#0c1833')
      bayAGrad.addColorStop(0.5, '#071024')
      bayAGrad.addColorStop(1, '#040b1a')
      ctx.fillStyle = bayAGrad
      ctx.fillRect(bayAX, bayAY, bayAW, bayAH)

      // Sub-floor cooling grates with animated cyan fans in Bay Alpha
      drawCoolingFan(bayAX + 120, bayAY + 285, '#38bdf8')
      drawCoolingFan(bayAX + 360, bayAY + 285, '#38bdf8')

      // Internal circuit traces embedded in Bay Alpha floor
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(bayAX + 40, bayAY + 40)
      ctx.lineTo(bayAX + bayAW - 40, bayAY + 40)
      ctx.lineTo(bayAX + bayAW - 40, bayAY + bayAH - 40)
      ctx.lineTo(bayAX + 40, bayAY + bayAH - 40)
      ctx.closePath()
      ctx.stroke()

      // Cross-connect data buslines between left stations
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(200, 270); ctx.lineTo(450, 270)
      ctx.moveTo(200, 620); ctx.lineTo(450, 620)
      ctx.moveTo(200, 270); ctx.lineTo(200, 620)
      ctx.moveTo(450, 270); ctx.lineTo(450, 620)
      ctx.stroke()

      // Illuminated Cyan Deck Trim
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2.5
      ctx.strokeRect(bayAX, bayAY, bayAW, bayAH)

      // Glowing outer pulse aura around Bay Alpha
      const alphaPulse = 0.2 + 0.15 * Math.sin(s.tick * 0.05)
      ctx.strokeStyle = `rgba(56, 189, 248, ${alphaPulse})`
      ctx.lineWidth = 7
      ctx.strokeRect(bayAX - 3, bayAY - 3, bayAW + 6, bayAH + 6)

      // Corner heavy-duty reinforcement brackets with bolts
      const bracketSize = 16
      ctx.fillStyle = '#38bdf8'
      // Top-Left
      ctx.fillRect(bayAX - 3, bayAY - 3, bracketSize, 4)
      ctx.fillRect(bayAX - 3, bayAY - 3, 4, bracketSize)
      // Top-Right
      ctx.fillRect(bayAX + bayAW - bracketSize + 3, bayAY - 3, bracketSize, 4)
      ctx.fillRect(bayAX + bayAW - 1, bayAY - 3, 4, bracketSize)
      // Bottom-Left
      ctx.fillRect(bayAX - 3, bayAY + bayAH - 1, bracketSize, 4)
      ctx.fillRect(bayAX - 3, bayAY + bayAH - bracketSize + 3, 4, bracketSize)
      // Bottom-Right
      ctx.fillRect(bayAX + bayAW - bracketSize + 3, bayAY + bayAH - 1, bracketSize, 4)
      ctx.fillRect(bayAX + bayAW - 1, bayAY + bayAH - bracketSize + 3, 4, bracketSize)

      // Bay Alpha Stenciled Floor Typography
      ctx.font = 'bold 12px monospace'
      ctx.fillStyle = 'rgba(56, 189, 248, 0.65)'
      ctx.textAlign = 'left'
      ctx.fillText('⬡ BAY ALPHA // STRATEGY & NEURAL DISCOVERY', bayAX + 16, bayAY + 22)
      ctx.font = '9px monospace'
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'
      ctx.fillText('SECTOR: α-01 // COGNITIVE LABS · LEVEL 5 CLEARANCE', bayAX + 16, bayAY + 34)

      // ---------------------------------------------------------------------
      // 2. BAY BETA PLATFORM (Right: Engineering, Synthesis & Audit)
      // ---------------------------------------------------------------------
      const bayBW = 476
      const bayBH = 565
      const bayBX = 736
      const bayBY = 158

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      ctx.fillRect(bayBX + 8, bayBY + 8, bayBW, bayBH)

      // Raised carbon deck surface
      const bayBGrad = ctx.createLinearGradient(bayBX, bayBY, bayBX + bayBW, bayBY + bayBH)
      bayBGrad.addColorStop(0, '#0c2420')
      bayBGrad.addColorStop(0.5, '#061714')
      bayBGrad.addColorStop(1, '#030d0b')
      ctx.fillStyle = bayBGrad
      ctx.fillRect(bayBX, bayBY, bayBW, bayBH)

      // Sub-floor cooling grates with animated emerald fans in Bay Beta
      drawCoolingFan(bayBX + 120, bayBY + 285, '#34d399')
      drawCoolingFan(bayBX + 360, bayBY + 285, '#34d399')

      // Internal circuit traces embedded in Bay Beta floor
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(bayBX + 40, bayBY + 40)
      ctx.lineTo(bayBX + bayBW - 40, bayBY + 40)
      ctx.lineTo(bayBX + bayBW - 40, bayBY + bayBH - 40)
      ctx.lineTo(bayBX + 40, bayBY + bayBH - 40)
      ctx.closePath()
      ctx.stroke()

      // Cross-connect data buslines between right stations
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(830, 270); ctx.lineTo(1080, 270)
      ctx.moveTo(830, 620); ctx.lineTo(1080, 620)
      ctx.moveTo(830, 270); ctx.lineTo(830, 620)
      ctx.moveTo(1080, 270); ctx.lineTo(1080, 620)
      ctx.stroke()

      // Illuminated Emerald Deck Trim
      ctx.strokeStyle = '#34d399'
      ctx.lineWidth = 2.5
      ctx.strokeRect(bayBX, bayBY, bayBW, bayBH)

      // Glowing outer pulse aura around Bay Beta
      const betaPulse = 0.2 + 0.15 * Math.sin(s.tick * 0.05 + 1)
      ctx.strokeStyle = `rgba(52, 211, 153, ${betaPulse})`
      ctx.lineWidth = 7
      ctx.strokeRect(bayBX - 3, bayBY - 3, bayBW + 6, bayBH + 6)

      // Corner heavy-duty reinforcement brackets with bolts
      ctx.fillStyle = '#34d399'
      // Top-Left
      ctx.fillRect(bayBX - 3, bayBY - 3, bracketSize, 4)
      ctx.fillRect(bayBX - 3, bayBY - 3, 4, bracketSize)
      // Top-Right
      ctx.fillRect(bayBX + bayBW - bracketSize + 3, bayBY - 3, bracketSize, 4)
      ctx.fillRect(bayBX + bayBW - 1, bayBY - 3, 4, bracketSize)
      // Bottom-Left
      ctx.fillRect(bayBX - 3, bayBY + bayBH - 1, bracketSize, 4)
      ctx.fillRect(bayBX - 3, bayBY + bayBH - bracketSize + 3, 4, bracketSize)
      // Bottom-Right
      ctx.fillRect(bayBX + bayBW - bracketSize + 3, bayBY + bayBH - 1, bracketSize, 4)
      ctx.fillRect(bayBX + bayBW - 1, bayBY + bayBH - bracketSize + 3, 4, bracketSize)

      // Bay Beta Stenciled Floor Typography
      ctx.font = 'bold 12px monospace'
      ctx.fillStyle = 'rgba(52, 211, 153, 0.65)'
      ctx.textAlign = 'right'
      ctx.fillText('BAY BETA // QUANTUM SYNTHESIS & AUDIT ⬢', bayBX + bayBW - 16, bayBY + 22)
      ctx.font = '9px monospace'
      ctx.fillStyle = 'rgba(52, 211, 153, 0.35)'
      ctx.fillText('SECTOR: β-02 // NEURAL EXECUTION & VALIDATION', bayBX + bayBW - 16, bayBY + 34)

      // =====================================================================
      // LAYER 3: Central Concourse Runway & Guide Lights
      // =====================================================================
      const runX = 548
      const runW = 184

      // Runway obsidian surface
      ctx.fillStyle = '#03050c'
      ctx.fillRect(runX, skyH, runW, H - skyH - 24)

      // Dual High-Voltage Caution Borders (Yellow/Black angled industrial hazard stripes)
      const drawHazardStripe = (hx: number) => {
        for (let hy = skyH; hy < H - 24; hy += 12) {
          const isYellow = Math.floor(hy / 12) % 2 === 0
          ctx.fillStyle = isYellow ? '#eab308' : '#0f172a'
          ctx.beginPath()
          ctx.moveTo(hx, hy)
          ctx.lineTo(hx + 6, hy + 4)
          ctx.lineTo(hx + 6, hy + 12)
          ctx.lineTo(hx, hy + 8)
          ctx.closePath()
          ctx.fill()
        }
      }
      drawHazardStripe(runX - 6)
      drawHazardStripe(runX + runW)

      // Illuminated Runway Edge Guide Strips
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(runX, skyH); ctx.lineTo(runX, H - 24)
      ctx.moveTo(runX + runW, skyH); ctx.lineTo(runX + runW, H - 24)
      ctx.stroke()

      // Runway In-Floor Directional LED Navigation Beacons
      for (let ly = skyH + 20; ly < H - 40; ly += 32) {
        // Skip zone right near the reactor core
        if (Math.abs(ly - CORE_POS.y) > 95) {
          const beaconPulse = 0.4 + 0.6 * Math.sin(s.tick * 0.12 - ly * 0.04)
          ctx.fillStyle = `rgba(56, 189, 248, ${beaconPulse})`

          // Directional Chevron Arrow pointing north toward Nexus
          ctx.beginPath()
          ctx.moveTo(640, ly - 5)
          ctx.lineTo(648, ly + 3)
          ctx.lineTo(644, ly + 3)
          ctx.lineTo(640, ly - 1)
          ctx.lineTo(636, ly + 3)
          ctx.lineTo(632, ly + 3)
          ctx.closePath()
          ctx.fill()
        }
      }

      // =====================================================================
      // LAYER 4: Quantum Core Magnetic Containment Basin (Floor Graphics)
      // =====================================================================
      const qx = CORE_POS.x
      const qy = CORE_POS.y

      // Ambient radial energy glow from the core onto the surrounding floor plates
      const coreFloorGlow = ctx.createRadialGradient(qx, qy, 20, qx, qy, 160)
      coreFloorGlow.addColorStop(0, 'rgba(56, 189, 248, 0.18)')
      coreFloorGlow.addColorStop(0.5, 'rgba(52, 211, 153, 0.08)')
      coreFloorGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = coreFloorGlow
      ctx.beginPath()
      ctx.arc(qx, qy, 160, 0, Math.PI * 2)
      ctx.fill()

      // Outer Octagonal Containment Rim
      const octR = 120
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let oi = 0; oi < 8; oi++) {
        const ang = (oi * Math.PI * 2) / 8 + Math.PI / 8
        const ox = qx + octR * Math.cos(ang)
        const oy = qy + octR * Math.sin(ang)
        if (oi === 0) ctx.moveTo(ox, oy)
        else ctx.lineTo(ox, oy)
      }
      ctx.closePath()
      ctx.stroke()

      // Radial Heat Dissipation Exhaust Slots around reactor
      for (let vi = 0; vi < 8; vi++) {
        const ang = (vi * Math.PI * 2) / 8
        const x1 = qx + 92 * Math.cos(ang)
        const y1 = qy + 92 * Math.sin(ang)
        const x2 = qx + 114 * Math.cos(ang)
        const y2 = qy + 114 * Math.sin(ang)
        ctx.strokeStyle = '#eab308'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      // Rotating Magnetic Flux Containment Ring (Radius: 82px)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(qx, qy, 82, 0, Math.PI * 2)
      ctx.stroke()

      // Radial Magnetic Flux Teeth (16 notches rotating gently)
      const notchOffset = s.tick * 0.015
      for (let ai = 0; ai < 16; ai++) {
        const ang = (ai * Math.PI * 2) / 16 + notchOffset
        const x1 = qx + Math.cos(ang) * 82
        const y1 = qy + Math.sin(ang) * 82
        const x2 = qx + Math.cos(ang) * 90
        const y2 = qy + Math.sin(ang) * 90
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      // Inner Containment Well Bevel (Radius: 62px)
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(qx, qy, 62, 0, Math.PI * 2)
      ctx.stroke()

      // =====================================================================
      // LAYER 5: Perimeter Server Towers & Cryo Racks (Left & Right Walls)
      // =====================================================================
      // 1. LEFT WALL: Supercomputer Mainframe Blade Towers
      ctx.fillStyle = '#0a0f1d'
      ctx.fillRect(0, skyH, 26, H - skyH - 24)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.5
      ctx.strokeRect(0, skyH, 26, H - skyH - 24)

      // Blinking Server Blade LEDs on Left Wall
      for (let sy = skyH + 10; sy < H - 40; sy += 16) {
        ctx.fillStyle = '#020617'
        ctx.fillRect(4, sy, 18, 11)
        const ledOn1 = Math.sin(s.tick * 0.12 + sy) > 0
        const ledOn2 = Math.cos(s.tick * 0.16 + sy) > 0
        ctx.fillStyle = ledOn1 ? '#34d399' : '#064e3b'
        ctx.fillRect(6, sy + 3, 3, 3)
        ctx.fillStyle = ledOn2 ? '#38bdf8' : '#0369a1'
        ctx.fillRect(11, sy + 3, 3, 3)
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(16, sy + 3, 3, 3)
      }

      // 2. RIGHT WALL: Cryo-Storage Containment Tanks & Plasma Conduits
      ctx.fillStyle = '#0a0f1d'
      ctx.fillRect(W - 26, skyH, 26, H - skyH - 24)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.5
      ctx.strokeRect(W - 26, skyH, 26, H - skyH - 24)

      for (let cy = skyH + 12; cy < H - 40; cy += 34) {
        // Cylindrical tank window with bubbling cyan liquid
        ctx.fillStyle = '#020617'
        ctx.fillRect(W - 22, cy, 18, 26)
        const liquidH = 12 + 8 * Math.sin(s.tick * 0.06 + cy)
        ctx.fillStyle = '#38bdf8'
        ctx.fillRect(W - 20, cy + 26 - liquidH, 14, liquidH)

        // Floating bubbles in coolant
        const bubbleY = cy + 24 - ((s.tick * 0.8 + cy) % liquidH)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(W - 14, bubbleY, 2, 2)

        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 1
        ctx.strokeRect(W - 22, cy, 18, 26)
      }

      // =====================================================================
      // LAYER 6: Orthogonal Data Conduits & Bus Cables
      // =====================================================================
      for (const [type, pos] of Object.entries(STATION_POSITIONS)) {
        const cfg = STATION_CONFIGS[type]
        const isActive = s.activeAgentType === type
        const isSelected = s.selectedAgentType === type

        ctx.strokeStyle = isActive ? cfg.badgeColor : isSelected ? '#ffffff' : 'rgba(100, 116, 139, 0.35)'
        ctx.lineWidth = isActive ? 3 : isSelected ? 2 : 1.5

        if (isActive) {
          ctx.setLineDash([8, 4])
          ctx.lineDashOffset = -s.tick * 2.5
        } else {
          ctx.setLineDash([])
        }

        const isUpper = pos.y < CORE_POS.y
        const midY = isUpper ? 360 : 530

        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(pos.x, midY)
        ctx.lineTo(CORE_POS.x, midY)
        ctx.lineTo(CORE_POS.x, CORE_POS.y)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = isActive ? cfg.badgeColor : '#334155'
        ctx.fillRect(pos.x - 3, midY - 3, 6, 6)
      }

      // Energy particles along conduits
      for (const p of s.particles) {
        const isUpper = p.sy < p.ey
        const midY = isUpper ? 360 : 530

        let px: number, py: number
        if (p.t < 0.33) {
          const subT = p.t / 0.33
          px = p.sx
          py = p.sy + (midY - p.sy) * subT
        } else if (p.t < 0.66) {
          const subT = (p.t - 0.33) / 0.33
          px = p.sx + (p.ex - p.sx) * subT
          py = midY
        } else {
          const subT = (p.t - 0.66) / 0.34
          px = p.ex
          py = midY + (p.ey - midY) * subT
        }

        ctx.fillStyle = p.color
        ctx.fillRect(Math.floor(px) - 3, Math.floor(py) - 3, 7, 7)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(Math.floor(px) - 1, Math.floor(py) - 1, 3, 3)
      }

      // =====================================================================
      // LAYER 7: Workstations & 2D Agent Characters (100% UNBLOCKED & VISIBLE)
      // =====================================================================
      for (const [type, pos] of Object.entries(STATION_POSITIONS)) {
        const cfg = STATION_CONFIGS[type]
        const agentInfo = s.agents.find(a => a.type === type)
        const isActive = s.activeAgentType === type
        const isSelected = s.selectedAgentType === type
        const isCompleted = s.mission?.status === 'COMPLETED'
        const meta = AGENT_MAP[type as keyof typeof AGENT_MAP]

        // 1. BACKGROUND CONSOLE (Behind the agent)
        const consoleW = 144
        const consoleH = 68
        const cx = pos.x - consoleW / 2
        const cy = pos.y - 52

        // Console shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
        ctx.fillRect(cx + 4, cy + 4, consoleW, consoleH)

        // Console body
        ctx.fillStyle = isActive ? '#0e182f' : isSelected ? '#121d36' : '#0a0f1d'
        ctx.fillRect(cx, cy, consoleW, consoleH)

        // Console border & accent light strip
        ctx.strokeStyle = isActive ? cfg.badgeColor : isSelected ? '#ffffff' : '#334155'
        ctx.lineWidth = isActive ? 2 : 1
        ctx.strokeRect(cx, cy, consoleW, consoleH)

        ctx.fillStyle = cfg.badgeColor
        ctx.fillRect(cx, cy, consoleW, 3)

        // Machine displays on the console
        const m1 = loadImg(cfg.machineTiles[0])
        const m2 = loadImg(cfg.machineTiles[1])
        if (m1.complete && m1.naturalWidth) ctx.drawImage(m1, cx + 8, cy + 8, 38, 38)
        if (m2.complete && m2.naturalWidth) ctx.drawImage(m2, cx + consoleW - 46, cy + 8, 38, 38)

        // Oscilloscope in center of console
        const oscX = cx + 52
        const oscY = cy + 10
        const oscW = 40
        const oscH = 34
        ctx.fillStyle = '#050914'
        ctx.fillRect(oscX, oscY, oscW, oscH)
        ctx.strokeStyle = cfg.badgeColor
        ctx.lineWidth = 1
        ctx.strokeRect(oscX, oscY, oscW, oscH)

        ctx.strokeStyle = isActive ? '#34d399' : cfg.badgeColor
        ctx.lineWidth = 1.2
        ctx.beginPath()
        for (let wx = 0; wx < oscW; wx += 2) {
          const wy = oscY + oscH / 2 + Math.sin((s.tick * 0.15) + (wx * 0.35)) * (isActive ? 10 : 4)
          if (wx === 0) ctx.moveTo(oscX + wx, wy)
          else ctx.lineTo(oscX + wx, wy)
        }
        ctx.stroke()

        // 2. GLOWING FLOOR HOLOGRAPHIC DISC (Platform)
        const discY = pos.y + 24
        const glowGrad = ctx.createRadialGradient(pos.x, discY, 5, pos.x, discY, 48)
        glowGrad.addColorStop(0, `${cfg.badgeColor}77`)
        glowGrad.addColorStop(0.6, `${cfg.badgeColor}22`)
        glowGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.ellipse(pos.x, discY, 48, 16, 0, 0, Math.PI * 2)
        ctx.fill()

        // Outer cyber ring
        ctx.strokeStyle = isActive ? cfg.badgeColor : `${cfg.badgeColor}88`
        ctx.lineWidth = isActive ? 2.5 : 1.5
        ctx.beginPath()
        ctx.ellipse(pos.x, discY, 38, 13, 0, 0, Math.PI * 2)
        ctx.stroke()

        // Inner targeting ring
        ctx.strokeStyle = `${cfg.badgeColor}44`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(pos.x, discY, 22, 7, 0, 0, Math.PI * 2)
        ctx.stroke()

        // Directional alignment notches (4 cardinal points)
        ctx.fillStyle = cfg.badgeColor
        ctx.fillRect(pos.x - 39, discY - 1, 3, 2)
        ctx.fillRect(pos.x + 36, discY - 1, 3, 2)
        ctx.fillRect(pos.x - 1, discY - 14, 2, 3)
        ctx.fillRect(pos.x - 1, discY + 11, 2, 3)

        // 3. THE 2D CHARACTER SPRITE (100% UNBLOCKED & FULLY VISIBLE)
        const charW = 64
        const charH = 80
        const charX = pos.x - charW / 2
        const charY = pos.y - 48

        const pose = isActive ? cfg.workPose : isCompleted ? cfg.cheerPose : cfg.idlePose
        const charImg = loadImg(`${cfg.folder}/${pose}`)
        const bobY = isActive ? Math.sin(s.tick * 0.12) * 4 : Math.sin(s.tick * 0.04) * 2

        if (charImg.complete && charImg.naturalWidth) {
          ctx.drawImage(charImg, charX, charY + bobY, charW, charH)
        } else {
          ctx.fillStyle = cfg.badgeColor
          ctx.beginPath()
          ctx.arc(pos.x, charY + 20 + bobY, 14, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillRect(pos.x - 14, charY + 36 + bobY, 28, 36)
        }

        // 4. FLOATING GLYPH & STATUS TAG ABOVE HEAD
        const headTopY = charY - 14 + bobY
        ctx.fillStyle = 'rgba(6, 11, 24, 0.90)'
        ctx.fillRect(pos.x - 44, headTopY - 14, 88, 18)
        ctx.strokeStyle = cfg.badgeColor
        ctx.lineWidth = 1
        ctx.strokeRect(pos.x - 44, headTopY - 14, 88, 18)

        ctx.fillStyle = cfg.badgeColor
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${meta.glyph} ${meta.name.toUpperCase()}`, pos.x, headTopY - 2)

        // 5. ACTIVE SPEECH / THOUGHT BUBBLE
        if (isActive && s.activeMessage) {
          const fullMsg = s.activeMessage
          const maxChars = 32
          const displayMsg = fullMsg.length > maxChars ? fullMsg.slice(0, maxChars) + '…' : fullMsg
          const bubbleW = Math.max(160, Math.min(260, displayMsg.length * 6.5 + 24))
          const bubbleH = 28
          const bx = pos.x - bubbleW / 2
          const by = headTopY - 48

          ctx.fillStyle = 'rgba(10, 15, 30, 0.95)'
          ctx.fillRect(bx, by, bubbleW, bubbleH)
          ctx.strokeStyle = cfg.badgeColor
          ctx.lineWidth = 1.5
          ctx.strokeRect(bx, by, bubbleW, bubbleH)

          // Pointer
          ctx.fillStyle = cfg.badgeColor
          ctx.beginPath()
          ctx.moveTo(pos.x - 5, by + bubbleH)
          ctx.lineTo(pos.x + 5, by + bubbleH)
          ctx.lineTo(pos.x, by + bubbleH + 5)
          ctx.closePath()
          ctx.fill()

          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 9px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(displayMsg, pos.x, by + 17)
        }

        // 6. PROXIMITY [E] PROMPT
        if (s.nearStation === type) {
          const promptY = headTopY - (isActive && s.activeMessage ? 64 : 26)
          const pulse = 0.7 + 0.3 * Math.sin(s.tick * 0.12)
          ctx.globalAlpha = pulse
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
          ctx.fillRect(pos.x - 48, promptY, 96, 18)
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 1.5
          ctx.strokeRect(pos.x - 48, promptY, 96, 18)

          ctx.fillStyle = '#fbbf24'
          ctx.font = 'bold 10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('⚡ [E] INTERACT', pos.x, promptY + 13)
          ctx.globalAlpha = 1
        }

        // 7. CLEAN STATION BADGE BELOW FEET
        const plateY = pos.y + 40
        const plateW = 144
        const px = pos.x - plateW / 2
        ctx.fillStyle = '#060a14'
        ctx.fillRect(px, plateY, plateW, 28)
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 1
        ctx.strokeRect(px, plateY, plateW, 28)

        // Status beacon
        const statusColor = isActive ? '#34d399' : (agentInfo ? STATUS_COLOR[agentInfo.status] : '#64748b')
        ctx.fillStyle = statusColor
        ctx.beginPath()
        ctx.arc(px + 12, plateY + 14, 4, 0, Math.PI * 2)
        ctx.fill()

        // Line 1: Station Role
        ctx.fillStyle = '#94a3b8'
        ctx.font = '8px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(cfg.stationTitle.toUpperCase(), px + 22, plateY + 11)

        // Line 2: Status Text
        ctx.fillStyle = statusColor
        ctx.font = 'bold 9px monospace'
        ctx.fillText(agentInfo?.status || 'ONLINE', px + 22, plateY + 22)
      }

      // =====================================================================
      // LAYER 8: Central Quantum Nexus Reactor Core
      // =====================================================================
      const cx = CORE_POS.x
      const cy = CORE_POS.y

      const isMissionActive = s.mission && ['PLANNING', 'RESEARCHING', 'DEVELOPING', 'EXPERIMENTING', 'EVALUATING', 'IMPROVING'].includes(s.mission.status)
      const isCompleted = s.mission?.status === 'COMPLETED'
      const coreColor = isCompleted ? '#34d399' : isMissionActive ? '#38bdf8' : '#818cf8'

      // Outer Plasma Glow
      const outerGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 80)
      outerGlow.addColorStop(0, `${coreColor}55`)
      outerGlow.addColorStop(0.7, `${coreColor}15`)
      outerGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = outerGlow
      ctx.beginPath()
      ctx.arc(cx, cy, 80, 0, Math.PI * 2)
      ctx.fill()

      // Magnetic Containment Ring
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(cx, cy, 50, 0, Math.PI * 2)
      ctx.stroke()

      // Pulsing Energy Field
      const pulse = 0.5 + 0.5 * Math.sin(s.tick * 0.08)
      ctx.strokeStyle = coreColor
      ctx.globalAlpha = pulse
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, 47, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Inner Reactor Vessel
      ctx.fillStyle = '#060913'
      ctx.beginPath()
      ctx.arc(cx, cy, 42, 0, Math.PI * 2)
      ctx.fill()

      // Swirling Plasma
      const plasma = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40)
      plasma.addColorStop(0, '#ffffff')
      plasma.addColorStop(0.3, coreColor)
      plasma.addColorStop(0.8, `${coreColor}66`)
      plasma.addColorStop(1, 'transparent')
      ctx.fillStyle = plasma
      ctx.beginPath()
      ctx.arc(cx, cy, 40, 0, Math.PI * 2)
      ctx.fill()

      // Rotating Energy Focus Vanes
      const vaneCount = 8
      const rotSpeed = isMissionActive ? 0.04 : 0.015
      for (let vi = 0; vi < vaneCount; vi++) {
        const angle = s.tick * rotSpeed + (vi * Math.PI * 2) / vaneCount
        const vx = cx + Math.cos(angle) * 32
        const vy = cy + Math.sin(angle) * 32
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(Math.floor(vx) - 3, Math.floor(vy) - 3, 6, 6)
      }

      // Quantum Core Plate
      ctx.fillStyle = '#060913'
      ctx.fillRect(cx - 70, cy + 54, 140, 26)
      ctx.strokeStyle = coreColor
      ctx.lineWidth = 1.5
      ctx.strokeRect(cx - 70, cy + 54, 140, 26)

      ctx.fillStyle = coreColor
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('⚡ QUANTUM NEXUS', cx, cy + 66)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '8px monospace'
      ctx.fillText(
        s.mission?.currentPhase ? `PHASE: ${s.mission.currentPhase}` : 'CORE STABLE · READY',
        cx, cy + 76
      )

      // Interactive Quantum Core [E] Prompt
      if (s.nearCore) {
        const promptPulse = 0.7 + 0.3 * Math.sin(s.tick * 0.15)
        ctx.globalAlpha = promptPulse
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
        ctx.fillRect(cx - 95, cy + 86, 190, 20)
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 1.5
        ctx.strokeRect(cx - 95, cy + 86, 190, 20)
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`⚡ [E] ${s.coreHoloActive ? 'HIDE' : 'SHOW'} QUANTUM HOLO-BEAM`, cx, cy + 100)
        ctx.globalAlpha = 1
      }

      // Active Quantum Holo-Beam Projection
      if (s.coreHoloActive) {
        // Volumetric Holographic Beam
        const beamGrad = ctx.createLinearGradient(cx, cy - 20, cx, cy - 220)
        beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)')
        beamGrad.addColorStop(0.6, 'rgba(139, 92, 246, 0.16)')
        beamGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = beamGrad
        ctx.beginPath()
        ctx.moveTo(cx - 38, cy - 15)
        ctx.lineTo(cx - 90, cy - 210)
        ctx.lineTo(cx + 90, cy - 210)
        ctx.lineTo(cx + 38, cy - 15)
        ctx.closePath()
        ctx.fill()

        // Rotating Wireframe Hologram Rings
        for (let r = 0; r < 3; r++) {
          const ringY = cy - 65 - r * 45
          const rot = s.tick * 0.04 + r * 1.4
          ctx.strokeStyle = r === 1 ? '#34d399' : '#38bdf8'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.ellipse(cx, ringY, 44 + r * 10, 14 + Math.sin(rot) * 5, rot, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Floating Telemetry Readout Box
        const hBoxY = cy - 195
        ctx.fillStyle = 'rgba(6, 11, 25, 0.92)'
        ctx.fillRect(cx - 85, hBoxY, 170, 48)
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 1.2
        ctx.strokeRect(cx - 85, hBoxY, 170, 48)
        ctx.fillStyle = '#38bdf8'
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('⬡ QUANTUM CORE NEXUS', cx, hBoxY + 14)
        ctx.font = '8px monospace'
        ctx.fillStyle = '#34d399'
        ctx.fillText('THROUGHPUT: 12.8 TFLOPS', cx, hBoxY + 28)
        ctx.fillStyle = '#94a3b8'
        ctx.fillText('ACTIVE AGENTS: 8 // SYNC: 100%', cx, hBoxY + 40)
      }

      // =====================================================================
      // LAYER 9: Courier Drone Bot-09 (Autonomous Data Transporter)
      // =====================================================================
      const dr = s.drone
      const dBob = Math.sin(s.tick * 0.08) * 3
      const dx = Math.floor(dr.x)
      const dy = Math.floor(dr.y + dBob)

      // Drone shadow on floor
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.beginPath()
      ctx.ellipse(dx, dy + 28, 14, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Thruster Plasma Flame
      const flameH = 4 + Math.sin(s.tick * 0.4) * 3
      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(dx - 11, dy + 7, 3, flameH)
      ctx.fillRect(dx + 8, dy + 7, 3, flameH)

      // Drone Chassis
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(dx - 12, dy - 7, 24, 14)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 1.2
      ctx.strokeRect(dx - 12, dy - 7, 24, 14)

      // Glowing Central Visor Eye
      ctx.fillStyle = dr.carrying ? dr.packetColor : '#34d399'
      ctx.fillRect(dx - 6, dy - 2, 12, 4)

      // Drone Blinking Beacon
      const beaconBlink = Math.sin(s.tick * 0.15) > 0
      ctx.fillStyle = beaconBlink ? '#fb7185' : '#881337'
      ctx.fillRect(dx - 2, dy - 10, 4, 3)

      // Suspended Holographic Data Packet when carrying
      if (dr.carrying) {
        ctx.fillStyle = `${dr.packetColor}cc`
        ctx.fillRect(dx - 6, dy + 12, 12, 12)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.strokeRect(dx - 6, dy + 12, 12, 12)
      }

      // Drone Name Tag
      ctx.fillStyle = 'rgba(6, 11, 25, 0.85)'
      ctx.fillRect(dx - 32, dy - 22, 64, 11)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(dx - 32, dy - 22, 64, 11)
      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 7px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('🛸 BOT-09', dx, dy - 14)

      // =====================================================================
      // LAYER 10: Player Character (Robot)
      // =====================================================================
      let spriteKey: string
      if (!s.isMoving) {
        if (s.facing === 'up') spriteKey = '/pixel/characters/robot/character_robot_back.png'
        else if (s.facing === 'left' || s.facing === 'right') spriteKey = '/pixel/characters/robot/character_robot_side.png'
        else spriteKey = '/pixel/characters/robot/character_robot_idle.png'
      } else {
        spriteKey = `/pixel/characters/robot/character_robot_walk${s.walkFrame}.png`
      }

      const pImg = loadImg(spriteKey)
      const pW = 46
      const pH = 58
      const px = Math.floor(s.px - pW / 2)
      const py = Math.floor(s.py - pH + 10)

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.beginPath()
      ctx.ellipse(Math.floor(s.px), Math.floor(s.py) + 6, 16, 6, 0, 0, Math.PI * 2)
      ctx.fill()

      if (pImg.complete && pImg.naturalWidth) {
        ctx.save()
        if (s.facing === 'left') {
          ctx.translate(px + pW, py)
          ctx.scale(-1, 1)
          ctx.drawImage(pImg, 0, 0, pW, pH)
        } else {
          ctx.drawImage(pImg, px, py, pW, pH)
        }
        ctx.restore()
      } else {
        ctx.fillStyle = '#34d399'
        ctx.fillRect(px + 10, py + 10, 26, 36)
      }

      // Player Name Tag
      ctx.fillStyle = '#34d399'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('YOU (RESEARCHER)', Math.floor(s.px), py - 6)

      // =====================================================================
      // LAYER 10: Overhead Holographic Mission Terminal
      // =====================================================================
      const hx = HOLOGRAPH_POS.x
      const hy = HOLOGRAPH_POS.y
      const holoW = 340
      const holoH = 64

      ctx.fillStyle = 'rgba(6, 11, 25, 0.90)'
      ctx.fillRect(hx - holoW / 2, hy - holoH / 2, holoW, holoH)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(hx - holoW / 2, hy - holoH / 2, holoW, holoH)

      // Projector beams from ceiling
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(hx - holoW / 2 + 20, skyH)
      ctx.lineTo(hx - holoW / 2, hy - holoH / 2)
      ctx.moveTo(hx + holoW / 2 - 20, skyH)
      ctx.lineTo(hx + holoW / 2, hy - holoH / 2)
      ctx.stroke()

      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('⚡ TEJAX MISSION CONTROL NEXUS', hx, hy - 14)

      if (s.mission) {
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px monospace'
        const mTitle = s.mission.title.length > 40 ? s.mission.title.slice(0, 40) + '…' : s.mission.title
        ctx.fillText(mTitle, hx, hy + 2)

        const stColor = s.mission.status === 'COMPLETED' ? '#34d399' : s.mission.status === 'FAILED' ? '#fb7185' : '#38bdf8'
        ctx.fillStyle = stColor
        ctx.font = 'bold 9px monospace'
        ctx.fillText(`STATUS: ${s.mission.status}  |  PHASE: ${s.mission.currentPhase || 'INITIALIZING'}`, hx, hy + 18)
      } else {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '9px monospace'
        ctx.fillText('NO MISSION RUNNING · SYSTEM READY FOR LAUNCH', hx, hy + 6)
        ctx.fillText('VISIT COMMAND CENTER TO START', hx, hy + 18)
      }

      // =====================================================================
      // LAYER 11: HUD Overlay & Status Bars
      // =====================================================================
      ctx.fillStyle = 'rgba(6, 11, 24, 0.92)'
      ctx.fillRect(0, H - 24, W, 24)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, H - 24); ctx.lineTo(W, H - 24); ctx.stroke()

      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('🎮 [WASD / ARROWS] MOVE    ⚡ [E] INTERACT WITH AGENT / CORE    🛸 BOT-09 ACTIVE    🖱️ [CLICK] INSPECT', 16, H - 8)

      ctx.textAlign = 'right'
      const activeCount = s.agents.filter(a => a.status === 'ACTIVE').length
      ctx.fillStyle = activeCount > 0 ? '#34d399' : '#38bdf8'
      ctx.fillText(`LAB STATUS: ${activeCount > 0 ? `${activeCount} AGENT(S) ACTIVE` : 'ALL 8 AGENTS VISIBLE & ONLINE'}`, W - 16, H - 8)
      ctx.textAlign = 'left'
    }

    function gameLoop() {
      update()
      draw()
      animId = requestAnimationFrame(gameLoop)
    }

    animId = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div
      className="relative w-full h-full min-h-[500px] flex items-center justify-center bg-[#020410] overflow-hidden select-none"
      style={{ imageRendering: 'pixelated' }}
    >
      <canvas
        ref={canvasRef}
        width={WORLD_W}
        height={WORLD_H}
        onClick={handleCanvasClick}
        className="w-full h-full object-contain"
        style={{
          imageRendering: 'pixelated',
          cursor: 'crosshair',
        }}
        tabIndex={0}
      />

      {/* Interactive Telemetry HUD Card for Courier Drone or Quantum Nexus */}
      {inspectedEntity && (
        <div className="absolute top-6 right-6 w-80 max-w-[90vw] p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-md text-white font-mono text-xs z-30 page-enter">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {inspectedEntity === 'drone' ? '🛸' : '⚡'}
              </span>
              <div>
                <div className="font-bold text-sm tracking-wide text-cyan-300">
                  {inspectedEntity === 'drone' ? 'BOT-09 COURIER' : 'QUANTUM NEXUS'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {inspectedEntity === 'drone' ? 'Autonomous Transporter' : 'Swarm Supercomputing Core'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectedEntity(null)}
              className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          {inspectedEntity === 'drone' ? (
            <div className="space-y-2.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">STATUS</span>
                <span className="text-emerald-400 font-bold">● IN FLIGHT PATROL</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">CARGO BAY</span>
                <span className="text-cyan-300 font-bold">Genomic Vectors / Ast</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">THRUSTER LEVITATION</span>
                <span className="text-white">Sub-orbital MagLev (2.4 m/s)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">BATTERY INDUCTION</span>
                <span className="text-emerald-400 font-bold">99.4% Wireless Deck Link</span>
              </div>
              <button
                type="button"
                onClick={() => sound.play('drone')}
                className="w-full mt-2 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold transition-all"
              >
                📡 PING DRONE TELEMETRY
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">CONTAINMENT</span>
                <span className="text-cyan-400 font-bold">100% Superconducting</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">HOLO-BEAM</span>
                <span className="text-amber-400 font-bold">
                  {stateRef.current.coreHoloActive ? '● PROJECTING' : '○ STANDBY'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">COMPUTE THROUGHPUT</span>
                <span className="text-emerald-400 font-bold">12.8 TFLOPS Cross-Attention</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">THERMAL CRYO-STATE</span>
                <span className="text-purple-300">12.4 Kelvin (Liquid Helium)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  stateRef.current.coreHoloActive = !stateRef.current.coreHoloActive
                  sound.play('holo')
                }}
                className="w-full mt-2 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-all"
              >
                ⚡ TOGGLE VOLUMETRIC HOLO-BEAM
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
