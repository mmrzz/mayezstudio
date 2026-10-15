// Receipt 3's scene: «۲ نفر», shown as a ritual. A teddy bear sits in a chalk circle; the room goes
// dark, the circle draws itself in violet and candles light round it. The bear twitches, its head
// tilts too far, then it rips down the middle like something soft and warm: gooey strands stretch
// between the halves, thin out, snap and drip onto the floor. Each half regrows the half it lost,
// stitched on, and they sit as two: one with glowing red eyes, one with a gold halo. The candles go
// out and the room comes back.
//
// It is ink line art: white bodies, one bold outline, tapered brush lines, solid black ears, soles
// and eyes, and stipple for shadow. Black and white in both themes (`--rit-line`, `--rit-paper`);
// the only colours are the red eyes and the halo, which stay lit at rest. The magic is violet and
// only shows while something moves; the circle rests as faint chalk in `--text`.
//
// The markup this builds is the finished state: the two bears in the faint chalk circle, the
// candles out, drips on the floor. apply(values) moves things while the timeline plays
// (team-timeline.js); idle(t) keeps them alive afterwards; reset() puts the finished state back.
import { ease, clamp01 } from '../../../../../core/timeline.js'

// The scene's design space; what is shown of it (the halo is the top, the circle's front the bottom).
const VB = { x: 0, y: 18, w: 360, h: 182 }
const FLOOR = { cx: 180, cy: 164, rx: 158, ry: 30 }
const SEAT = 171 // the bears sit at this height, on the floor
const APART = 76 // how far each bear ends from the middle
const GROW = 66 // how far the clip recedes, so the lost half is all back
const NECK = [0, -60] // the head tilts about this point
const DEG = Math.PI / 180

// Candles round the circle: the angle on it (0 at the right, 90 at the front) and the height.
const CANDLES = [
  [20, 15],
  [90, 12],
  [160, 16],
  [212, 12],
  [270, 14],
  [328, 13],
]

// Rune glyphs, drawn upright from the baseline, then laid flat on the floor.
const RUNES = [
  'M0 0V-8M0-6l3-2M0-3l3-2',
  'M-2 0V-8l4 3-4 3',
  'M-2 0l2-8 2 8M-1-3h2',
  'M0 0V-8M-3-8l3 3 3-3',
  'M-2-8l4 8M2-8l-4 8',
  'M-2 0V-8l4 8V-8',
  'M0 0V-8M-2.5-5h5',
  'M-2 0V-8h4v4h-4l4 4',
]

// Strands of goo between the halves as they part: the height on the tear, how thick it is where it
// leaves the bear, and how far through the parting it snaps (0 to 1).
const STRANDS = [
  [-118, 5, 0.34],
  [-101, 7, 0.66],
  [-84, 6, 0.46],
  [-66, 8, 0.84],
  [-48, 9, 0.56],
  [-30, 8, 0.76],
  [-14, 6, 0.4],
]

// A small seeded random, so the stipple is the same on every render.
const rand = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
const f1 = (n) => +n.toFixed(1)

// ---------- Drawing helpers ----------

// A brush stroke along a cubic, tapering to points at both ends (or only at the end with `tail`).
function brush([x0, y0], [x1, y1], [x2, y2], [x3, y3], w, tail = false) {
  const N = 14
  const left = []
  const right = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = 1 - t
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
    const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2)
    const dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2)
    const len = Math.hypot(dx, dy) || 1
    const half = (w / 2) * (tail ? Math.max(0.12, u) ** 0.7 : Math.max(0.12, Math.sin(Math.PI * t)) ** 0.6)
    left.push([x - (dy / len) * half, y + (dx / len) * half])
    right.push([x + (dy / len) * half, y - (dx / len) * half])
  }
  return 'M' + [...left, ...right.reverse()].map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'Z'
}

// Stipple: dots in an ellipse, densest at its centre, as one path drawn with round caps.
function stipple(cx, cy, rx, ry, n, seed) {
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = rand(seed + i * 2.13) * Math.PI * 2
    const r = rand(seed + i * 5.71) ** 0.9 * (0.35 + 0.65 * rand(seed + i * 9.37))
    d += `M${f1(cx + rx * r * Math.cos(a))} ${f1(cy + ry * r * Math.sin(a))}h0`
  }
  return d
}

