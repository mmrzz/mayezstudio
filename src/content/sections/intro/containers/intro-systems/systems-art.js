// Receipt 1's scene: «۴ سامانهٔ دولتی ساخته‌ایم», counted in a retro game. A pixel-art builder pushes
// the first crate in along the ground, three more drop onto it (dust, a screen bump), he startles,
// then cheers beside the pile of four, under a sunset with a tree, hills and clouds. Everything is
// sprites on a crisp SVG at a whole-number scale (core/pixel.js), moved in whole game pixels, so it
// stays a game. Its colours are the `--px-*` tokens in style.css, which have a dusk twin.
//
// The markup this builds is the finished state: the pile and the man standing proud. apply(values)
// moves things while the timeline plays (systems-timeline.js); idle(t) carries on after it: he
// hops onto the pile, lies back on a crate and whistles; reset() puts the finished state back.
import { INTRO } from '../../../../../config.js'
import { ease, clamp01 } from '../../../../../core/timeline.js'
import { createGrid, noise, paths } from '../../../../../core/pixel.js'
import { DROPS } from './systems-timeline.js'

const GROUND = 10 // game pixels of ground under everything
const STEP = 23 // crates sit this far apart, so their outlines share a line
const CRATE = 26 // a crate's sprite grid: 24 visible pixels and a margin
const MAN = { w: 34, h: 40 }
const TREE = { w: 42, h: 54 }
const PILE_W = 2 * STEP + 24
const PILE_H = STEP + 24

// ---------- Sprites ----------
// Keys are CSS classes px-<key> (intro.css maps each to a token): o outline; sk ss skin; hr hair;
// ht hh hs hard hat; sh sd sl shirt; pa pd trousers; bt boots; wl wm wd wood; nl nail; lb label;
// tk tl td trunk; lh lf ld leaves; fr fruit; gh gr gd grass; dt dd pb dirt; cl cs cloud; su sg sun;
// a accent (dust and sparkles, the only violet, and only while it moves).

function crateSprite() {
  const g = createGrid(CRATE, CRATE)
  g.rect(2, 2, 23, 23, 'wl')
  g.rect(2, 2, 23, 4, 'wm').rect(2, 21, 23, 23, 'wm').rect(2, 2, 4, 23, 'wm').rect(21, 2, 23, 23, 'wm') // the frame
  g.rect(5, 5, 20, 5, 'wd').rect(5, 5, 5, 20, 'wd') // its shadow on the planks
  g.rect(10, 6, 10, 20, 'wd').rect(15, 6, 15, 20, 'wd') // gaps between planks
  for (const [x, y] of [[7, 9], [8, 15], [12, 8], [13, 17], [17, 10], [18, 16], [7, 18], [12, 13]]) g.px(x, y, 'wm') // grain
  g.rect(2, 23, 23, 23, 'wd').rect(23, 2, 23, 23, 'wd') // the lit edge and the shaded one
  g.rect(2, 2, 23, 2, 'wl')
  g.rect(7, 7, 18, 18, 'wd').rect(8, 8, 17, 17, 'lb') // the label
  for (let i = 0; i < 8; i++) g.px(15 - i, 9 + i, 'o').px(16 - i, 9 + i, 'o') // the logo's slash on it
  for (const [x, y] of [[3, 3], [22, 3], [3, 22], [22, 22]]) g.px(x, y, 'nl')
  return g.outline('o')
}

