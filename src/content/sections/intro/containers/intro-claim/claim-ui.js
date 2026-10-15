// The interface that builds itself beside the claim (D-016, replaces the drawing of D-017): an
// app window of real DOM, shown first as rough blocks that a cursor places, then snapped into a
// grid and filled with content, then delivered. Its markup, styled in intro.css, is the finished
// state; apply(values) overrides it with inline styles while the timeline plays and reset()
// clears them again. idle(t) keeps the app running afterwards: new orders come in. The sample
// content is a placeholder.
//
// The window lives in a fixed design space (DESIGN, in px) that the container scales and places.
import { INTRO } from '../../../../../config.js'
import { ease, clamp01, wordsFor } from '../../../../../core/timeline.js'
import { PARTS } from './claim-timeline.js'

export const DESIGN = { width: 560, height: 266 }

const FA = '۰۱۲۳۴۵۶۷۸۹'
const fa = (n, d = 0) => {
  const [i, f] = n.toFixed(d).split('.')
  return (i.replace(/\B(?=(\d{3})+(?!\d))/g, '٬') + (f ? '٫' + f : '')).replace(/\d/g, (x) => FA[x])
}

const STATS = [
  { label: 'سفارش امروز', v: 1248, d: 0 },
  { label: 'رضایت مشتری', v: 96, d: 0, unit: '٪' },
  { label: 'میانگین پاسخ', v: 1.2, d: 1, unit: 'ثانیه' },
]
const NAV = ['پیشخوان', 'سفارش‌ها', 'مشتریان', 'گزارش‌ها', 'تنظیمات']
const BARS = [30, 48, 36, 66, 54, 84, 72] // px; the tallest stays solid ink
const ROWS = [
  { name: 'سفارش ۱۰۴۲', status: 'تحویل شد', done: true },
  { name: 'سفارش ۱۰۴۳', status: 'در راه' },
  { name: 'سفارش ۱۰۴۴', status: 'جدید' },
]
// Each block's box in the design space, and where it rests while it is only an idea: x, y, degrees.
const BLOCKS = [
  { cls: 'head', box: [12, 12, 388, 36], rough: [-16, 10, 2.4] },
  { cls: 'side', box: [412, 12, 136, 239], rough: [12, -12, -1.8] },
  { cls: 'stat', box: [12, 54, 124, 54], rough: [-9, -14, 1.6] },
  { cls: 'stat', box: [144, 54, 124, 54], rough: [12, 8, -2.2] },
  { cls: 'stat', box: [276, 54, 124, 54], rough: [-10, 12, 1.4] },
  { cls: 'chart', box: [12, 114, 224, 137], rough: [14, -8, -2.6] },
  { cls: 'list', box: [244, 114, 156, 137], rough: [-12, -10, 2] },
]
// The smart guides that flash as the blocks snap: x or y in the design space.
const GUIDES = [
  { axis: 'v', at: 406 },
  { axis: 'v', at: 140 },
  { axis: 'h', at: 51 },
  { axis: 'h', at: 111 },
]
const SLASH = 'M4.2 0.6C4.4 0.1 4.7 0 5.2 0h6c0.5 0 0.7 0.1 0.5 0.6L7.8 13.4C7.6 13.9 7.3 14 6.8 14h-6C0.3 14 0.1 13.9 0.3 13.4Z' // the logo's slash

const inner = {
  head: () => `<div class="cui-avatar">م</div><h2>پیشخوان</h2><div class="cui-search">جستجو…</div>`,
  side: () =>
    `<div class="cui-brand"><div class="cui-tile"><svg viewBox="0 0 12 14"><path d="${SLASH}"/></svg></div><i></i></div>` +
    NAV.map((n, i) => `<div class="cui-nav${i ? '' : ' on'}"><i></i>${n}</div>`).join(''),
  stat: (i) => {
    const { label, v, d, unit } = STATS[i]
    return `<div class="cui-lab">${label}</div><div class="cui-fig"><span class="cui-num">${fa(v, d)}</span>${unit ? `<small>${unit}</small>` : ''}</div>`
  },
  chart: () => `<h3>فروش هفته</h3><div class="cui-bars">${BARS.map((h, k) => `<i${k === 5 ? ' class="peak"' : ''} style="--bh:${h}px"></i>`).join('')}</div>`,
  list: () =>
    `<h3>آخرین سفارش‌ها</h3>` +
    ROWS.map((r) => `<div class="cui-row${r.done ? ' done' : ''}"><i class="cui-dot"></i><div><b>${r.name}</b><span>${r.status}</span></div></div>`).join(''),
}