const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const oval = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`

// ---------- The bear, in its own space: seated at (0, 0), facing us, turned a little ----------

const PARTS = {
  earL: circle(-34, -117, 15),
  earR: circle(35, -120, 15),
  body: 'M-25-60C-37-46-38-18-31-4L31-4C38-18 37-46 25-60Z',
  legL: 'M-12-33C-30-36-51-27-53-12C-55 3-40 7-27 5C-15 3-5-3-5-14C-5-24-6-31-12-33Z',
  legR: 'M12-33C30-36 51-27 53-12C55 3 40 7 27 5C15 3 5-3 5-14C5-24 6-31 12-33Z',
  armL: 'M-24-56C-36-50-36-34-27-28C-20-23-11-27-12-34C-13-41-15-52-24-56Z',
  armR: 'M23-57C33-52 38-37 33-28C29-21 20-23 19-31C18-40 16-51 23-57Z',
  head: 'M-45-92C-47-118-24-133 2-132C29-131 47-117 46-92C45-68 25-55 0-55C-25-55-43-67-45-92Z',
}
// The body parts in the order they are drawn, each with where it is shaded (stipple: cx, cy, rx,
// ry, dots). The ears and head are drawn after, in the head's group.
const BODY = [
  ['body', [[0, -54, 30, 9, 70], [28, -30, 8, 22, 40]]],
  ['legL', [[-9, -14, 8, 14, 40], [-30, 4, 16, 4, 30]]],
  ['legR', [[9, -14, 8, 14, 40], [32, 2, 18, 5, 45], [50, -14, 4, 10, 20]]],
  ['armL', [[-17, -30, 8, 5, 25]]],
  ['armR', [[30, -32, 6, 10, 30]]],
]
const HEAD_SHADE = [[36, -72, 12, 14, 45], [-2, -57, 26, 4, 35]]
const SIL_HEAD = ['earL', 'earR', 'head']
const SIL_BODY = BODY.map(([name]) => name)

// Inner ears, soles and their shine, solid ink; brush lines for creases, the tuft and a cheek.
const EARS = circle(-31, -114, 9) + circle(32, -117, 9)
const SOLES = oval(-45, -12, 6.5, 10) + oval(45, -12, 6.5, 10)
const SOLES_SHINE = circle(-47, -17, 1.6) + circle(43, -17, 1.6)
const CREASES = [
  brush([-12, -31], [-9, -26], [-8, -20], [-9, -14], 2.2), // where the legs meet the body
  brush([12, -31], [9, -26], [8, -20], [9, -14], 2.2),
].join('')
const PAW_FOLD = brush([-18, -32], [-15, -30], [-13, -31], [-12, -34], 1.8) // on the paw resting on the belly
// The arm each one waves with (its outer one) and the shoulder it turns about.
const WAVE = { a: ['armL', [-23, -54]], b: ['armR', [23, -55]] }
const EVIL_TILT = -11 // the evil one's head stays tilted
const TUFT = brush([-4, -131], [-7, -136], [-6, -140], [-2, -142], 2.6, true) + brush([1, -132], [2, -138], [6, -141], [10, -140], 2.6, true)
const CHEEK = brush([-30, -74], [-28, -70], [-26, -69], [-24, -70], 1.6)
const FACE = {
  eyes: [oval(-15, -89, 6, 7.5), oval(21, -91, 6, 7.5)],
  shine: circle(-17, -92, 2.1) + circle(-13, -86, 1) + circle(19, -94, 2.1) + circle(23, -88, 1),
  nose: 'M-2.5-80C-2.5-84 10.5-84 10.5-80C10.5-76.5 6.5-74.5 4-74.5C1.5-74.5-2.5-76.5-2.5-80Z',
  noseShine: oval(1.5, -81, 2, 1),
  mouth: 'M-6-71C-3-70 11-70 14-71C12-63 6-60 3.5-60C1-60-4-63-6-71Z',
  tongue: brush([-1, -63], [2, -66], [6, -66], [9, -63], 1.6),
  smile: brush([-9, -73], [-7, -71], [-6, -71], [-5, -71.5], 1.5) + brush([13, -71.5], [14, -71], [15, -71], [17, -73], 1.5),
  brows: brush([-21, -102], [-18, -104], [-14, -104], [-11, -103], 2.2) + brush([16, -105], [19, -107], [23, -107], [26, -106], 2.2),
  freckles: 'M-24-80h0M-21-78h0M-25-77h0M29-82h0M32-80h0M28-79h0',
  // the evil one
  angry: brush([-24, -101], [-19, -99], [-14, -97], [-9, -94], 3) + brush([30, -103], [26, -101], [21, -99], [15, -96], 3),
  grin: 'M-7-72l3.3 4 3.2-4 3.3 4 3.2-4 3.3 4 3.2-4',
}

// The tear, down the middle: a wavy line from above the ears to under the seat.
const JAG = []
for (let y = -150; y <= 12; y += 4) JAG.push([f1(2.6 * Math.sin(y * 0.23) + 1.4 * Math.sin(y * 0.57 + 1)), y])
const jagX = (y) => {
  const i = Math.max(0, Math.min(JAG.length - 2, Math.floor((y - JAG[0][1]) / 4)))
  const [x0, y0] = JAG[i]
  const [x1, y1] = JAG[i + 1]
  return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0)
}
const jagPath = 'M' + JAG.map(([x, y]) => `${x} ${y}`).join('L')
const clipPath = (side) => `M${side * 400} -190L${JAG[0][0]} -190L${JAG.map(([x, y]) => `${x} ${y}`).join('L')}L${side * 400} 14Z`
// Stitches across the scar, between y0 and y1.
const stitches = (y0, y1) => {
  let d = ''
  for (let y = y0; y <= y1; y += 7) {
    const x = jagX(y)
    d += `M${f1(x - 3.4)} ${f1(y - 1.6)}L${f1(x + 3.4)} ${f1(y + 1.6)}`
  }
  return d
}
// The torn edge, gooey: lumps along the tear, on the side the half lost.
const gooEdge = (side) => {
  const pts = []
  for (let y = -150; y <= 12; y += 3) pts.push([jagX(y) - side * (2.2 + 2.4 * Math.abs(Math.sin(y * 0.31)) + 1.6 * Math.abs(Math.sin(y * 0.13 + 2))), y])
  return `${jagPath}L${pts.reverse().map(([x, y]) => `${f1(x)} ${y}`).join('L')}Z`
}

// A soft blob along P → M → Q: as wide as wP at P, wM at M, wQ at Q.
function goo(P, M, Q, wP, wM, wQ) {
  const seg = (a, b) => {
    const dx = (b[0] - a[0]) * 0.5
    return `C${f1(a[0] + dx)} ${f1(a[1])} ${f1(b[0] - dx)} ${f1(b[1])} ${f1(b[0])} ${f1(b[1])}`
  }
  const at = (p, w, k) => [p[0], p[1] + (k * w) / 2]
  const [pt, mt, qt] = [at(P, wP, -1), at(M, wM, -1), at(Q, wQ, -1)]
  const [pb, mb, qb] = [at(P, wP, 1), at(M, wM, 1), at(Q, wQ, 1)]
  const cap = (w, to) => `A${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(to[0])} ${f1(to[1])}`
  return `M${f1(pt[0])} ${f1(pt[1])}${seg(pt, mt)}${seg(mt, qt)}${cap(wQ, qb)}${seg(qb, mb)}${seg(mb, pb)}${cap(wP, pt)}Z`
}

// The bear's markup. which: 'a' (the one that turns evil) or 'b' (the angel).
function bearMarkup(P, which) {
  const side = which === 'a' ? -1 : 1
  const [waving, shoulder] = WAVE[which]
  const draw = (name, shades = []) =>
    `<path class="rit-body" d="${PARTS[name]}"/>` +
    (shades.length ? `<path class="rit-dots" clip-path="url(#${P}-${name})" d="${shades.map(([cx, cy, rx, ry, n], i) => stipple(cx, cy, rx, ry, n, i * 31 + cx)).join('')}"/>` : '')
  const calm =
    `<g data-k="calm"${which === 'a' ? ' opacity="0"' : ''}>` +
    `<path class="rit-ink" d="${FACE.eyes.join('') + FACE.brows}"/><path class="rit-shine" d="${FACE.shine}"/>` +
    `<path class="rit-body rit-thin" d="${FACE.mouth}"/><path class="rit-ink" d="${FACE.tongue + FACE.smile}"/>` +
    `</g>`
  const evil =
    which === 'a'
      ? `<g data-k="evil"><path class="rit-ink" d="${FACE.angry}"/><path class="rit-grin" d="${FACE.grin}"/>` +
        `<path class="rit-eye" d="${FACE.eyes.join('')}"/><path class="rit-eye" data-k="glow" d="${FACE.eyes.join('')}" filter="url(#${P}-glow)"/>` +
        `<path class="rit-eye-core" d="${oval(-14, -88, 2.2, 3) + oval(22, -90, 2.2, 3)}"/></g>`
      : ''
  const halo =
    which === 'b'
      ? `<g data-k="halo"><ellipse class="rit-halo rit-halo-glow" cx="2" cy="-146" rx="19" ry="5" filter="url(#${P}-glow)"/><ellipse class="rit-halo" cx="2" cy="-146" rx="19" ry="5"/><path class="rit-halo-hi" d="M-10-149.4Q2-151.8 14-149.4"/></g>`
      : ''
  const seamHead = `<g clip-path="url(#${P}-sil-head)" data-k="seam"><path class="rit-scar" d="${jagPath}"/><path class="rit-stitch" d="${stitches(-136, -58)}"/></g>`
  const seamBody = `<g clip-path="url(#${P}-sil-body)" data-k="seam"><path class="rit-scar" d="${jagPath}"/><path class="rit-stitch" d="${stitches(-56, 2)}"/></g>`
  return (
    `<g data-k="pos" transform="translate(${FLOOR.cx + side * APART} ${SEAT})"><g data-k="jolt"><g clip-path="url(#${P}-c${which})">` +
    `<path class="rit-ink" d="${oval(0, 3, 50, 4.5)}"/><path class="rit-dots" d="${stipple(0, 3, 64, 7, 90, 7)}"/>` + // its shadow
    BODY.filter(([name]) => name !== waving)
      .map(([name, shades]) => draw(name, shades) + (name === 'armL' ? `<path class="rit-ink" d="${PAW_FOLD}"/>` : ''))
      .join('') +
    `<path class="rit-ink" d="${SOLES + CREASES}"/><path class="rit-shine" d="${SOLES_SHINE}"/>` +
    seamBody +
    `<g data-k="head"${which === 'a' ? ` transform="rotate(${EVIL_TILT} ${NECK[0]} ${NECK[1]})"` : ''}>${draw('earL')}${draw('earR')}<path class="rit-ink" d="${EARS}"/>${draw('head', HEAD_SHADE)}` +
    `<path class="rit-ink" d="${TUFT + CHEEK + FACE.nose}"/><path class="rit-shine" d="${FACE.noseShine}"/><path class="rit-dots" d="${FACE.freckles}"/>` +
    `${seamHead}${calm}${evil}${halo}</g>` +
    // the waving arm, over the head when it is raised
    `<g data-k="wave" data-x="${shoulder[0]}" data-y="${shoulder[1]}">${draw(waving, BODY.find(([name]) => name === waving)[1])}${waving === 'armL' ? `<path class="rit-ink" d="${PAW_FOLD}"/>` : ''}</g>` +
    `</g>` +
    // the torn edge, gooey, moving out as the lost half grows back, with a violet glow
    `<g clip-path="url(#${P}-sil)"><g data-k="front" opacity="0"><path class="rit-magic" d="${jagPath}" filter="url(#${P}-glow)"/><path class="rit-body rit-thin" d="${gooEdge(side)}"/></g></g>` +
    `</g></g>`
  )
}

// ---------- Placement ----------

// Fits the scene in a box of W × H css px, in the room the text leaves it: below the text in a
// card (`top` px from the box's top), beside it at the end side in a strip (`textLeft` px from the
// box's left). Returns the scale and the scene's origin in the box.
export function fit(W, H, { top = 0, textLeft = W, strip = false } = {}) {
  const pad = 4
  const region = strip ? { x: pad, y: pad, w: Math.max(40, textLeft - 2 * pad), h: H - 2 * pad } : { x: pad, y: top + 2, w: W - 2 * pad, h: Math.max(40, H - top - 2 - pad) }
  const s = Math.min(region.w / VB.w, region.h / VB.h)
  const ox = region.x + (region.w - VB.w * s) / 2 - VB.x * s
  const oy = region.y + region.h - (VB.y + VB.h) * s
  return { s, ox, oy }
}

// Where a point of a bear (its own space) is in the scene, for a bear at `split` on `side`.
function onBear(side, split, [x, y]) {
  const lean = side * 11 * Math.sin(Math.PI * split) * DEG
  const cx = FLOOR.cx + side * APART * split
  return [cx + x * Math.cos(lean) - y * Math.sin(lean), SEAT + x * Math.sin(lean) + y * Math.cos(lean)]
}
// A strand's ends and middle at `split`; the middle sags as it stretches.
function strandAt([y], split) {
  const A = onBear(-1, split, [jagX(y), y])
  const B = onBear(1, split, [jagX(y), y])
  const d = Math.hypot(B[0] - A[0], B[1] - A[1])
  return { A, B, M: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + (0.06 + 0.2 * rand(y)) * d + 1] }
}
// Where a strand's drop lands: on the floor between the bears, either side of the front candle.
const dropAt = (st, i) => [FLOOR.cx + (i % 2 ? 1 : -1) * (12 + 18 * rand(i * 7.7)), SEAT + 1 + 8 * rand(i * 3.3)]

let uid = 0

export function createScene(W, H, opts) {
  const { s, ox, oy } = fit(W, H, opts)
  const P = `rit${++uid}`
  const lw = Math.max(2.4, 1.3 / s) // the outline, in scene units; never under about a px
  const dot = Math.max(1.1, 0.9 / s) // a stipple dot
  const floorAt = (deg, k = 1) => [FLOOR.cx + FLOOR.rx * k * Math.cos(deg * DEG), FLOOR.cy + FLOOR.ry * k * Math.sin(deg * DEG)]
  const ring = (k) => {
    const rx = FLOOR.rx * k
    const ry = FLOOR.ry * k
    return `M${FLOOR.cx + rx} ${FLOOR.cy}A${rx} ${ry} 0 1 1 ${FLOOR.cx - rx} ${FLOOR.cy}A${rx} ${ry} 0 1 1 ${FLOOR.cx + rx} ${FLOOR.cy}`
  }
  const stop = (offset, token, opacity = 1) => `<stop offset="${offset}" style="stop-color:var(${token});stop-opacity:${opacity}"/>`
  const sil = (names) => names.map((n) => `<path d="${PARTS[n]}"/>`).join('')

  // ---------- Defs ----------
  const darkCentre = [ox + FLOOR.cx * s, oy + (FLOOR.cy - 40) * s]
  const defs =
    `<defs>` +
    Object.keys(PARTS)
      .map((n) => `<clipPath id="${P}-${n}"><path d="${PARTS[n]}"/></clipPath>`)
      .join('') +
    `<filter id="${P}-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.6"/></filter>` +
    `<clipPath id="${P}-ca"><path d="${clipPath(-1)}" transform="translate(${GROW} 0)"/></clipPath>` +
    `<clipPath id="${P}-cb"><path d="${clipPath(1)}" transform="translate(${-GROW} 0)"/></clipPath>` +
    `<clipPath id="${P}-sil">${sil(Object.keys(PARTS))}</clipPath>` +
    `<clipPath id="${P}-sil-head">${sil(SIL_HEAD)}</clipPath>` +
    `<clipPath id="${P}-sil-body">${sil(SIL_BODY)}</clipPath>` +
    `<radialGradient id="${P}-dark" gradientUnits="userSpaceOnUse" cx="${darkCentre[0]}" cy="${darkCentre[1]}" r="${Math.max(W, H) * 0.8}">${stop(0, '--rit-dark', 0.3)}${stop(0.4, '--rit-dark', 0.72)}${stop(1, '--rit-dark', 0.94)}</radialGradient>` +
    `<radialGradient id="${P}-warm">${stop(0, '--rit-paper', 0.2)}${stop(1, '--rit-paper', 0)}</radialGradient>` +
    `</defs>`

  // ---------- The circle: two rings, a seven-point star, runes between the rings ----------
  const star = Array.from({ length: 8 }, (_, i) => floorAt(-90 + ((i * 3) % 7) * (360 / 7), 0.84))
  const circlePaths = [ring(1), ring(0.86), 'M' + star.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')]
  const runes = []
  for (let i = 0; i < 20; i++) {
    const deg = i * 18 + 9
    if (CANDLES.some(([a]) => Math.abs(((deg - a + 540) % 360) - 180) < 9)) continue
    const [x, y] = floorAt(deg, 0.93)
    runes.push(`<path d="${RUNES[i % RUNES.length]}" transform="translate(${f1(x)} ${f1(y + 2)}) scale(0.9 0.5)"/>`)
  }
  const circleMarkup = (cls, extra = '') => `<g class="${cls}"${extra}>${circlePaths.map((d) => `<path d="${d}" pathLength="1"/>`).join('')}<g>${runes.join('')}</g></g>`

  // ---------- Candles, in ink like the bears ----------
  const candle = ([deg, h], i) => {
    const [x, y] = floorAt(deg, 1)
    const r = 4
    return (
      `<g transform="translate(${f1(x)} ${f1(y)})">` +
      `<path class="rit-ink" d="${oval(1, 0.6, 7, 1.6)}"/>` +
      `<path class="rit-body" d="M${-r} ${-h}V0A${r} 1.5 0 0 0 ${r} 0V${-h}A${r} 1.5 0 0 0 ${-r} ${-h}Z"/>` +
      `<path class="rit-dots" d="${stipple(2.5, -h / 2, 1.1, h / 2, Math.round(h * 1.6), i * 17)}"/>` +
      `<ellipse cx="0" cy="${-h}" rx="${r}" ry="1.5" class="rit-body rit-thin"/>` +
      `<path class="rit-ink" d="${brush([-0.6, -h], [-0.8, -h - 1.5], [0.6, -h - 2.5], [0.2, -h - 3.6], 1.4)}"/>` +
      `<g data-k="flame" opacity="0" transform="translate(0 ${-h - 2.5})"><ellipse class="rit-glow" cx="0" cy="-5" rx="7" ry="10" filter="url(#${P}-glow)"/><path class="rit-body rit-thin" d="M0 0C-3.4-2-3.4-6 0-12C3.4-6 3.4-2 0 0Z"/><path class="rit-ink" d="M0-1.4C-1.4-2.4-1.4-4.2 0-6.4C1.4-4.2 1.4-2.4 0-1.4Z"/></g>` +
      `<path data-k="smoke" opacity="0" class="rit-smoke" d="M0 ${-h - 3}c-2.5-4 2.5-7 0-11c-2.5-4 2.5-7 0-11"/>` +
      `</g>`
    )
  }
  const back = (c) => Math.sin(c[0] * DEG) < 0
  const candlesBack = CANDLES.map((c, i) => (back(c) ? candle(c, i) : '')).join('')
  const candlesFront = CANDLES.map((c, i) => (back(c) ? '' : candle(c, i))).join('')

  // ---------- Goo: strands between the halves, and the drops they leave on the floor ----------
  const strands = STRANDS.map(() => `<path data-k="strand" class="rit-body rit-thin" opacity="0"/>`).join('')
  const drops = STRANDS.map((st, i) => {
    const [x, y] = dropAt(st, i)
    const w = 3 + st[1] * 0.5
    return `<g data-k="drop" transform="translate(${f1(x)} ${f1(y)})"><path class="rit-body rit-thin" d="${oval(0, 0, w, w * 0.34)}"/></g>`
  }).join('')

  const html =
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="--lw:${lw.toFixed(2)};--dot:${dot.toFixed(2)}">` +
    defs +
    `<rect data-k="dark" width="${W}" height="${H}" fill="url(#${P}-dark)" opacity="0"/>` +
    `<g data-k="world" transform="translate(${ox} ${oy}) scale(${s})">` +
    `<ellipse data-k="warm" cx="${FLOOR.cx}" cy="${FLOOR.cy - 6}" rx="${FLOOR.rx * 1.2}" ry="${FLOOR.ry * 3}" fill="url(#${P}-warm)" opacity="0"/>` +
    circleMarkup('rit-chalk') +
    circleMarkup('rit-magic', ` data-k="magic-glow" opacity="0" filter="url(#${P}-glow)"`) +
    circleMarkup('rit-magic', ' data-k="magic" opacity="0"') +
    candlesBack +
    drops +
    strands + // behind the bears, so they come out of the torn edges
    `<g data-k="bear-a">${bearMarkup(P, 'a')}</g>` +
    `<g data-k="bear-b">${bearMarkup(P, 'b')}</g>` +
    `<g data-k="crack" opacity="0"><path class="rit-magic" d="${jagPath}" pathLength="1" filter="url(#${P}-glow)"/><path class="rit-crack" d="${jagPath}" pathLength="1"/></g>` +
    candlesFront +
    `</g></svg>`

  function bind(host) {
    host.innerHTML = html
    const q = (k, root = host) => root.querySelector(`[data-k="${k}"]`)
    const qa = (k, root = host) => [...root.querySelectorAll(`[data-k="${k}"]`)]
    const world = q('world')
    const dark = q('dark')
    const warm = q('warm')
    const chalk = host.querySelector('.rit-chalk')
    const magic = [q('magic'), q('magic-glow')]
    const drawn = [chalk, ...magic].map((g) => ({ rings: [...g.children].filter((el) => el.tagName === 'path'), runes: [...g.lastElementChild.children] }))
    const flames = qa('flame')
    const smokes = qa('smoke')
    const flameAt = flames.map((el) => el.getAttribute('transform'))
    const crack = q('crack')
    const crackPaths = [...crack.children]
    const strandEls = qa('strand')
    const dropEls = qa('drop')
    const dropRest = dropEls.map((el) => el.getAttribute('transform'))
    const bears = ['a', 'b'].map((which, i) => {
      const root = q(`bear-${which}`)
      return {
        side: i ? 1 : -1,
        pos: q('pos', root),
        jolt: q('jolt', root),
        head: q('head', root),
        front: q('front', root),
        seams: qa('seam', root),
        calm: q('calm', root),
        evil: q('evil', root),
        arm: q('wave', root),
        glow: q('glow', root),
        halo: q('halo', root),
        clip: host.querySelector(`#${P}-c${which} path`),
      }
    })
    // the candles light from the start side (the right) round to the end; flames and smoke are
    // in markup order, back candles first
    const markupOrder = [...CANDLES.keys()].filter((i) => back(CANDLES[i])).concat([...CANDLES.keys()].filter((i) => !back(CANDLES[i])))
    const order = [...CANDLES.keys()].sort((a, b) => floorAt(CANDLES[b][0])[0] - floorAt(CANDLES[a][0])[0]).map((i) => markupOrder.indexOf(i))

    for (const d of drawn) for (const p of d.rings) p.style.strokeDasharray = '1 2'
    for (const p of crackPaths) p.style.strokeDasharray = '1 2'

    return {
      // v: { clock, room, circle, candles, bear } (team-timeline.js).
      apply(v) {
        const t = v.clock.t
        const b = v.bear
        const shake = b.burst > 0 && b.burst < 0.35 ? 2.6 * (1 - b.burst / 0.35) * Math.sin(b.burst * 150) : 0
        world.setAttribute('transform', `translate(${ox + shake * s} ${oy + shake * 0.4 * s}) scale(${s})`)
        dark.setAttribute('opacity', v.room.dark)
        warm.setAttribute('opacity', v.room.dark * clamp01(v.candles.light * 2))

        // the circle draws itself: the rings, then the runes and the star
        const windows = [
          [0, 0.45],
          [0.15, 0.6],
          [0.45, 1],
        ]
        const pulse = b.tear > 0 && b.split < 1 ? 0.75 + 0.25 * Math.sin(t * 30) : 1
        for (const d of drawn) {
          d.rings.forEach((p, i) => (p.style.strokeDashoffset = 1 - clamp01((v.circle.draw - windows[i][0]) / (windows[i][1] - windows[i][0]))))
          d.runes.forEach((r, i) => r.setAttribute('opacity', v.circle.draw >= 0.35 + (0.6 * i) / d.runes.length ? 1 : 0))
        }
        magic[0].setAttribute('opacity', v.circle.glow)
        magic[1].setAttribute('opacity', v.circle.glow * pulse)

        // the candles: lit one by one, flickering, then out with a wisp of smoke
        order.forEach((i, n) => {
          const lit = clamp01(v.candles.light * CANDLES.length - n)
          const out = clamp01(v.candles.out * 1.6 - n * 0.12)
          const flicker = 1 + 0.14 * Math.sin(t * 23 + i * 1.7) + 0.07 * Math.sin(t * 41 + i)
          const k = ease.settle(lit) * (1 - ease.out(out))
          flames[i].setAttribute('opacity', k > 0.01 ? 1 : 0)
          flames[i].setAttribute('transform', `${flameAt[i]} scale(${k * (1 + 0.05 * Math.sin(t * 31 + i))} ${k * flicker})`)
          smokes[i].setAttribute('opacity', 0.7 * Math.sin(Math.PI * out))
          smokes[i].setAttribute('transform', `translate(0 ${-8 * out})`)
        })

        // unease: twitches, the head tilts too far and snaps back; it trembles while it tears
        const u = b.uneasy
        const spike = (c, w = 0.03) => Math.exp(-(((u - c) / w) ** 2))
        let rot = u > 0 && u < 1 ? 5 * spike(0.12) - 4 * spike(0.4) + 6 * spike(0.93, 0.02) : 0
        if (b.tear > 0 && b.split < 0.14) rot += 1.4 * Math.sin(t * 95)
        const tilt = u >= 1 ? 0 : 26 * ease.out(clamp01((u - 0.2) / 0.55)) * (1 - clamp01((u - 0.85) / 0.06))
        const jolt = `rotate(${rot.toFixed(2)})`

        // the rip: the crack runs down, then the halves are pulled apart and lean away
        crackPaths.forEach((p) => (p.style.strokeDashoffset = 1 - b.tear))
        crack.setAttribute('opacity', b.tear > 0 && b.split < 0.04 ? 1 : 0)
        crack.setAttribute('transform', `translate(${FLOOR.cx} ${SEAT}) ${jolt}`)

        // goo stretches between the halves, thins to a thread and snaps; the ends spring back
        // and droop, and a drop falls and splats on the floor
        STRANDS.forEach((st, i) => {
          const [, w0, snap] = st
          const el = strandEls[i]
          const drop = dropEls[i]
          const sp = b.split
          if (sp <= 0 || b.grow > 0) {
            el.setAttribute('opacity', 0)
            drop.setAttribute('opacity', sp <= 0 ? 0 : 1)
            drop.setAttribute('transform', dropRest[i])
            return
          }
          const { A, B, M } = strandAt(st, sp)
          el.setAttribute('opacity', 1)
          if (sp < snap) {
            const thin = Math.max(0.09, (1 - sp / snap) ** 1.3)
            const wobble = 1 + 0.12 * Math.sin(t * 40 + i)
            el.setAttribute('d', goo(A, M, B, w0 * 2.2, w0 * thin * wobble, w0 * 2.2))
            drop.setAttribute('opacity', 0)
            return
          }
          const e = clamp01((sp - snap) / Math.max(0.12, 1 - snap))
          const recoil = ease.land(e)
          const len = 0.42 * (1 - recoil * 0.75)
          const end = (from) => [from[0] + (M[0] - from[0]) * len, from[1] + (M[1] - from[1]) * len + 9 * recoil]
          const mid = (a, z) => [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2 + 2]
          const tipA = end(A)
          const tipB = end(B)
          const w = w0 * 2.2 * (1 - recoil * 0.5)
          const tip = Math.max(1.2, w0 * 0.5 * (1 - recoil))
          el.setAttribute('d', goo(A, mid(A, tipA), tipA, w, w * 0.55, tip) + goo(tipB, mid(tipB, B), B, tip, w * 0.55, w))
          // the drop falls from where the strand snapped, stretched, and splats
          const [lx, ly] = dropAt(st, i)
          const from = strandAt(st, snap).M
          const fall = clamp01(e * 1.6)
          const y = from[1] + (ly - from[1]) * fall * fall
          drop.setAttribute('opacity', 1)
          drop.setAttribute('transform', `translate(${f1(lx)} ${f1(y)})${fall < 1 ? ` scale(${0.4 + 0.25 * fall} ${2.6 - fall})` : ''}`)
        })

        // regrowth: each grows back what it lost, in fits and starts, stitched on
        const g = b.grow >= 1 ? GROW : GROW * ((Math.floor(b.grow * 7) / 7) * 0.6 + b.grow * 0.4)
        const torn = b.split > 0 && b.grow < 1
        bears.forEach((bear) => {
          const { side } = bear
          const lean = side * 11 * Math.sin(Math.PI * b.split)
          const tremble = torn && b.grow > 0 ? 0.7 * Math.sin(t * 70 + side) : 0
          bear.pos.setAttribute('transform', `translate(${FLOOR.cx + side * APART * b.split + tremble} ${SEAT}) rotate(${lean.toFixed(2)})`)
          bear.jolt.setAttribute('transform', jolt)
          bear.clip.setAttribute('transform', `translate(${-side * g} 0)`)
          bear.front.setAttribute('opacity', torn ? 1 : 0)
          bear.front.setAttribute('transform', `translate(${-side * g} 0)`)
          for (const seam of bear.seams) seam.setAttribute('opacity', clamp01((g - 4) / 8))
          // the evil one's eyes catch, flicker and burn; its head stays tilted. The angel's halo comes down.
          let headTilt = tilt
          if (bear.evil) {
            const i = b.ignite
            const on = i <= 0 ? 0 : i < 0.2 ? i * 5 : i < 0.34 ? 0.15 : i < 0.5 ? 1 : i < 0.58 ? 0.35 : 1
            bear.evil.setAttribute('opacity', on)
            bear.calm.setAttribute('opacity', 1 - Math.min(1, on * 1.5))
            headTilt += EVIL_TILT * ease.out(i)
          }
          if (bear.halo) {
            const h = b.halo
            bear.halo.setAttribute('opacity', clamp01(h * 2))
            bear.halo.setAttribute('transform', `translate(0 ${-18 * (1 - ease.land(h))})`)
          }
          bear.head.setAttribute('transform', `rotate(${headTilt.toFixed(2)} ${NECK[0]} ${NECK[1]})`)
        })
      },

      // The idle loop once it has played (t: seconds into the loop): they sway their heads and
      // take turns waving at you; the evil one's eyes pulse and the halo bobs.
      idle(t) {
        const pulseEye = 0.65 + 0.35 * Math.sin(t * 2.4)
        bears.forEach((bear, i) => {
          const { side } = bear
          const cycle = (t + (i ? 0.6 : 4.2)) % 7.2 // the angel waves first
          const raise = ease.out(clamp01(cycle / 0.5)) * (1 - ease.draw(clamp01((cycle - 2.6) / 0.5)))
          const swing = raise * 14 * Math.sin(((cycle - 0.4) * Math.PI * 2) / 0.65)
          const arm = -side * (raise * 105 + swing) // out to the side, clear of the face
          bear.arm.setAttribute('transform', `rotate(${arm.toFixed(2)} ${bear.arm.dataset.x} ${bear.arm.dataset.y})`)
          const tilt = (bear.evil ? EVIL_TILT : 0) + 6 * Math.sin(t * 0.9 + i * 2.1) + side * 9 * raise
          bear.head.setAttribute('transform', `rotate(${tilt.toFixed(2)} ${NECK[0]} ${NECK[1]})`)
          bear.glow?.setAttribute('opacity', pulseEye)
          bear.halo?.setAttribute('transform', `translate(0 ${(1.6 * Math.sin(t * 2)).toFixed(2)})`)
        })
      },

      // The finished state, which is what the markup was built as.
      reset() {
        host.innerHTML = html
      },
    }
  }

  return { mount: bind }
}
