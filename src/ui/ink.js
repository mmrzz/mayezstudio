// The theme change's mask: the new theme bleeds out from the click like ink in
// water. One animated SVG (SMIL, so the browser runs it without JS per frame) is
// made per click, with its own random seeds and tendrils, so no two spreads look
// the same. It is an alpha mask: only the shapes matter, never their colour.
//
// Layers, from the back:
//   haze   a faint, mottled cloud that leads the ink along the same lobes
//   wisps  thin curved tendrils drawn out ahead of it
//   core   the ink itself: solid lobes running out unevenly plus a central
//          bloom; covers the screen by the end
//   fill   fades in over the last quarter, so no speck is left uncovered
// Each layer is pushed twice by noise: by slow noise into big billows, then by
// "curl" noise (fine noise displaced by the slow noise, i.e. domain warping)
// into curly edges. The curl's pull grows over time, so the edges keep turning
// while the ink spreads.

const f = (n) => +n.toFixed(1)
const between = (a, b) => a + Math.random() * (b - a)
const seed = () => Math.floor(between(1, 9999))

// SMIL animation of one attribute; spline easing, frozen at the end.
function anim(attr, from, to, dur, { begin = 0, spline = '0.4 0.1 0.6 1' } = {}) {
  return `<animate attributeName="${attr}" values="${from};${to}" begin="${f(begin)}ms" dur="${f(dur)}ms" calcMode="spline" keyTimes="0;1" keySplines="${spline}" fill="freeze"/>`
}