// The orders that come in once it is built (idle): one every `every` s, from `first` s.
const ORDERS = { first: 1.2, every: 3.2, from: 1045, statuses: ['جدید', 'در راه', 'تحویل شد'] }
const digits = (n) => String(n).replace(/\d/g, (x) => FA[x])

const lerp = (a, b, u) => a + (b - a) * u
const sec = (ms) => ms / 1000

// Builds the window and the toast into `layer`. Returns { place, apply, reset }.
export function createUi(layer) {
  let statIndex = 0
  const blocks = BLOCKS.map((b, i) => {
    const [x, y, w, h] = b.box
    return `<div class="cui-blk cui-${b.cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="cui-ghost"></div><div class="cui-face"></div><div class="cui-inner">${inner[b.cls](b.cls === 'stat' ? statIndex++ : i)}</div></div>`
  }).join('')
  const guides = GUIDES.map((g) => `<i class="cui-guide ${g.axis}" style="${g.axis === 'v' ? 'left' : 'top'}:${g.at}px"></i>`).join('')
  layer.innerHTML =
    `<div class="cui-pos"><div class="cui-win">${blocks}${guides}<div class="cui-gleam"></div></div>` +
    `<svg class="cui-cursor" viewBox="0 0 20 24"><path d="M2 2 L2 19 L6.4 15 L9.6 22 L12.4 20.8 L9.2 14 L15 14 Z"/></svg></div>` +
    `<div class="cui-toast"><span class="cui-tick"><svg viewBox="0 0 14 14"><path d="M2.5 7.5 L5.6 10.5 L11.5 3.8"/></svg></span><span>تحویل شد</span></div>`

  const $ = (s, r = layer) => r.querySelector(s)
  const $$ = (s, r = layer) => [...r.querySelectorAll(s)]
  const pos = $('.cui-pos')
  const win = $('.cui-win')
  const cursor = $('.cui-cursor')
  const gleam = $('.cui-gleam')
  const toast = $('.cui-toast')
  const tick = $('.cui-tick path')
  const guideEls = $$('.cui-guide')
  const blks = $$('.cui-blk').map((el) => ({ el, ghost: $('.cui-ghost', el), face: $('.cui-face', el), inner: $('.cui-inner', el) }))
  const navs = $$('.cui-nav')
  const nums = $$('.cui-num')
  const bars = $$('.cui-bars i')
  const rows = $$('.cui-row')
  if (blks.length !== PARTS.blocks || navs.length !== PARTS.nav || nums.length !== PARTS.stats || bars.length !== PARTS.bars || rows.length !== PARTS.rows || guideEls.length !== PARTS.guides) {
    throw new Error('claim-ui.js and PARTS in claim-timeline.js disagree about how many items there are')
  }
  const tickLength = tick.getTotalLength?.() ?? 12

  const c = INTRO.claim
  // The cursor's path: from outside the window to each block as it appears, then away.
  const way = [
    [c.cursor.at, -50, 345],
    ...BLOCKS.map((b, i) => [c.rough.at + i * c.rough.stagger - 50, b.box[0] + b.box[2] / 2, b.box[1] + b.box[3] / 2]),
    [c.snap.at + 100, 610, 390],
  ]
  // Progress through a staggered part: item i of `count`, 0 to 1.
  const part = (progress, count, p, i) => clamp01((progress * wordsFor(count, p.stagger, p.each) - i * sec(p.stagger)) / sec(p.each))

  let arrived = 0
  const list = $('.cui-list .cui-inner')
  const today = bars.at(-1)
  function arrive(n) {
    const old = $$('.cui-row', list)
    // the oldest leaves, then the rest move up and the new one comes in under them
    const leaving = old[0]
    leaving.animate({ opacity: [1, 0] }, { duration: 260, easing: 'ease-in' }).finished.then(() => {
      const before = old.slice(1).map((r) => r.getBoundingClientRect().top)
      leaving.remove()
      old.slice(1).forEach((r, i) => {
        const status = ORDERS.statuses[Math.min(2, ORDERS.statuses.indexOf(r.querySelector('span').textContent) + 1)]
        r.querySelector('span').textContent = status
        r.classList.toggle('done', status === ORDERS.statuses[2])
        const dy = (before[i] - r.getBoundingClientRect().top) / (r.getBoundingClientRect().height / r.offsetHeight || 1)
        r.animate({ transform: [`translateY(${dy}px)`, 'none'] }, { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
      })
      const row = document.createElement('div')
      row.className = 'cui-row'
      row.innerHTML = `<i class="cui-dot"></i><div><b>سفارش ${digits(ORDERS.from + n)}</b><span>${ORDERS.statuses[0]}</span></div>`
      list.append(row)
      row.animate({ opacity: [0, 1], transform: ['translateY(10px)', 'none'] }, { duration: 420, delay: 80, fill: 'backwards', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
      row.querySelector('.cui-dot').animate({ boxShadow: ['0 0 0 0 var(--accent)', '0 0 0 6px transparent'] }, { duration: 700, delay: 80 })
    })
    // today's count and today's bar
    const count = nums[0]
    count.textContent = fa(STATS[0].v + n + 1, 0)
    count.animate({ transform: ['translateY(-3px)', 'none'], opacity: [0.4, 1] }, { duration: 320, easing: 'ease-out' })
    const from = parseFloat(today.style.getPropertyValue('--bh') || BARS.at(-1))
    const to = Math.min(82, from + 3)
    today.style.setProperty('--bh', `${to}px`)
    today.animate({ height: [`${from}px`, `${to}px`] }, { duration: 500, easing: 'cubic-bezier(0.3, 1.5, 0.5, 1)' })
    today.animate({ opacity: [1, 0] }, { duration: 700, pseudoElement: '::after' })
  }

  let ts = 1
  const animated = [win, ...blks.flatMap((b) => [b.el, b.ghost, b.face, b.inner]), ...navs, ...bars, ...rows, ...guideEls, cursor, gleam, toast]

  return {
    // x, y: the window's top start in the layer; s: its scale; toast: where its chip hangs.
    place({ x, y, s, behind, toastLeft, toastTop }) {
      ts = Math.max(s, 0.9)
      pos.style.transform = `translate(${x}px, ${y}px) scale(${s})`
      toast.style.left = `${toastLeft}px`
      toast.style.top = `${toastTop}px`
      toast.style.setProperty('--ts', ts)
      layer.toggleAttribute('data-behind', behind)
      layer.style.setProperty('--cui-rest', INTRO.claim.behind.rest)
    },

    // Every value of the claim's `ui` track group at one moment (claim-timeline.js).
    apply({ ui: u }) {
      // the window arrives; behind the text it later steps back
      const wp = ease.land(u.win)
      const dim = u.dim ?? 0
      win.style.opacity = clamp01(ease.draw(clamp01((u.win * sec(c.win.for)) / sec(c.win.fade)))) * (1 - (1 - c.behind.rest) * ease.draw(dim))
      win.style.transform = `translateY(${(1 - wp) * 28}px) scale(${0.965 + 0.035 * wp})`

      // blocks: rough, then snapped, then filled
      blks.forEach((b, i) => {
        const a = ease.land(part(u.rough, PARTS.blocks, c.rough, i))
        const k = ease.land(part(u.snap, PARTS.blocks, c.snap, i))
        const f = ease.land(part(u.build, PARTS.blocks, c.build, i))
        const [rx, ry, rr] = BLOCKS[i].rough
        const rough = 1 - k
        b.el.style.transform = `translate(${rx * rough}px, ${ry * rough}px) rotate(${rr * rough}deg) scale(${0.9 + 0.1 * a})`
        b.ghost.style.opacity = a * (1 - clamp01(k))
        b.face.style.opacity = clamp01(k)
        b.inner.style.opacity = clamp01(f)
        b.inner.style.transform = `translateY(${(1 - f) * 6}px)`
      })
      navs.forEach((n, i) => {
        const f = ease.land(part(u.nav, PARTS.nav, c.nav, i))
        n.style.opacity = f
        n.style.transform = `translateX(${(1 - f) * 8}px)`
      })

      // the designer's cursor, then the smart guides as the blocks snap
      const at = c.cursor.at + u.cursor * (c.cursor.until - c.cursor.at)
      let cx = way[0][1]
      let cy = way[0][2]
      for (let i = 0; i < way.length - 1; i++) {
        const [t0, x0, y0] = way[i]
        const [t1, x1, y1] = way[i + 1]
        if (at >= t1) [cx, cy] = [x1, y1]
        else if (at >= t0) {
          const k = ease.draw((at - t0) / (t1 - t0))
          cx = lerp(x0, x1, k)
          cy = lerp(y0, y1, k)
        }
      }
      cursor.style.opacity = ease.draw(clamp01((at - c.cursor.at) / c.cursor.fadeIn)) * (1 - ease.draw(clamp01((at - c.cursor.outAt) / c.cursor.fadeOut)))
      cursor.style.transform = `translate(${cx - 2}px, ${cy - 2}px)`
      const g = c.guides
      const gt = u.guides * wordsFor(PARTS.guides, g.stagger, g.in + g.hold + g.out)
      guideEls.forEach((el, i) => {
        const e = gt - i * sec(g.stagger)
        el.style.opacity = ease.draw(clamp01(e / sec(g.in))) * (1 - ease.draw(clamp01((e - sec(g.in + g.hold)) / sec(g.out))))
      })

      // the figures count up; the bars grow violet and settle to ink
      nums.forEach((n, i) => {
        n.textContent = fa(STATS[i].v * ease.out(part(u.stats, PARTS.stats, c.stats, i)), STATS[i].d)
      })
      const barsFor = wordsFor(PARTS.bars, c.bars.stagger, c.bars.each)
      bars.forEach((b, k) => {
        const e = u.bars * barsFor - k * sec(c.bars.stagger)
        b.style.transform = `scaleY(${ease.settle(clamp01(e / sec(c.bars.each)))})`
        b.style.setProperty('--grow', e > 0 ? 1 - ease.draw(clamp01((e - sec(c.bars.ink)) / sec(c.bars.inkFor))) : 0)
      })
      rows.forEach((r, j) => {
        const f = ease.land(part(u.rows, PARTS.rows, c.rows, j))
        r.style.opacity = f
        r.style.transform = `translateY(${(1 - f) * 8}px)`
      })

      // the finished build catches the light once
      const sp = ease.draw(u.sheen)
      gleam.style.opacity = sp > 0 && sp < 1 ? 1 : 0
      gleam.style.transform = `translateX(${lerp(-100, 100, sp)}%)`

      // delivered
      const t = c.toast
      const ms = u.toast * t.for
      const tp = ease.settle(u.toast)
      toast.style.opacity = ease.draw(clamp01(ms / t.fade))
      toast.style.transform = `translateY(${(1 - tp) * 18}px) scale(${(0.94 + 0.06 * tp) * ts})`
      toast.style.setProperty('--ring', u.toast > 0 ? 1 - ease.draw(clamp01((ms - t.ringAt) / t.ringFor)) : 0)
      tick.style.strokeDasharray = tickLength
      tick.style.strokeDashoffset = tickLength * (1 - ease.draw(clamp01((ms - t.tickAt) / t.tickFor)))
    },

    // The idle loop once it has played (t: seconds into it): every few seconds a new order comes
    // in at the bottom of the list, the ones before it move on and the oldest leaves; today's
    // count goes up and today's bar grows, violet as it does.
    idle(t) {
      const due = t < ORDERS.first ? 0 : Math.floor((t - ORDERS.first) / ORDERS.every) + 1
      while (arrived < due) arrive(arrived++)
    },

    // Back to the finished state, which is what the stylesheet describes.
    reset() {
      for (const el of animated) {
        el.style.removeProperty('transform')
        el.style.removeProperty('opacity')
        el.style.removeProperty('--grow')
        el.style.removeProperty('--ring')
      }
      tick.style.removeProperty('stroke-dasharray')
      tick.style.removeProperty('stroke-dashoffset')
      nums.forEach((n, i) => (n.textContent = fa(STATS[i].v, STATS[i].d)))
    },
  }
}