// Facing the start side (left, in the game). Feet end on row 37, the outline on row 38.
function manSprite(pose) {
  const g = createGrid(MAN.w, MAN.h)
  const push = pose === 'pushA' || pose === 'pushB'
  const cheer = pose === 'cheer'
  const ox = 3 // room for a reaching hand and raised arms
  const R = (x0, y0, x1, y1, k) => g.rect(x0 + ox, y0, x1 + ox, y1, k)
  const P = (x, y, k) => g.px(x + ox, y, k)

  // legs, boots
  const legFwd = (x) => {
    R(x - 1, 30, x + 3, 32, 'pa')
    R(x - 3, 33, x + 1, 35, 'pa')
    R(x + 1, 30, x + 3, 35, 'pd')
    R(x - 5, 36, x + 1, 37, 'bt')
  }
  const legBack = (x) => {
    R(x + 1, 30, x + 5, 32, 'pa')
    R(x + 3, 33, x + 7, 35, 'pa')
    R(x + 5, 30, x + 7, 35, 'pd')
    R(x + 3, 36, x + 9, 37, 'bt')
  }
  if (push) {
    if (pose === 'pushA') {
      legFwd(8)
      legBack(14)
    } else {
      legBack(7)
      legFwd(14)
    }
  } else {
    R(8, 30, 12, 35, 'pa')
    R(12, 30, 12, 35, 'pd')
    R(14, 30, 19, 35, 'pa')
    R(19, 30, 19, 35, 'pd')
    R(6, 36, 12, 37, 'bt')
    R(14, 36, 20, 37, 'bt')
  }

  // back arm (behind the body)
  if (!cheer) {
    if (push) R(8, 22, 14, 23, 'sd')
    else {
      R(20, 20, 22, 27, 'sd')
      R(20, 28, 22, 30, 'ss')
    }
  }

  // torso, leaning forward when pushing: the top is further forward than the belt
  for (let r = 19; r <= 29; r++) {
    const dx = push ? Math.min(-1, -3 + Math.floor((r - 19) / 4)) : 0
    R(8 + dx, r, 19 + dx, r, 'sh')
    R(16 + dx, r, 19 + dx, r, 'sd')
    if (r > 19 && r < 28) R(8 + dx, r, 8 + dx, r, 'sl')
    if (r <= 20) R(11 + dx, r, 16 + dx, r, 'sl') // the collar
    if (r >= 28) {
      R(8 + dx, r, 19 + dx, r, 'bt') // the belt
      R(12 + dx, r, 14 + dx, r, 'ht') // and its buckle
    }
  }

  // front arm
  if (cheer) {
    for (let i = 0; i <= 6; i++) {
      const y = 20 - Math.round(i * 1.1)
      R(6 - i, y, 8 - i, y + 1, 'sh')
      R(19 + i, y, 21 + i, y + 1, 'sd')
    }
    R(0, 10, 3, 13, 'sk')
    R(22, 10, 25, 13, 'sk')
  } else if (push) {
    R(3, 21, 9, 23, 'sh')
    R(3, 23, 9, 23, 'sd')
    R(3, 21, 4, 22, 'sl')
    R(0, 20, 2, 24, 'sk')
    R(2, 21, 2, 24, 'ss')
  } else {
    R(5, 20, 7, 27, 'sh')
    R(7, 21, 7, 27, 'sd')
    R(5, 26, 7, 27, 'sl')
    R(5, 28, 7, 30, 'sk')
    R(7, 28, 7, 30, 'ss')
  }

  // head and hard hat, lowered a little when pushing
  const hx = push ? -3 : 0
  const hy = push ? 1 : 0
  R(10 + hx, 2 + hy, 19 + hx, 3 + hy, 'ht')
  R(9 + hx, 4 + hy, 20 + hx, 6 + hy, 'ht')
  R(11 + hx, 3 + hy, 13 + hx, 4 + hy, 'hh')
  R(5 + hx, 7 + hy, 21 + hx, 7 + hy, 'ht')
  R(5 + hx, 8 + hy, 21 + hx, 8 + hy, 'hs')
  R(12 + hx, 17 + hy, 16 + hx, 18 + hy, 'ss') // neck
  R(9 + hx, 9 + hy, 18 + hx, 16 + hy, 'sk')
  R(17 + hx, 10 + hy, 18 + hx, 16 + hy, 'ss')
  R(18 + hx, 9 + hy, 20 + hx, 12 + hy, 'hr')
  R(19 + hx, 12 + hy, 20 + hx, 14 + hy, 'sk')
  P(10 + hx, 12 + hy, 'o')
  P(10 + hx, 13 + hy, 'o')
  R(10 + hx, 11 + hy, 12 + hx, 11 + hy, 'hr')
  P(9 + hx, 13 + hy, 'ss')
  P(9 + hx, 14 + hy, 'ss')
  if (cheer) R(10 + hx, 15 + hy, 13 + hx, 16 + hy, 'o')
  else R(10 + hx, 15 + hy, 12 + hx, 15 + hy, 'ss')
  return g.outline('o')
}