// opts: flow (slow noise frequency, from -> to), detail (fine noise frequency),
// curl (how far the slow noise drags the fine one, from -> to), billow and edge
// (how far the shape is pushed by the slow and the curled noise: big lobes,
// then curly detail), blur, mottle (true: thin the layer into streaks), drift
// (px the noise travels).
function warp(id, w, h, dur, opts) {
  const { flow, detail, curl, billow, edge, blur, mottle, drift } = opts
  const a = between(0, Math.PI * 2)
  const slow = { spline: '0.3 0 0.7 1' }
  // Padded: an edge pixel pulls its colour from up to `stray` px away, and outside the region there is none.
  const pad = Math.ceil(stray(opts))
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${-pad}" y="${-pad}" width="${w + 2 * pad}" height="${h + 2 * pad}" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${flow[0]}" numOctaves="2" seed="${seed()}" result="flow">${anim('baseFrequency', flow[0], flow[1], dur, slow)}</feTurbulence>
<feTurbulence type="fractalNoise" baseFrequency="${detail}" numOctaves="2" seed="${seed()}" result="detail"/>
<feDisplacementMap in="detail" in2="flow" xChannelSelector="R" yChannelSelector="G" result="curl">${anim('scale', curl[0], curl[1], dur, slow)}</feDisplacementMap>
<feOffset in="curl" result="moved">${anim('dx', 0, f(Math.cos(a) * drift), dur, slow)}${anim('dy', 0, f(Math.sin(a) * drift), dur, slow)}</feOffset>
<feDisplacementMap in="SourceGraphic" in2="flow" xChannelSelector="G" yChannelSelector="B" result="lobes">${anim('scale', billow[0], billow[1], dur)}</feDisplacementMap>
<feDisplacementMap in="lobes" in2="moved" xChannelSelector="R" yChannelSelector="B" result="shape">${anim('scale', edge[0], edge[1], dur)}</feDisplacementMap>
${mottle ? '<feColorMatrix in="moved" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 3.2 0 0 -1.1" result="streaks"/><feComposite in="shape" in2="streaks" operator="in" result="shape"/>' : ''}
<feGaussianBlur in="shape">${anim('stdDeviation', blur[0], blur[1], dur)}</feGaussianBlur>
</filter>`
}

// A blob carried out from the click: x, y to `to`, growing to radius r, over t ms.
function blob(x, y, to, r, t, begin = 0) {
  const out = { begin, spline: '0.35 0.3 0.55 1' }
  return `<circle cx="${f(x)}" cy="${f(y)}" r="0">${anim('cx', f(x), f(to.x), t, out)}${anim('cy', f(y), f(to.y), t, out)}${anim('r', 0, f(r), t, out)}</circle>`
}

// A tendril: an S- or C-curved stroke drawn out from the click; the noise curls it further.
function tendril(x, y, reach, dur, { length, width }) {
  const a = between(0, Math.PI * 2)
  const l = reach * between(...length)
  const [dx, dy] = [Math.cos(a), Math.sin(a)]
  // Control points a third and two thirds along, pushed to either side.
  const side = (k) => between(-0.45, 0.45) * l * k
  const c1 = side(1)
  const c2 = side(1)
  const p = (along, off) => `${f(x + dx * l * along - dy * off)} ${f(y + dy * l * along + dx * off)}`
  const begin = between(0, dur * 0.15)
  const t = dur * between(0.5, 0.8)
  const out = { begin, spline: '0.25 0.5 0.45 1' }
  return `<path d="M${f(x)} ${f(y)}C${p(1 / 3, c1)} ${p(2 / 3, c2)} ${p(1, 0)}" pathLength="1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1" stroke-width="0">${anim('stroke-dashoffset', 1, 0, t, out)}${anim('stroke-width', 0, f(between(...width)), t, out)}</path>`
}

const HAZE = { flow: [0.002, 0.0014], detail: 0.006, curl: [80, 420], billow: [300, 1000], edge: [60, 240], blur: [6, 18], mottle: true, drift: 140 }
const CORE = { flow: [0.0022, 0.0016], detail: 0.007, curl: [60, 320], billow: [300, 1100], edge: [40, 170], blur: [3, 10], drift: 90 }
const WISP = { flow: [0.0024, 0.0016], detail: 0.009, curl: [60, 300], billow: [200, 600], edge: [40, 180], blur: [3, 9], drift: 60 }
// How far a pushed edge strays from its circle (rarely more), so the circles
// grow far enough to cover the corners.
function stray({ billow, edge, blur }) {
  return 0.3 * (billow[1] + edge[1]) + 3 * blur[1]
}

// The SVG for a w x h screen with the ink starting at x, y; fully covered after dur ms.
export function inkSvg(x, y, w, h, dur) {
  const reach = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) // to the farthest corner
  const circle = (r, spline) => `<circle cx="${f(x)}" cy="${f(y)}" r="0">${anim('r', 0, f(r), dur, { spline })}</circle>`

  // Lobes: the ink runs further in some directions than others. The haze leads
  // the core along the same lobes, so the two read as one spreading cloud.
  const lobes = Array.from({ length: 6 }, (_, i) => {
    const a = ((i + between(-0.35, 0.35)) / 6) * Math.PI * 2
    return { a, l: reach * between(0.22, 0.55), r: reach * between(0.16, 0.32), t: dur * between(0.75, 1), begin: between(0, dur * 0.05) }
  })
  const lobed = (grow) =>
    lobes.map(({ a, l, r, t, begin }) => blob(x, y, { x: x + Math.cos(a) * l * grow, y: y + Math.sin(a) * l * grow }, r * grow, t, begin)).join('')
  const tendrils = Array.from({ length: 7 }, () => tendril(x, y, reach, dur, { length: [0.4, 0.95], width: [16, 54] })).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>
${warp('haze', w, h, dur, HAZE)}
${warp('core', w, h, dur, CORE)}
${warp('wisp', w, h, dur, WISP)}
</defs>
<g filter="url(#haze)" opacity="0.45">${circle(reach * 0.9 + stray(HAZE), '0.4 0.2 0.6 1')}${lobed(1.3)}</g>
<g filter="url(#wisp)" opacity="0.55">${tendrils}</g>
<g filter="url(#core)">${circle(reach + stray(CORE), '0.5 0.1 0.65 0.95')}${lobed(1)}</g>
<rect x="0" y="0" width="${w}" height="${h}" opacity="0">${anim('opacity', 0, 1, dur * 0.25, { begin: dur * 0.75, spline: '0.4 0 1 1' })}</rect>
</svg>`
}

// As a CSS mask image, sized to the viewport.
export const inkMask = (x, y, dur) =>
  `url("data:image/svg+xml,${encodeURIComponent(inkSvg(x, y, innerWidth, innerHeight, dur))}")`
