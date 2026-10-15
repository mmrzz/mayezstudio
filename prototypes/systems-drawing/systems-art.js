// Receipt 1's drawing (D-016, D-017): four systems, as four boxes with the logo's slash on
// them. A man pushes the first one in from the start side, shove by shove, straining between
// them. As it reaches its place the other three drop from above, one after another; he jumps
// back, then stands proud beside the pile. The timeline is systems-timeline.js; apply(values)
// poses one frame.
//
// The boxes live in the world, seen from a little above and from the start side. The man is a
// stick figure on a card that always faces the camera, standing just in front of them.
// At rest the drawing is an SVG of the last frame (svg()), cut to its own bounds (`frame`).

import { Scene, OrthographicCamera, Group, Mesh, CircleGeometry, Vector3 } from 'three'
import { Stroke, shapeMesh, polygonMesh, toScreen } from '../../../core/drawing.js'
import { INTRO } from '../../../config.js'
import { slashLoop } from './slash.js'

const DEG = Math.PI / 180
const DIST = 1000 // camera to the origin
const S = 20 // a box's edge, design units
const VIEW = { az: 28, el: 20 } // degrees: from the start side, a little above
const MAN_Z = S / 2 + 1 // the man's card: just in front of the boxes, his hands on their front corner
const GAP = 5 // between the pile and the man at rest
// Where the boxes end up, [start face along the reading direction, bottom]: the one pushed in,
// then the three that drop: on it, beside it (where he stood), and on that one.
const SLOTS = [
  [-S, 0],
  [-S, S],
  [-2 * S, 0],
  [-2 * S, S],
]

// The man, in his own units: u toward the end side, y up, his feet on y = 0.
const LEG = 9 // thigh and shin
const ARM = 7 // upper arm and forearm
const HEAD = 4.6
const HAND = [16, 13.5] // where his hands meet the box he pushes
const SURPRISED = {
  hip: [0, 17],
  neck: [0, 29],
  head: [0, 35],
  elbowF: [6, 32],
  handF: [8, 38.5],
  elbowB: [-6, 32],
  handB: [-8, 38.5],
  kneeF: [3.5, 8.5],
  footF: [6, 0],
  kneeB: [-3.5, 8.5],
  footB: [-6, 0],
}
const PROUD = {
  hip: [0, 17.5],
  neck: [0, 29.5],
  head: [0.6, 35.6],
  elbowF: [6, 24.5],
  handF: [2.6, 18],
  elbowB: [-6, 24.5],
  handB: [-2.6, 18],
  kneeF: [3, 9],
  footF: [5, 0],
  kneeB: [-3, 9],
  footB: [-5, 0],
}
const STRAIN = [110, 140, 170] // effort ticks behind his head, degrees from facing the end side
const WOW = [45, 90, 135] // surprise ticks over it

// Two bones of length l from a toward b (pulled in when out of reach), bending to the left of
// a→b when bend is 1, to the right when -1.
function bones(a, b, l, bend) {
  let dx = b[0] - a[0]
  let dy = b[1] - a[1]
  let d = Math.hypot(dx, dy) || 1e-6
  const reach = 2 * l - 0.01
  if (d > reach) {
    dx *= reach / d
    dy *= reach / d
    d = reach
  }
  const along = d / 2
  const h = Math.sqrt(Math.max(0, l * l - along * along))
  const nx = dx / d
  const ny = dy / d
  return { mid: [a[0] + nx * along - ny * h * bend, a[1] + ny * along + nx * h * bend], end: [a[0] + dx, a[1] + dy] }
}