function treeSprite() {
  const g = createGrid(TREE.w, TREE.h)
  // trunk, roots, a stub of a branch each side
  g.rect(18, 30, 23, 50, 'tk').rect(18, 31, 19, 50, 'tl').rect(22, 31, 23, 50, 'td')
  g.rect(16, 47, 25, 50, 'tk').rect(16, 48, 17, 50, 'tl').rect(24, 48, 25, 50, 'td')
  g.rect(14, 28, 18, 30, 'tk').rect(24, 27, 28, 29, 'tk')
  for (const [x, y] of [[20, 36], [21, 41], [19, 45], [21, 33]]) g.px(x, y, 'td')
  // foliage: discs, lit from the upper left, with a dithered step between tones and a few leaves
  const disc = (cx, cy, r) =>
    g.circle(cx, cy, r, (x, y) => {
      const u = ((cx - x) * 0.55 + (cy - y) * 0.85) / r
      const n = noise(x, y)
      const checker = (x + y) % 2 === 0
      let key = u > 0.5 ? 'lh' : u > -0.1 ? 'lf' : 'ld'
      if (Math.abs(u - 0.5) < 0.1 && checker) key = key === 'lh' ? 'lf' : 'lh'
      if (Math.abs(u + 0.1) < 0.1 && checker) key = key === 'lf' ? 'ld' : 'lf'
      if (key === 'lf' && n > 0.93) key = 'ld'
      if (key === 'lf' && n < 0.04) key = 'lh'
      return key
    })
  disc(11, 23, 10)
  disc(31, 23, 10)
  disc(21, 25, 11)
  disc(21, 15, 13)
  for (const [x, y] of [[14, 17], [27, 21], [19, 28], [10, 25]]) g.rect(x, y, x + 1, y + 1, 'fr').px(x, y, 'nl')
  return g.outline('o')
}

function bushSprite() {
  const g = createGrid(26, 14)
  const blob = (cx, cy, r) =>
    g.circle(cx, cy, r, (x, y) => {
      const u = ((cx - x) * 0.55 + (cy - y) * 0.85) / r
      return u > 0.45 ? 'lh' : u > -0.15 ? 'lf' : 'ld'
    })
  blob(8, 8, 6)
  blob(18, 8, 6)
  blob(13, 6, 6)
  for (const [x, y] of [[6, 9], [12, 5], [19, 8], [15, 10]]) g.px(x, y, 'fr')
  return g.outline('o')
}

function cloudSprite(wide) {
  const w = wide ? 38 : 26
  const g = createGrid(w, 14)
  const humps = wide ? [[6, 13], [12, 24], [23, 31]] : [[5, 10], [9, 17], [16, 21]]
  g.rect(2, 8, w - 3, 11, 'cl')
  humps.forEach(([x0, x1], i) => g.rect(x0, i === 1 ? 2 : 5, x1, 8, 'cl'))
  g.rect(3, 12, w - 4, 12, 'cs').rect(6, 11, w - 7, 11, 'cs')
  return g
}

function sunSprite() {
  const g = createGrid(28, 28)
  g.circle(14, 14, 12, (x, y) => ((x + y) % 2 === 0 && (x - 14) ** 2 + (y - 14) ** 2 > 64 ? 'sg' : null))
  g.circle(14, 14, 8, 'su')
  return g
}

// Lying back on a crate, head on his hat against the crate above, one leg over the edge and
// the other crossed, its boot tapping (tap: the boot up a pixel). Row 15 lies on the crate's top.
const LIE = { w: 40, h: 26, base: 15, mouth: [11, 3] }
function lieSprite(tap) {
  const g = createGrid(LIE.w, LIE.h)
  const R = (x0, y0, x1, y1, k) => g.rect(x0 + 1, y0, x1 + 1, y1, k)
  const P = (x, y, k) => g.px(x + 1, y, k)
  // the hat as a pillow
  R(1, 11, 8, 13, 'ht')
  R(2, 11, 3, 11, 'hh')
  R(0, 14, 9, 14, 'hs')
  // the leg over the edge
  R(24, 10, 27, 13, 'pa')
  R(25, 13, 28, 21, 'pa')
  R(28, 13, 28, 21, 'pd')
  R(24, 22, 30, 23, 'bt')
  // torso, belt and buckle
  R(13, 8, 24, 13, 'sh')
  R(14, 8, 22, 8, 'sl')
  R(13, 13, 24, 13, 'sd')
  R(22, 8, 23, 13, 'bt')
  R(22, 10, 23, 11, 'ht')
  // head, face up: hair at the back, the nose, an eye and lips pursed to whistle
  R(5, 4, 12, 11, 'sk')
  R(6, 11, 11, 11, 'ss')
  R(12, 6, 12, 10, 'ss')
  R(5, 5, 6, 10, 'hr')
  R(8, 3, 9, 3, 'sk')
  P(8, 6, 'o')
  P(11, 3, 'o')
  P(11, 4, 'ss')
  // the arms folded behind his head, elbows up
  R(12, 1, 14, 4, 'sh')
  R(14, 1, 14, 4, 'sd')
  R(13, 5, 15, 8, 'sh')
  // the crossed leg, knee up, boot tapping
  for (let i = 0; i <= 4; i++) R(23 + i, 9 - i, 25 + i, 11 - i, 'pa')
  R(28, 4, 33, 6, 'pa')
  R(28, 6, 33, 6, 'pd')
  R(34, 2 - tap, 36, 7 - tap, 'bt')
  return g.outline('o')
}

