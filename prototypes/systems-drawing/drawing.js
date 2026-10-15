// Three.js drawing for content illustrations (D-016): technical drawings. An orthographic
// camera, 1px ink strokes, faces filled with the box's tone, no lighting or shading. Strokes
// draw like the grid's lines, with the same violet tip riding their end. Colours are tokens,
// read in the box and re-read on a theme change; they are switched, never tweened.

import {
  WebGLRenderer,
  Color,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
  Shape,
  ShapeGeometry,
} from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { glowAt } from './grid.js'
import './motion.css'

// ---------- Colours ----------

// The tokens a drawing uses, resolved in `el` (the box, so --box-fill is its tone).
export function readPalette(el) {
  const probe = document.createElement('i')
  probe.style.cssText = 'position:absolute;visibility:hidden'
  el.append(probe)
  const read = (value) => {
    probe.style.color = value
    return new Color(getComputedStyle(probe).color)
  }
  const palette = {
    ink: read('var(--text)'),
    accent: read('var(--accent)'),
    fill: read('var(--box-fill, var(--surface))'),
  }
  probe.remove()
  return palette
}

// Calls back after the theme changes (the visitor's pick, or the system's).
export function onTheme(callback) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const system = matchMedia('(prefers-color-scheme: dark)')
  system.addEventListener('change', callback)
  return () => {
    observer.disconnect()
    system.removeEventListener('change', callback)
  }
}

// The materials a drawing shares: ink and accent strokes (1 CSS px at any pixel ratio), a
// dashed ink stroke, and fills. `fade` is the tone with an opacity the timeline sets.
export function createMaterials({ dash = 3 } = {}) {
  const line = (extra) => new LineMaterial({ linewidth: 1, worldUnits: false, ...extra })
  const face = (extra) =>
    new MeshBasicMaterial({
      side: DoubleSide,
      polygonOffset: true, // strokes on a face's plane stay in front of it
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      ...extra,
    })
  const m = {
    ink: line(),
    accent: line(),
    dash: line({ dashed: true, dashSize: dash, gapSize: dash }),
    fill: face(),
    fade: face({ transparent: true }),
    solid: face(),
    accentFill: face(),
    halo: new MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }),
  }
  return {
    ...m,
    set({ ink, accent, fill }) {
      for (const k of ['ink', 'dash', 'solid']) m[k].color.copy(ink)
      for (const k of ['accent', 'accentFill', 'halo']) m[k].color.copy(accent)
      for (const k of ['fill', 'fade']) m[k].color.copy(fill)
    },
    dispose() {
      for (const mat of Object.values(m)) mat.dispose()
    },
  }
}

// ---------- Strokes ----------

// A polyline that can show any part of its length, from fraction a to b, like a pen drawing it
// (show(0, u)) or a line being taken back (show(u, 1)). update() moves its points in place
// (same count), so nothing is reallocated while it plays.
export class Stroke {
  constructor(points, material) {
    this.n = points.length - 1
    this.geometry = new LineGeometry()
    this.geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]))
    this.line = new Line2(this.geometry, material)
    this.line.frustumCulled = false
    this.line.computeLineDistances()
    this.full = new Float32Array(this.n * 6)
    this.cum = new Float32Array(this.n + 1)
    this.a = 0
    this.b = 1
    this.update(points)
  }

  update(points) {
    this.points = points
    for (let i = 0; i < this.n; i++) {
      const p = points[i]
      const q = points[i + 1]
      this.full.set([p.x, p.y, p.z, q.x, q.y, q.z], i * 6)
      this.cum[i + 1] = this.cum[i] + p.distanceTo(q)
    }
    this.length = this.cum[this.n]
    this.show(this.a, this.b, true)
  }

  show(a, b, force = false) {
    if (!force && a === this.a && b === this.b) return
    this.a = a
    this.b = b
    const A = a * this.length
    const B = b * this.length
    const start = this.geometry.attributes.instanceStart.data
    const dist = this.geometry.attributes.instanceDistanceStart?.data
    let k = 0
    for (let i = 0; i < this.n; i++) {
      const s0 = this.cum[i]
      const s1 = this.cum[i + 1]
      if (s1 <= A || s0 >= B || s1 === s0) continue
      const t0 = Math.max(0, (A - s0) / (s1 - s0))
      const t1 = Math.min(1, (B - s0) / (s1 - s0))
      for (let c = 0; c < 3; c++) {
        const p = this.full[i * 6 + c]
        const q = this.full[i * 6 + 3 + c]
        start.array[k * 6 + c] = p + (q - p) * t0
        start.array[k * 6 + 3 + c] = p + (q - p) * t1
      }
      if (dist) {
        dist.array[k * 2] = s0 + (s1 - s0) * t0
        dist.array[k * 2 + 1] = s0 + (s1 - s0) * t1
      }
      k++
    }
    this.geometry.instanceCount = k
    start.needsUpdate = true
    if (dist) dist.needsUpdate = true
    this.line.visible = k > 0
  }

  // The world point at fraction u of the length.
  pointAt(u, target = new Vector3()) {
    const s = u * this.length
    let i = 0
    while (i < this.n - 1 && this.cum[i + 1] < s) i++
    const span = this.cum[i + 1] - this.cum[i]
    const t = span ? Math.min(1, Math.max(0, (s - this.cum[i]) / span)) : 0
    const f = this.full
    target.set(
      f[i * 6] + (f[i * 6 + 3] - f[i * 6]) * t,
      f[i * 6 + 1] + (f[i * 6 + 4] - f[i * 6 + 1]) * t,
      f[i * 6 + 2] + (f[i * 6 + 5] - f[i * 6 + 2]) * t,
    )
    return this.line.localToWorld(target)
  }

  dispose() {
    this.geometry.dispose()
  }
}

