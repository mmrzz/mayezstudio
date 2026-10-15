// The claim's drawing (D-016): from idea to delivery. A bulb is traced and lights up, four rays
// reach out and each draws a stage of the work (design, code, data, test), the stages fly into
// a box and the light goes: the bulb is taken back off the paper. The camera moves in on the
// box, its flaps flop open and the stages peek out over the rim. The timeline is
// claim-timeline.js; apply(values) poses one frame.
//
// The bulb and its rays are drawn on "paper": a plane that always faces the camera. The box
// lives in the world, so the camera's turn gives it depth. The camera keeps the box's foot at
// a given place on the paper. Story order runs from the start side: the bulb sits next to the
// text, the box at the far end.
//
// At rest the drawing is an SVG of the last frame (svg()), built from the same scene.

import { Scene, OrthographicCamera, Group, Mesh, Vector2, Vector3, Quaternion, Matrix4, CircleGeometry, PlaneGeometry } from 'three'
import { Stroke, showInTurn, shapeMesh, polygonMesh, toScreen } from '../../../core/drawing.js'
import { ease, clamp01 } from '../../../core/timeline.js'
import { INTRO } from '../../../config.js'
import { slashLoop } from './slash.js'

const DEG = Math.PI / 180
const DIST = 1000 // camera to the paper and the box's foot

// The drawing is designed in a 350 x 170 frame (design units, y up, x toward the start side,
// the origin in the middle) and scaled to fit its area. Shapes are kept simple: the strokes are
// thick (INTRO.claim.stroke).
export const FRAME = { width: 350, height: 170 }
const BULB = { x: 124, y: 0, r: 27 }
const BOX = { w: 100, d: 70, h: 44 }
const CARD = { size: 38, radius: 8, reach: 108, angles: [144, 168, 192, 216], inBox: 0.85 }
const TICKS = [20, 55, 90, 125, 160]
const TICK = { from: 7, length: 10 }
const FLAP = { a: [125, 165], b: [112, 158] } // degrees from closed: while the cards drop in, then fallen open
const ARC = 46 // how high a card lifts on its way into the box
// Where the stages end up, standing in the box like a hand of cards, facing the camera's
// resting angle: across (along the view), toward the camera, how far its top clears the rim,
// its tilt. Heights alternate so every stage shows.
const PEEKS = [
  [-38, -4, 28, -14],
  [-13, 2, 34, -5],
  [13, 6, 39, 5],
  [38, -2, 27, 14],
]

const v3 = (p, z = 0) => new Vector3(p.x, p.y, z)
const P = (x, y) => new Vector3(x, y, 0)
const arc = (cx, cy, rx, ry, a0, a1, n) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return new Vector3(cx + rx * Math.cos(a), cy + ry * Math.sin(a), 0)
  })
const quad = (p0, p1, p2, n) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const u = 1 - t
    return new Vector3(u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y, 0)
  })

// The glass: up the right of the neck, round the top, down the left.
function bulbGlass(r) {
  const neck = new Vector2(0.4 * r, -1.2 * r)
  const a0 = -40 * DEG
  const shoulder = new Vector2(r * Math.cos(a0), r * Math.sin(a0))
  const tangent = new Vector2(-Math.sin(a0), Math.cos(a0))
  const control = shoulder.clone().addScaledVector(tangent, -0.35 * r)
  const mirror = (p) => new Vector2(-p.x, p.y)
  return [
    ...quad(neck, control, shoulder, 10),
    ...arc(0, 0, r, r, a0, Math.PI - a0, 44).slice(1),
    ...quad(mirror(shoulder), mirror(control), mirror(neck), 10).slice(1),
  ]
}

// The base: down one side, a rounded foot, up the other.
function bulbBase(r) {
  const x = 0.4 * r
  return [new Vector3(-x, -1.2 * r, 0), ...arc(0, -1.7 * r, x, 0.28 * r, Math.PI, 2 * Math.PI, 16), new Vector3(x, -1.2 * r, 0)]
}

// A thread of the base: the front half of a ring, as open as the camera's elevation shows it.
const ring = (r, k, el) => arc(0, -1.36 * r - k * 0.2 * r, 0.4 * r, 0.4 * r * Math.sin(el * DEG), Math.PI, 2 * Math.PI, 14)