// A whistled note, violet while it floats up: one note, or two joined by a beam.
function noteSprite(pair) {
  const g = createGrid(pair ? 10 : 7, 10)
  const note = (x) => g.rect(x + 1, 6, x + 3, 8, 'a').rect(x + 3, 1, x + 3, 7, 'a') // a head and its stem
  note(0)
  if (pair) note(5).rect(4, 1, 8, 2, 'a') // the beam
  else g.px(4, 1, 'a').px(5, 2, 'a').px(5, 3, 'a') // the flag
  return g
}

function starSprite() {
  const g = createGrid(7, 7)
  g.rect(3, 0, 3, 6, 'a').rect(0, 3, 6, 3, 'a')
  return g
}

// ---------- The scene ----------

let uid = 0
const lerp = (a, b, u) => a + (b - a) * u
const px = Math.round

// Fits the scene to a box of W × H css px: the whole-number scale, the size in game pixels and
// where things go. `top` is how much room the text above needs (px from the box's top) and
// `textLeft` where it starts (px from the box's left); strip: the text is beside the scene, which
// keeps to the end side.
export function fit(W, H, { top = 0, strip = false } = {}) {
  const need = PILE_H + GROUND + 4
  const scale = strip ? Math.max(1, Math.min(6, Math.floor(H / need))) : Math.max(2, Math.min(6, Math.floor(Math.min((H - top) / need, W / 150))))
  const LW = Math.ceil(W / scale)
  const LH = Math.ceil(H / scale)
  const ground = LH - GROUND
  const tail = 10 + 28 // the gap and the man at rest, after the pile
  const withTree = !strip && LW >= TREE.w + 8 + PILE_W + tail + 16
  let treeX = null
  let P0
  if (strip) P0 = 6
  else if (withTree) {
    treeX = Math.round((LW - (TREE.w + 8 + PILE_W + tail)) / 2)
    P0 = treeX + TREE.w + 8
  } else P0 = Math.round((LW - (PILE_W + tail)) / 2)
  return { scale, LW, LH, ground, P0, treeX }
}