// Shows a list of strokes as one pen line: u runs through them in order, by length.
// Returns the stroke and fraction the pen is at, or null when it is not moving.
export function showInTurn(strokes, u) {
  const total = strokes.reduce((sum, s) => sum + s.length, 0)
  let before = 0
  let pen = null
  for (const s of strokes) {
    const local = Math.min(1, Math.max(0, (u * total - before) / s.length))
    s.show(0, local)
    if (local > 0 && local < 1) pen = { stroke: s, u: local }
    before += s.length
  }
  return pen
}

// ---------- Faces ----------

// A flat face from 2D points (x, y) at z = 0.
export function shapeMesh(points, material) {
  return new Mesh(new ShapeGeometry(new Shape(points)), material)
}

// A planar quad (or convex polygon) from 3D points, fanned from the first.
export function polygonMesh(points, material) {
  const geometry = new BufferGeometry()
  const pos = []
  for (let i = 1; i < points.length - 1; i++) {
    for (const p of [points[0], points[i], points[i + 1]]) pos.push(p.x, p.y, p.z)
  }
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3))
  return new Mesh(geometry, material)
}

// ---------- Rendering ----------

// The CSS zoom an element is shown at: the product of its ancestors' (currentCSSZoom is not
// everywhere yet).
export function cssZoom(el) {
  if (el.currentCSSZoom) return el.currentCSSZoom
  let zoom = 1
  for (let e = el; e; e = e.parentElement) zoom *= parseFloat(getComputedStyle(e).zoom) || 1
  return zoom
}

// `zoom`: the CSS zoom the canvas is shown at (the test route enlarges boxes), so it stays sharp.
export function createRenderer(width, height, zoom = 1) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * zoom)
  renderer.setSize(width, height)
  renderer.setClearColor(0x000000, 0)
  return renderer
}

export function disposeRenderer(renderer) {
  renderer.dispose()
  renderer.forceContextLoss()
  renderer.domElement.remove()
}

// A world point to px from the top left of a width x height view.
const v = new Vector3()
export function toScreen(point, camera, width, height) {
  v.copy(point).project(camera)
  return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height]
}

// The pen tips: the grid's tip (a violet dot with a glow), one per moving stroke end, placed
// in an HTML layer over the canvas. Its opacity follows the stroke's progress as the grid's does.
export function createTips(layer) {
  const pool = []
  return {
    place(tips) {
      tips.forEach(({ x, y, u }, i) => {
        let dot = pool[i]
        if (!dot) {
          dot = pool[i] = document.createElement('i')
          dot.className = 'tip-html'
          layer.append(dot)
        }
        dot.style.transform = `translate(${x}px, ${y}px)`
        dot.style.opacity = glowAt(u)
      })
      for (let i = tips.length; i < pool.length; i++) pool[i].style.opacity = 0
    },
  }
}
