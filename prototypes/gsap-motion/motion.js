// Shared motion setup (plan/intro.md §4, D-013). Imported dynamically by containers
// from their load(), so GSAP downloads with section 1's content behind the loading
// screen, never in the first paint. Registers the plugins and the house eases once.
// Scrolling stays our own engine: no ScrollTrigger, no smooth-scroll library.

import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import { INTRO } from '../config.js'
import { glowAt } from './grid.js'
import './motion.css'

gsap.registerPlugin(DrawSVGPlugin, SplitText, CustomEase)
for (const [name, path] of Object.entries(INTRO.eases)) CustomEase.create(name, path)

// Dev: ?speed=0.25 slows every timeline (and delayed call) down.
if (import.meta.env.DEV) {
  const speed = Number(new URLSearchParams(location.search).get('speed'))
  if (speed > 0) gsap.globalTimeline.timeScale(speed)
}

export { gsap, SplitText }

// GSAP counts in seconds; config.js in ms.
export const sec = (ms) => ms / 1000

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- Shared beats ----------
// The grammar is a design being made: a pen, a selection, a text tool. Violet appears only
// while something moves; at rest everything is ink. Each beat adds to a timeline at a
// position (seconds) and returns what it made; temporary elements go in `temps`, which
// the container removes when its animation ends.

const SVG = 'http://www.w3.org/2000/svg'

// The tip: the grid line's tip, a 5px accent dot with a soft glow, riding the end of a
// stroke. place(x, y, u) moves it and sets its glow from the stroke's progress u (0 to 1),
// as the grid does. In an SVG parent, `scale` is screen px per user unit and x, y are in
// user units; in an HTML parent (positioned) x, y are px from its top left.
export function tip(parent, { scale = 1 } = {}) {
  if (!(parent instanceof SVGElement)) {
    const dot = document.createElement('i')
    dot.className = 'tip-html'
    dot.setAttribute('aria-hidden', 'true')
    parent.append(dot)
    return {
      el: dot,
      place(x, y, u) {
        gsap.set(dot, { x, y, opacity: glowAt(u) })
      },
    }
  }
  const svg = parent
  const dot = document.createElementNS(SVG, 'circle')
  dot.setAttribute('class', 'tip')
  dot.setAttribute('r', 2.5 / scale)
  dot.style.filter = `drop-shadow(0 0 ${5 / scale}px var(--accent-border))`
  dot.style.opacity = 0
  svg.append(dot)
  return {
    el: dot,
    place(x, y, u) {
      dot.setAttribute('cx', x)
      dot.setAttribute('cy', y)
      dot.style.opacity = glowAt(u)
    },
  }
}

// Paste: the element appears at full opacity a little too big inside a selection (an
// accent outline with four square handles), settles to its size, holds, and the selection
// fades (at `fadeAt` seconds if given, else after the hold). The element must be positioned
// (position: relative).
export function paste(tl, el, at, temps, { fadeAt } = {}) {
  const p = INTRO.paste
  const selection = document.createElement('i')
  selection.className = 'selection'
  selection.setAttribute('aria-hidden', 'true')
  selection.append(...Array.from({ length: 4 }, () => document.createElement('b')))
  selection.style.opacity = 0
  el.append(selection)
  temps.push(selection)
  tl.set(el, { opacity: 1, scale: p.scale }, at)
    .set(selection, { opacity: 1 }, at)
    .to(el, { scale: 1, duration: sec(p.settle), ease: 'settle' }, at)
    .to(selection, { opacity: 0, duration: sec(p.fade), ease: 'none' }, fadeAt ?? at + sec(p.settle + p.hold))
  return selection
}

// Words: each word rises 0.3em from transparent, a little after the one before it. Split by
// words only; letters would break the joins. SplitText keeps the whole sentence readable
// for screen readers while it is split. Returns the split.
export function words(tl, el, at) {
  const w = INTRO.words
  const split = SplitText.create(el, { type: 'words', aria: 'auto' })
  gsap.set(split.words, { opacity: 0, y: 0.3 * parseFloat(getComputedStyle(el).fontSize) })
  tl.to(split.words, { opacity: 1, y: 0, duration: sec(w.rise), ease: 'land', stagger: sec(w.stagger) }, at)
  return split
}