// A rounded square loop, starting at the point nearest `entry` (where its ray arrives).
function roundedSquare(half, radius, entry) {
  const c = half - radius
  const pts = []
  for (const [cx, cy, a] of [
    [c, c, 0],
    [-c, c, 90],
    [-c, -c, 180],
    [c, -c, 270],
  ]) {
    pts.push(...arc(cx, cy, radius, radius, a * DEG, (a + 90) * DEG, 6))
  }
  let start = 0
  pts.forEach((p, i) => {
    if (p.distanceToSquared(v3(entry)) < pts[start].distanceToSquared(v3(entry))) start = i
  })
  const loop = [...pts.slice(start), ...pts.slice(0, start)]
  loop.push(loop[0].clone())
  return loop
}

// The four stages, in a card's local units (the card is 38 across), a few bold strokes each.
// Code reads left to right in any direction, so none of them is mirrored.
const ICONS = [
  // Design: a pen nib.
  () => [
    [P(0, -13), P(-9, -1), P(-6, 10), P(6, 10), P(9, -1), P(0, -13)],
    [P(0, -13), P(0, -2)],
  ],
  // Code: </>
  () => [
    [P(-6, 7), P(-13, 0), P(-6, -7)],
    [P(-2.5, -9), P(2.5, 9)],
    [P(6, 7), P(13, 0), P(6, -7)],
  ],
  // Data: stacked layers.
  () => [
    [P(-12, 4), P(0, 10), P(12, 4), P(0, -2), P(-12, 4)],
    [P(-12, -3), P(0, -9), P(12, -3)],
  ],
  // Test: a check.
  () => [[P(-9, 0), P(-3, -6.5), P(10, 7)]],
]