// Pushing: leaning in by `lean` (1 is hard), hands on the box, feet going round by `step`:
// each foot is planted while it goes back and lifted while it comes forward.
function pushing(step, lean) {
  const th = lean * 40 * DEG
  const hip = [0, 14.5]
  const neck = [12 * Math.sin(th), hip[1] + 12 * Math.cos(th)]
  const head = [neck[0] + 6 * Math.sin(th * 0.5), neck[1] + 6 * Math.cos(th * 0.5)]
  const armF = bones(neck, HAND, ARM, -1)
  const armB = bones(neck, [HAND[0], HAND[1] - 2.5], ARM, -1)
  const foot = (k) => {
    const a = step + k * Math.PI
    return [-5.75 + 4.75 * Math.cos(a), Math.max(0, -Math.sin(a)) * 2.5]
  }
  const legF = bones(hip, foot(0), LEG, 1)
  const legB = bones(hip, foot(1), LEG, 1)
  return {
    hip,
    neck,
    head,
    elbowF: armF.mid,
    handF: armF.end,
    elbowB: armB.mid,
    handB: armB.end,
    kneeF: legF.mid,
    footF: legF.end,
    kneeB: legB.mid,
    footB: legB.end,
  }
}

const mix = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t]]))

// rest: the timeline's values at its end, which the frame is cut around.
export function createArt({ rtl, materials: m, rest }) {
  const stroke = INTRO.systems.stroke
  const dir = rtl ? -1 : 1 // world x of the end side
  const az = VIEW.az * DEG
  const el = VIEW.el * DEG
  const cos = Math.cos(az)
  const sin = Math.sin(az)
  const h = S / 2

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 2 * DIST)
  const a = -dir * az
  const back = new Vector3(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el))
  camera.position.copy(back).multiplyScalar(DIST)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
  const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
  const facing = (normal, obj) => normal.clone().transformDirection(obj.matrixWorld).dot(back) > 1e-3
  const depth = (obj) => obj.getWorldPosition(new Vector3()).dot(back)
  // How far along the reading direction a world point shows, in view units.
  const endward = (e, z) => e * cos + z * sin

  const strokes = []
  const meshes = []
  const line = (parent, pts, mat = m.ink) => {
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
  const v = (x, y, z = 0) => new Vector3(x, y, z)

  // ---------- The boxes: their foot at the group's origin, so they squash onto it ----------
  function box() {
    const group = new Group()
    scene.add(group)
    const body = new Group()
    group.add(body)
    const front = [v(-h, 0, h), v(h, 0, h), v(h, S, h), v(-h, S, h)]
    const rear = front.map((p) => v(p.x, p.y, -h))
    const faces = [
      [front, [0, 0, 1]],
      [rear, [0, 0, -1]],
      [[v(h, 0, h), v(h, 0, -h), v(h, S, -h), v(h, S, h)], [1, 0, 0]],
      [[v(-h, 0, -h), v(-h, 0, h), v(-h, S, h), v(-h, S, -h)], [-1, 0, 0]],
      [[v(-h, S, h), v(h, S, h), v(h, S, -h), v(-h, S, -h)], [0, 1, 0]],
      [[v(-h, 0, -h), v(h, 0, -h), v(h, 0, h), v(-h, 0, h)], [0, -1, 0]],
    ].map(([pts, n]) => {
      mesh(body, polygonMesh(pts, m.fill))
      return { pts, normal: v(...n) }
    })
    const edges = [[...front, front[0]], [...rear, rear[0]], ...front.map((p, i) => [p, rear[i]])].map((pts) => line(body, pts))
    // The logo's slash on the front, like a label.
    const loop = slashLoop(S * 0.5, 0, h)
    const label = mesh(body, shapeMesh(loop, m.solid))
    label.position.z = h + 0.3
    const labelPts = loop.map((p) => v(p.x, p.y, h + 0.3))
    // A puff on each side where it lands: ticks thrown out from its foot.
    const puffs = [-1, 1].map(() => line(scene, [v(0, 0), v(0, 0.01)], m.accent))
    return { group, body, faces, edges, label, labelPts, puffs }
  }
  const boxes = SLOTS.map(box)
  const place = (b, e0, y) => b.group.position.set(dir * (e0 + h), y, 0)

  // ---------- The man ----------
  // His card leans back with the camera, into the boxes' depth, so he is drawn over them.
  const over = (mat) => Object.assign(mat.clone(), { depthTest: false })
  const ink = over(m.ink)
  const accent = over(m.accent)
  const fill = over(m.fill)
  const man = new Group()
  scene.add(man)
  const face = mesh(man, new Mesh(new CircleGeometry(HEAD, 32), fill)) // his head covers what is behind it
  face.renderOrder = 1
  const local = ([u, y], lift) => v(dir * u, y + lift)
  const ring = (c, lift) => Array.from({ length: 25 }, (_, i) => local([c[0] + HEAD * Math.cos((i / 24) * 2 * Math.PI), c[1] + HEAD * Math.sin((i / 24) * 2 * Math.PI)], lift))
  const LIMBS = [
    ['hip', 'kneeF', 'footF'],
    ['hip', 'kneeB', 'footB'],
    ['hip', 'neck'],
    ['neck', 'elbowF', 'handF'],
    ['neck', 'elbowB', 'handB'],
  ]
  const limbs = LIMBS.map((names) => line(man, names.map(() => v(0, 0)), ink))
  const head = line(man, ring([0, 0], 0), ink)
  const strainTicks = STRAIN.map(() => line(man, [v(0, 0), v(0, 0.01)], accent))
  const wowTicks = WOW.map(() => line(man, [v(0, 0), v(0, 0.01)], accent))
  for (const s of [...limbs, head, ...strainTicks, ...wowTicks]) s.line.renderOrder = 2
  const tick = (s, centre, deg, from, length, lift) => {
    s.line.visible = length > 0.05
    if (!s.line.visible) return
    const d = [Math.cos(deg * DEG), Math.sin(deg * DEG)]
    s.update([local([centre[0] + d[0] * from, centre[1] + d[1] * from], lift), local([centre[0] + d[0] * (from + length), centre[1] + d[1] * (from + length)], lift)])
  }

  // Where he stands: hands on the box while he pushes; at rest, just clear of the pile.
  const pileStart = Math.min(...SLOTS.map(([e0]) => endward(e0, -h)))
  const atBox = (e0) => e0 - HAND[0] / cos
  const restAt = (pileStart - GAP - 6 - stroke - MAN_Z * sin) / cos

  // ---------- One frame ----------
  let travel = 0 // how far the first box comes from, out of sight on the start side
  let drops = [0, 0, 0] // how far above its place each falling box starts, out of sight
  function apply(val) {
    const e0 = SLOTS[0][0] - (1 - val.box.x) * travel
    place(boxes[0], e0, 0)
    boxes[0].puffs.forEach((p) => (p.line.visible = false))

    boxes.slice(1).forEach((b, i) => {
      const d = val[`drop${i}`]
      const [e, y] = SLOTS[i + 1]
      b.group.visible = d.fall > 0
      place(b, e, y + (1 - d.fall) * drops[i])
      // Violet while it falls; ink once it has landed.
      const air = d.fall < 1
      for (const s of b.edges) s.line.material = air ? m.accent : m.ink
      b.label.material = air ? m.accentFill : m.solid
      const q = d.squash
      b.body.scale.set(1 + 0.1 * q, 1 - 0.16 * q, 1 + 0.1 * q)
      b.puffs.forEach((p, k) => {
        const t = d.impact
        p.line.visible = t > 0 && t < 1
        if (!p.line.visible) return
        const side = k ? 1 : -1
        const foot = v(dir * (k ? e + S + 1 : e - 1), y + 1.5, h)
        const out = v(dir * side * Math.cos(30 * DEG), Math.sin(30 * DEG))
        p.update([foot.clone().addScaledVector(out, 1 + 4 * t), foot.clone().addScaledVector(out, 1 + 4 * t + 6 * Math.sqrt(1 - t))])
      })
    })

    const mv = val.man
    ink.color.copy(m.ink.color)
    accent.color.copy(m.accent.color)
    fill.color.copy(m.fill.color)
    const at = atBox(e0) + mv.back * (restAt - atBox(SLOTS[0][0]))
    man.position.set(dir * at, 0, MAN_Z)
    man.quaternion.copy(camera.quaternion)
    const pose = mv.pose <= 1 ? mix(pushing(mv.step, mv.lean), SURPRISED, mv.pose) : mix(SURPRISED, PROUD, mv.pose - 1)
    const lift = mv.hop * 7
    LIMBS.forEach((names, k) => limbs[k].update(names.map((n) => local(pose[n], lift))))
    head.update(ring(pose.head, lift))
    face.position.copy(local(pose.head, lift))
    strainTicks.forEach((s, k) => tick(s, pose.head, STRAIN[k], HEAD + 1.8, 3.5 * mv.strain, lift))
    wowTicks.forEach((s, k) => tick(s, pose.head, WOW[k], HEAD + 2 + 3 * mv.wow, mv.wow > 0 && mv.wow < 1 ? 4.5 * Math.sin(Math.PI * mv.wow) : 0, lift))

    scene.updateMatrixWorld()
  }

  // ---------- The frame: the last frame's bounds, in view units ----------
  apply(rest)
  const frame = (() => {
    const xs = []
    const ys = []
    const add = (p, obj) => {
      const w = p.clone().applyMatrix4(obj.matrixWorld)
      xs.push(w.dot(right))
      ys.push(w.dot(up))
    }
    for (const b of boxes) for (const f of b.faces) for (const p of f.pts) add(p, b.body)
    for (const s of [...limbs, head]) for (const p of s.points) add(p, man)
    const pad = stroke / 2 + 0.3
    const x0 = Math.min(...xs) - pad
    const y1 = Math.max(...ys) + pad
    return { x0, y1, width: Math.max(...xs) + pad - x0, height: y1 - (Math.min(...ys) - pad) }
  })()

  // Sets the view: a width x height px area with the frame's top left at (ox, oy) px,
  // `scale` px to a design unit. The first box starts beyond its start edge, the falling ones
  // above its top.
  let size = { width: frame.width, height: frame.height }
  function fit({ width, height, ox = 0, oy = 0, scale = 1 }) {
    size = { width, height }
    camera.left = frame.x0 - ox / scale
    camera.right = camera.left + width / scale
    camera.top = frame.y1 + oy / scale
    camera.bottom = camera.top - height / scale
    camera.updateProjectionMatrix()
    m.ink.linewidth = m.accent.linewidth = ink.linewidth = accent.linewidth = stroke * scale
    const startEdge = dir > 0 ? camera.left : -camera.right
    travel = Math.max(0, SLOTS[0][0] - ((startEdge - stroke - h * sin) / cos - S))
    drops = SLOTS.slice(1).map(([e, y]) => {
      let low = Infinity
      for (const de of [0, S]) for (const z of [-h, h]) low = Math.min(low, v(dir * (e + de), y, z).dot(up))
      return Math.max(0, (camera.top + stroke - low) / up.y)
    })
  }
  fit(size)

  // ---------- At rest: the frame as SVG, in design units ----------
  // Painted far to near, so nearer boxes cover what the 3D drawing hides with depth. Classes are
  // styled with tokens in intro.css.
  function svg() {
    scene.updateMatrixWorld()
    const pt = (p, obj) => toScreen(p.clone().applyMatrix4(obj.matrixWorld), camera, size.width, size.height)
    const shape = (tag, kind, pts) => `<${tag} class="${kind}" points="${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}"/>`
    const out = []
    const shown = boxes.filter((b) => b.group.visible).sort((p, q) => depth(p.group) - depth(q.group))
    for (const b of shown) {
      for (const f of b.faces) {
        if (facing(f.normal, b.body)) out.push(shape('polygon', 'face', f.pts.map((p) => pt(p, b.body))))
      }
      out.push(shape('polygon', 'solid', b.labelPts.map((p) => pt(p, b.body))))
    }
    for (const s of limbs) out.push(shape('polyline', 'ink', s.points.map((p) => pt(p, man))))
    out.push(shape('polygon', 'face', head.points.map((p) => pt(p, man))))
    const w = size.width.toFixed(2)
    const hh = size.height.toFixed(2)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none" style="--stroke: ${stroke}px">${out.join('')}</svg>`
  }

  return {
    scene,
    camera,
    frame,
    fit,
    apply,
    svg,
    dispose() {
      for (const s of strokes) s.dispose()
      for (const x of meshes) x.geometry.dispose()
      for (const mat of [ink, accent, fill]) mat.dispose()
    },
  }
}