export function createScene(W, H, opts) {
  const f = fit(W, H, opts)
  const { scale, LW, LH, ground, P0, treeX } = f
  const strip = !!opts?.strip
  const c = INTRO.systems
  const id = `px${++uid}`
  const sec = (ms) => ms / 1000
  const at = ([x, y]) => `translate(${x} ${y})`

  // The crates' sprite origins (a pixel up and left of their visible edge) and the man's.
  const crateY = ground - 25
  const slot = {
    A: [P0 - 1, crateY],
    B: [P0 + STEP - 1, crateY],
    C: [P0 + 2 * STEP - 1, crateY],
    D: [P0 + STEP - 1, crateY - STEP],
  }
  const manY = ground - 38
  const standAt = (back) => slot.C[0] + 20 + px(7 * back) // the man's origin: close to the pile, then a step back
  const drops = ['B', 'A', 'D'] // the crates that fall, in order
  if (drops.length !== DROPS) throw new Error('systems-art.js and DROPS in systems-timeline.js disagree')
  const entry = LW + 8 // the first crate's origin as it comes in from outside the stage
  const manRest = standAt(1)

  // ---------- Backdrop: sky in bands with dithered steps, stars, sun, hills ----------
  const bounds = [0, 0.26, 0.46, 0.64, 0.8, 1].map((q) => Math.round(ground * q))
  let backdrop = ''
  for (let i = 0; i < 5; i++) backdrop += `<path class="px-s${i}" d="M0 ${bounds[i]}h${LW}v${bounds[i + 1] - bounds[i]}h-${LW}z"/>`
  for (let i = 1; i < 5; i++) {
    let d = ''
    for (let x = 0; x < LW; x++) {
      if (x % 2 === 0) d += `M${x} ${bounds[i] - 1}h1v1h-1z`
      if (x % 4 === 1) d += `M${x} ${bounds[i] - 3}h1v1h-1z`
      if (x % 4 === 3) d += `M${x} ${bounds[i] - 2}h1v1h-1z`
    }
    backdrop += `<path class="px-s${i}" d="${d}"/>`
  }
  let stars = ''
  for (let n = 0; n < 26; n++) {
    const x = px(noise(n, 1.7) * LW)
    const y = px(noise(n, 4.2) * bounds[2] * 0.9)
    stars += `M${x} ${y}h1v1h-1z`
  }
  backdrop += `<path class="px-star" d="${stars}"/>`
  // the sun (a moon at dusk) low on the far horizon, half behind the hills
  backdrop += `<g transform="${at([LW - 26, ground - 32])}">${paths(sunSprite())}</g>`
  const hills = (wave) => {
    let d = ''
    for (let x = 0; x < LW; x++) {
      const h = Math.max(1, px(wave(x)))
      d += `M${x} ${ground - h}v${h}h1v-${h}z`
    }
    return d
  }
  backdrop += `<path class="px-h1" d="${hills((x) => 11 + 5 * Math.sin(x * 0.045 + 1) + 3 * Math.sin(x * 0.13))}"/>`
  backdrop += `<path class="px-h2" d="${hills((x) => 5 + 3 * Math.sin(x * 0.08 + 2) + 2 * Math.sin(x * 0.21))}"/>`

  // Clouds only where the text leaves sky for them.
  const textLeft = (opts?.textLeft ?? Infinity) / scale
  const clouds = strip
    ? ''
    : [
        ['cloud1', Math.round(LW * 0.05), 6, 38],
        ['cloud2', Math.round(LW * 0.24), 18, 26],
      ]
        .filter(([, x, , w]) => x + w + 3 < textLeft)
        .map(([k, x, y]) => `<use href="#${id}-${k}" transform="${at([x, y])}"/>`)
        .join('')

  // ---------- Ground: grass, then dirt with stones; tufts and flowers ----------
  let soil = `<path class="px-gh" d="M0 ${ground}h${LW}v1h-${LW}z"/><path class="px-gr" d="M0 ${ground + 1}h${LW}v1h-${LW}z"/><path class="px-gd" d="M0 ${ground + 2}h${LW}v1h-${LW}z"/><path class="px-dt" d="M0 ${ground + 3}h${LW}v${GROUND - 3}h-${LW}z"/>`
  let dirt = ''
  let pebbles = ''
  let tufts = ''
  for (let x = 0; x < LW; x++) {
    if (noise(x, 9.1) > 0.78) dirt += `M${x} ${ground + 4 + px(noise(x, 3.3) * 5)}h2v1h-2z`
    if (noise(x, 5.5) > 0.93) pebbles += `M${x} ${ground + 5 + px(noise(x, 8.8) * 3)}h2v1h-2zM${x} ${ground + 6 + px(noise(x, 8.8) * 3)}h1v1h-1z`
    if (x % 5 === 2 && noise(x, 2.2) > 0.3) tufts += `M${x} ${ground - 2}h1v2h-1zM${x + 1} ${ground - 1}h1v1h-1z`
  }
  soil += `<path class="px-dd" d="${dirt}"/><path class="px-pb" d="${pebbles}"/><path class="px-gr" d="${tufts}"/>`
  // flowers where the pile, the man and the tree are not
  const taken = (x) => (treeX !== null && x > treeX - 2 && x < treeX + TREE.w + 2) || (x > P0 - 3 && x < P0 + PILE_W + 3) || (x > manRest - 3 && x < manRest + 30)
  let flowers = ''
  for (let x = 4; x < LW - 4; x += Math.max(9, Math.round(LW / 18))) {
    const fx = x + px(noise(x, 6.6) * 4)
    if (taken(fx) || taken(fx + 2)) continue
    const colour = noise(x, 1.1) > 0.5 ? 'fr' : 'su'
    flowers += `<path class="px-gd" d="M${fx + 1} ${ground - 3}h1v3h-1z"/><path class="px-${colour}" d="M${fx} ${ground - 5}h3v2h-3zM${fx + 1} ${ground - 6}h1v1h-1z"/>`
  }

  const sprites = ['stand', 'cheer', 'pushA', 'pushB']
  const defs =
    `<g id="${id}-crate">${paths(crateSprite())}</g>` +
    sprites.map((p) => `<g id="${id}-${p}">${paths(manSprite(p))}</g>`).join('') +
    `<g id="${id}-star">${paths(starSprite())}</g>` +
    `<g id="${id}-lieA">${paths(lieSprite(0))}</g><g id="${id}-lieB">${paths(lieSprite(1))}</g>` +
    `<g id="${id}-note1">${paths(noteSprite(false))}</g><g id="${id}-note2">${paths(noteSprite(true))}</g>` +
    `<g id="${id}-cloud1">${paths(cloudSprite(true))}</g><g id="${id}-cloud2">${paths(cloudSprite(false))}</g>` +
    `<g id="${id}-tree">${paths(treeSprite())}</g><g id="${id}-bush">${paths(bushSprite())}</g>`
  const starSpots = [
    [P0 - 8, ground - 62],
    [P0 + PILE_W - 2, ground - 66],
    [P0 + 34, ground - 74],
    [P0 + PILE_W + 8, ground - 44],
  ]
  const bushX = manRest + 34
  // lying on the crate pushed in, head against the one on top of the pile
  const lieAt = [slot.C[0] - 4, crateY + 1 - LIE.base]
  const html =
    `<svg class="px" viewBox="0 0 ${LW} ${LH}" width="${LW * scale}" height="${LH * scale}" shape-rendering="crispEdges">` +
    `<defs>${defs}</defs><g class="px-world">` +
    backdrop +
    clouds +
    soil +
    flowers +
    (treeX === null ? '' : `<use href="#${id}-tree" transform="${at([treeX, ground - 51])}"/>`) +
    (strip || bushX + 28 > LW ? '' : `<use href="#${id}-bush" transform="${at([bushX, ground - 12])}"/>`) +
    // the pile at rest: the three that fall, then the one that was pushed in
    ['A', 'B', 'C', 'D'].map((k) => `<use class="px-crate" data-k="${k}" href="#${id}-crate" transform="${at(slot[k])}"/>`).join('') +
    sprites.map((p) => `<use class="px-man" data-pose="${p}" href="#${id}-${p}" transform="${at([manRest, manY])}"${p === 'stand' ? '' : ' visibility="hidden"'}/>`).join('') +
    ['lieA', 'lieB'].map((p) => `<use class="px-man" data-pose="${p}" href="#${id}-${p}" transform="${at(lieAt)}" visibility="hidden"/>`).join('') +
    [1, 2, 1].map((n) => `<use class="px-note" href="#${id}-note${n}" visibility="hidden"/>`).join('') +
    Array.from({ length: 12 }, () => `<rect class="px-fx" width="3" height="3" opacity="0"/>`).join('') +
    starSpots.map(([x, y]) => `<use class="px-spark" href="#${id}-star" transform="${at([x, y])}" opacity="0"/>`).join('') +
    `</g></svg>`

  function bind(host) {
    host.innerHTML = html
    const $$ = (s) => [...host.querySelectorAll(s)]
    const world = host.querySelector('.px-world')
    const crates = Object.fromEntries($$('.px-crate').map((el) => [el.dataset.k, el]))
    const men = Object.fromEntries($$('.px-man').map((el) => [el.dataset.pose, el]))
    const fx = $$('.px-fx')
    const sparks = $$('.px-spark')
    const notes = $$('.px-note')
    const place = (el, [x, y]) => el.setAttribute('transform', at([px(x), px(y)]))

    // One crate falling (i-th of the three): its progress through the drop, 0 to 1, and ms since it landed.
    const total = sec((drops.length - 1) * c.drop.stagger + c.drop.each)
    const dropState = (progress, i) => {
      const elapsed = progress * total - i * sec(c.drop.stagger)
      return { p: clamp01(elapsed / sec(c.drop.each)), since: (elapsed - sec(c.drop.each)) * 1000 }
    }

    return {
      // v: the timeline's values (systems-timeline.js).
      apply(v) {
        const m = v.man
        // the crate pushed in, and the man behind it
        const crate1 = [lerp(entry, slot.C[0], ease.out(m.push)), slot.C[1]]
        place(crates.C, crate1)

        // the crates that fall; each lands with dust, and the first startles him
        let bump = 0
        let startled = false
        let hop = 0
        fx.forEach((el) => el.setAttribute('opacity', 0))
        drops.forEach((k, i) => {
          const { p, since } = dropState(v.drop.p, i)
          const [sx, sy] = slot[k]
          const y = lerp(-CRATE - 2, sy, ease.fall(p))
          place(crates[k], [sx, p >= 1 && since >= 0 && since < c.land.bump ? sy + 1 : y])
          crates[k].setAttribute('visibility', p > 0 ? 'visible' : 'hidden')
          if (since >= 0 && since < c.land.dust) {
            const d = since / c.land.dust
            if (since < c.land.bump) bump = 1
            for (let n = 0; n < 4; n++) {
              const el = fx[i * 4 + n]
              const dir = n < 2 ? -1 : 1
              const far = n % 2 ? 1 : 0.55
              const baseY = k === 'D' ? sy + CRATE - 3 : ground - 4
              el.setAttribute('transform', `translate(${px(sx + 11 + dir * (8 + 14 * d * far))} ${px(baseY - 8 * Math.sin(d * Math.PI) * far)})`)
              el.setAttribute('opacity', 1 - d)
            }
          }
          if (i === 0 && since >= 0 && since < c.land.startle) {
            startled = true
            hop = since < c.land.startle * 0.5 ? 3 : 0
          }
        })
        world.setAttribute('transform', `translate(0 ${bump})`)

        // the man
        let pose = 'stand'
        let x = standAt(m.back)
        let y = manY
        if (m.push < 1) {
          pose = Math.floor((m.push * c.push.for) / c.push.step) % 2 ? 'pushB' : 'pushA'
          x = crate1[0] + 22
        } else if (m.back > 0 && m.back < 1) {
          y -= Math.floor(m.back * 6) % 2 // little hops as he backs away
        }
        if (m.cheer > 0 && m.cheer < 1) {
          pose = 'cheer'
          y -= 11 * Math.abs(Math.sin(m.cheer * 2 * Math.PI))
        } else if (startled) {
          pose = 'cheer'
          y -= hop
        }
        for (const [p, el] of Object.entries(men)) {
          el.setAttribute('visibility', p === pose ? 'visible' : 'hidden')
          if (p === pose) place(el, [x, y])
        }

        // sparkles over the finished pile, twinkling, then gone
        sparks.forEach((el, i) => {
          const s = v.fx.sparkle
          el.setAttribute('opacity', s > 0 && s < 1 && Math.floor(s * 12 + i) % 2 === 0 ? 1 : 0)
        })
      },

      // The idle loop once it has played (t: seconds into it): he hops onto the pile, lies back
      // on the crate and whistles, tapping a boot, notes floating up.
      idle(t) {
        const hop = clamp01((t - 0.4) / 0.6)
        let pose = 'stand'
        let x = manRest
        let y = manY
        if (hop > 0 && hop < 1) {
          pose = 'cheer'
          const land = [lieAt[0] + 6, crateY + 1 - (MAN.h - 2)]
          x = lerp(manRest, land[0], hop)
          y = lerp(manY, land[1], hop) - 16 * Math.sin(Math.PI * hop)
        } else if (hop >= 1) {
          pose = Math.floor(t / 0.42) % 2 ? 'lieB' : 'lieA'
          ;[x, y] = lieAt
        }
        for (const [p, el] of Object.entries(men)) {
          el.setAttribute('visibility', p === pose ? 'visible' : 'hidden')
          if (p === pose) place(el, [x, y])
        }
        const whistle = t - 1.6
        notes.forEach((el, k) => {
          const age = whistle - k * 0.9
          const a = age - 2.7 * Math.floor(age / 2.7) // each note's life, 2.7 s, one after another
          const on = whistle >= 0 && age >= 0 && a < 2.1 && !(a > 1.6 && Math.floor(a * 10) % 2)
          el.setAttribute('visibility', on ? 'visible' : 'hidden')
          if (on) place(el, [lieAt[0] + LIE.mouth[0] + 2 + 7 * a + 2 * Math.sin(a * 3 + k), lieAt[1] + LIE.mouth[1] - 9 - 10 * a])
        })
      },

      // The finished state, which is what the markup was built as.
      reset() {
        host.innerHTML = html
      },
    }
  }

  return { mount: bind, scale: f.scale, size: [LW * scale, LH * scale] }
}