export function createArt({ width, height, rtl, materials: m }) {
  const c = INTRO.claim
  const sx = rtl ? 1 : -1 // story runs from the start side
  const scale = Math.min(width / FRAME.width, height / FRAME.height)
  const strokeWidth = c.stroke * scale
  m.ink.linewidth = m.accent.linewidth = strokeWidth
  const camera = new OrthographicCamera(-width / 2 / scale, width / 2 / scale, height / 2 / scale, -height / 2 / scale, 1, 2 * DIST)
  const scene = new Scene()
  scene.add(camera)
  const paper = new Group()
  paper.position.z = -DIST
  camera.add(paper)

  const strokes = []
  const meshes = []
  // What the SVG at rest is made of. order: a number, or a function of whether `normal` faces
  // the camera; within an order, parts of farther `depthOf` objects come first.
  const parts = []
  const stroke = (parent, pts, mat = m.ink) => {
    const s = new Stroke(pts, mat)
    parent.add(s.line)
    strokes.push(s)
    return s
  }
  const mesh = (parent, made) => {
    parent.add(made)
    meshes.push(made)
    return made
  }
  const part = (obj, pts, kind, order, extra = {}) => parts.push({ obj, pts: typeof pts === 'function' ? pts : () => pts, kind, order, ...extra })

  // ---------- Camera: azimuth and elevation, the box's foot at (x, y) on the paper, a zoom ----------
  const back = new Vector3()
  const right = new Vector3()
  const up = new Vector3()
  const target = new Vector3()
  function aim({ az, el, x, y, zoom }) {
    const a = az * DEG * sx
    const e = el * DEG
    back.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e))
    right.set(0, 1, 0).cross(back).normalize()
    up.copy(back).cross(right)
    target.copy(right).multiplyScalar(-(sx * x) / zoom).addScaledVector(up, -y / zoom)
    camera.position.copy(target).addScaledVector(back, DIST)
    camera.up.set(0, 1, 0)
    camera.lookAt(target)
    if (camera.zoom !== zoom) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()
  }
  const facing = (normal, obj) => normal.clone().transformDirection(obj.matrixWorld).dot(back) > 1e-3
  const depth = (obj) => obj.getWorldPosition(new Vector3()).dot(back)

  // ---------- The idea: a bulb ----------
  const r = BULB.r
  const bulbAt = new Vector2(sx * BULB.x, BULB.y)
  const bulb = new Group()
  bulb.position.set(bulbAt.x, bulbAt.y, 0)
  paper.add(bulb)
  const halo = mesh(bulb, new Mesh(new CircleGeometry(r * 1.3, 48), m.halo))
  halo.position.z = -2
  const glass = stroke(bulb, bulbGlass(r))
  const base = stroke(bulb, bulbBase(r))
  const rings = [0, 1].map((k) => stroke(bulb, ring(r, k, 0)))
  let elevation = null
  const filamentLoop = slashLoop(0.95 * r, 0, -0.16 * r)
  const filament = stroke(bulb, filamentLoop.map((p) => v3(p)))
  const filamentFill = mesh(bulb, shapeMesh(filamentLoop, m.accentFill))
  // A tick grows by moving its outer end, so a burst can overshoot and settle.
  const tickAt = (deg, t) => {
    const dir = new Vector3(Math.cos(deg * DEG), Math.sin(deg * DEG), 0)
    return [dir.clone().multiplyScalar(r + TICK.from), dir.clone().multiplyScalar(r + TICK.from + TICK.length * Math.max(t, 0.01))]
  }
  const ticks = TICKS.map((deg) => stroke(bulb, tickAt(deg, 1)))
  for (const s of [glass, base, ...rings, ...ticks]) part(bulb, () => s.points, 'ink', 30)
  part(bulb, filamentLoop.map((p) => v3(p)), 'solid', 31)

  // ---------- Delivery: the box (its foot at the world's origin) ----------
  const { w, d, h } = BOX
  const box = new Group()
  scene.add(box)
  const corners = (y) => [new Vector3(w / 2, y, d / 2), new Vector3(-w / 2, y, d / 2), new Vector3(-w / 2, y, -d / 2), new Vector3(w / 2, y, -d / 2)]
  const loopOf = (pts) => [...pts, pts[0].clone()]
  const bottom = stroke(box, loopOf(corners(0)))
  const uprights = corners(0).map((p) => stroke(box, [p, p.clone().setY(h)]))
  const rim = stroke(box, loopOf(corners(h)))
  // The box is open, so the inside of its far walls shows: walls facing away are painted
  // first, the stages over them, then the walls facing the camera.
  part(box, corners(0), 'face', 10)
  const walls = [
    { pts: [new Vector3(-w / 2, 0, d / 2), new Vector3(w / 2, 0, d / 2), new Vector3(w / 2, h, d / 2), new Vector3(-w / 2, h, d / 2)], normal: new Vector3(0, 0, 1) },
    { pts: [new Vector3(w / 2, 0, -d / 2), new Vector3(-w / 2, 0, -d / 2), new Vector3(-w / 2, h, -d / 2), new Vector3(w / 2, h, -d / 2)], normal: new Vector3(0, 0, -1) },
    { pts: [new Vector3(w / 2, 0, d / 2), new Vector3(w / 2, 0, -d / 2), new Vector3(w / 2, h, -d / 2), new Vector3(w / 2, h, d / 2)], normal: new Vector3(1, 0, 0) },
    { pts: [new Vector3(-w / 2, 0, -d / 2), new Vector3(-w / 2, 0, d / 2), new Vector3(-w / 2, h, d / 2), new Vector3(-w / 2, h, -d / 2)], normal: new Vector3(-1, 0, 0) },
    { pts: corners(0), normal: new Vector3(0, -1, 0) },
  ].map((wall) => {
    if (wall.normal.y === 0) part(box, wall.pts, 'face', () => (facing(wall.normal, box) ? 18 : 10))
    return mesh(box, polygonMesh(wall.pts, m.fade))
  })

  // A flap turns on its hinge (the pivot's x axis); closed, it would lie flat toward the middle (-z).
  function flap(position, yaw, span, length, [open, spread], normal) {
    const pivot = new Group()
    pivot.position.copy(position)
    pivot.rotation.y = yaw
    box.add(pivot)
    const leaf = new Group()
    pivot.add(leaf)
    const pts = [new Vector3(-span / 2, 0, 0), new Vector3(-span / 2, 0, -length), new Vector3(span / 2, 0, -length), new Vector3(span / 2, 0, 0)]
    const geometry = new PlaneGeometry(span, length).rotateX(-Math.PI / 2).translate(0, 0, -length / 2)
    const face = mesh(leaf, new Mesh(geometry, m.fill))
    const outline = stroke(leaf, pts)
    part(leaf, [...pts], 'face', () => (facing(normal, box) ? 19 : 9))
    return { leaf, face, outline, open: open * DEG, spread: spread * DEG }
  }
  const flaps = [
    flap(new Vector3(w / 2, h, 0), Math.PI / 2, d, w * 0.3, FLAP.b, new Vector3(1, 0, 0)),
    flap(new Vector3(-w / 2, h, 0), -Math.PI / 2, d, w * 0.3, FLAP.b, new Vector3(-1, 0, 0)),
    flap(new Vector3(0, h, d / 2), 0, w, d / 2 - 0.2, FLAP.a, new Vector3(0, 0, 1)),
    flap(new Vector3(0, h, -d / 2), Math.PI, w, d / 2 - 0.2, FLAP.a, new Vector3(0, 0, -1)),
  ]

  // The slash on the front, like a label.
  const labelLoop = slashLoop(22, sx * w * 0.26, h * 0.45)
  const labelPts = labelLoop.map((p) => v3(p, d / 2 + 0.5))
  const label = stroke(box, labelPts)
  const labelFill = mesh(box, shapeMesh(labelLoop, m.solid))
  labelFill.position.z = d / 2 + 0.5
  part(box, labelPts, 'solid', 18.5, { normal: new Vector3(0, 0, 1) })

  // ---------- The work: rays and stage cards ----------
  const half = CARD.size / 2
  const restAz = c.view.to[0] * DEG * sx
  const facingRest = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), restAz)
  const across = new Vector3(Math.cos(restAz), 0, -Math.sin(restAz))
  const toward = new Vector3(Math.sin(restAz), 0, Math.cos(restAz))
  const cards = CARD.angles.map((deg, i) => {
    const a = deg * DEG
    const centre = new Vector2(sx * (BULB.x + Math.cos(a) * CARD.reach), BULB.y + Math.sin(a) * CARD.reach)
    const dir = centre.clone().sub(bulbAt).normalize()
    const hit = Math.min(half / Math.max(Math.abs(dir.x), 1e-6), half / Math.max(Math.abs(dir.y), 1e-6))
    const ray = stroke(paper, [v3(bulbAt.clone().addScaledVector(dir, r + TICK.from + TICK.length + 7)), v3(centre.clone().addScaledVector(dir, -(hit + 5)))])
    const group = new Group()
    scene.add(group)
    const loop = roundedSquare(half, CARD.radius, dir.clone().multiplyScalar(-hit))
    const face = mesh(group, shapeMesh(loop.map((p) => new Vector2(p.x, p.y)), m.fill))
    const outline = stroke(group, loop)
    const iconPts = ICONS[i]()
    const icon = iconPts.map((pts) => stroke(group, pts))
    part(group, loop, 'face', 15, { depthOf: group })
    for (const pts of iconPts) part(group, pts, 'ink', 15, { depthOf: group })
    // It lands standing in the box, out of sight, then peeks out over the rim, a little tilted.
    const [side, near, peek, tilt] = PEEKS[i]
    const quaternion = facingRest.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), tilt * DEG * sx))
    const small = half * CARD.inBox
    const hidden = across.clone().multiplyScalar(sx * side).addScaledVector(toward, near).setY(h - small - 4)
    const shown = hidden.clone().setY(h + peek - small)
    return { centre, ray, group, face, outline, icon, quaternion, hidden, shown }
  })

  // ---------- One frame ----------
  const tips = [] // the moving stroke ends, placed once every matrix is up to date
  const tip = (s, u) => {
    if (u > 0 && u < 1) tips.push({ s, u })
  }
  const pose = new Matrix4()
  const from = { p: new Vector3(), q: new Quaternion(), s: new Vector3() }
  const landed = new Vector3()
  const wobble = new Quaternion()
  const xAxis = new Vector3(1, 0, 0)
  const third = (e, k) => ease.draw(clamp01(e * 3 - k))

  function apply(v) {
    tips.length = 0
    aim(v.view)

    // The bulb: drawn, then taken back off the paper from where each stroke began.
    const gone = v.bulb.erase
    bulb.visible = gone < 1
    glass.show(gone, v.bulb.outline)
    tip(glass, v.bulb.outline)
    tip(glass, gone)
    base.show(gone, v.bulb.base)
    tip(base, v.bulb.base)
    tip(base, gone)
    if (elevation !== v.view.el) {
      elevation = v.view.el
      rings.forEach((s, k) => s.update(ring(r, k, elevation)))
    }
    for (const s of rings) s.show(gone, v.bulb.base)
    filament.show(gone, v.bulb.filament)
    tip(filament, v.bulb.filament)
    const glow = v.bulb.glow
    filamentFill.visible = glow >= 1 && gone === 0
    filamentFill.material = glow < 1.5 ? m.accentFill : m.solid
    ticks.forEach((s, k) => {
      if (s.t !== v.bulb.ticks) {
        s.t = v.bulb.ticks
        s.update(tickAt(TICKS[k], s.t))
      }
      s.show(0, v.bulb.ticks > 0.02 ? 1 : 0)
      s.line.material = glow >= 1 && glow < 1.5 ? m.accent : m.ink
    })
    const hl = v.bulb.halo
    halo.visible = hl > 0 && hl < 1
    halo.scale.setScalar(0.7 + 1.1 * hl)
    m.halo.opacity = 0.22 * (1 - hl)

    // Rays and cards.
    cards.forEach((cd, i) => {
      const ray = v[`ray${i}`]
      const card = v[`card${i}`]
      cd.ray.show(ray.tail, ray.head)
      tip(cd.ray, ray.head)
      tip(cd.ray, ray.tail)

      cd.outline.show(0, card.outline)
      tip(cd.outline, card.outline)
      cd.face.visible = card.outline >= 1
      const pen = showInTurn(cd.icon, card.icon)
      if (pen) tip(pen.stroke, pen.u)

      // From its place on the paper, along an arc with a little tumble, into the box; then up.
      pose.makeTranslation(cd.centre.x, cd.centre.y, -DIST).premultiply(camera.matrixWorld)
      pose.decompose(from.p, from.q, from.s)
      const f = card.fly
      landed.lerpVectors(cd.hidden, cd.shown, card.peek)
      cd.group.position.lerpVectors(from.p, landed, f).y += ARC * 4 * f * (1 - f)
      cd.group.quaternion.slerpQuaternions(from.q, cd.quaternion, f).multiply(wobble.setFromAxisAngle(xAxis, Math.sin(Math.PI * f) * 0.7))
      cd.group.scale.setScalar(card.pop * (1 + (CARD.inBox - 1) * f))
    })

    // The box: bottom, uprights, rim, a third of the time each; it fills once they are drawn.
    const e = v.box.edges
    bottom.show(0, third(e, 0))
    tip(bottom, third(e, 0))
    for (const s of uprights) {
      s.show(0, third(e, 1))
      tip(s, third(e, 1))
    }
    rim.show(0, third(e, 2))
    tip(rim, third(e, 2))
    for (const face of walls) face.visible = v.box.fill > 0
    m.fade.opacity = v.box.fill

    for (const fl of flaps) {
      fl.outline.show(0, v.box.flaps)
      tip(fl.outline, v.box.flaps)
      fl.face.visible = v.box.flapFill >= 1
      fl.leaf.rotation.x = fl.open + (fl.spread - fl.open) * v.box.spread
    }

    const q = v.box.squash
    box.scale.set(1 + 0.04 * q, 1 - 0.08 * q, 1 + 0.04 * q)

    label.show(0, v.box.label)
    tip(label, v.box.label)
    labelFill.visible = v.box.labelFill >= 1

    scene.updateMatrixWorld()
    return tips.map(({ s, u }) => {
      const [x, y] = toScreen(s.pointAt(u), camera, width, height)
      return { x, y, u }
    })
  }

  // ---------- At rest: the frame as SVG, in px ----------
  // Parts are painted in order, so nearer parts cover what the 3D drawing hides with depth.
  // Classes are styled with tokens in intro.css.
  function svg() {
    scene.updateMatrixWorld()
    const visible = (obj) => {
      for (let o = obj; o; o = o.parent) if (!o.visible) return false
      return true
    }
    const keyed = parts
      .filter((p) => visible(p.obj) && !(p.normal && !facing(p.normal, p.obj)))
      .map((p, i) => ({ p, i, order: typeof p.order === 'function' ? p.order() : p.order, depth: p.depthOf ? depth(p.depthOf) : 0 }))
      .sort((a, b) => a.order - b.order || a.depth - b.depth || a.i - b.i)
    const out = keyed.map(({ p }) => {
      const pts = p.pts().map((pt) => toScreen(pt.clone().applyMatrix4(p.obj.matrixWorld), camera, width, height))
      const points = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
      const closed = p.kind === 'face' || p.kind === 'solid'
      return `<${closed ? 'polygon' : 'polyline'} class="${p.kind}" points="${points}"/>`
    })
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="--stroke: ${strokeWidth.toFixed(2)}px">${out.join('')}</svg>`
  }

  return {
    scene,
    camera,
    apply,
    svg,
    dispose() {
      for (const s of strokes) s.dispose()
      for (const x of meshes) x.geometry.dispose()
    },
  }
}
