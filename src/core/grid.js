// One section's grid lines, drawn up to a progress value (plan §3).
//
// Two schedules feed the same lines:
//   clock   loading: each line starts at a seeded offset and all finish together
//   scroll  other sections: top-down, a line only draws on screen
// A line has a drawn fraction (0..1) and a glow (the tip). Both go to CSS as
// --p and --glow; data-d is 0 (not started), 1 (drawing) or 2 (done).

import { LOAD_DRAW_TOTAL, LOAD_SPREAD, H_WINDOW, V_START, V_EASE } from '../config.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutCubic = (t) => 1 - (1 - t) ** 3

// Glow rises over the first 15% of a line's draw, holds, then fades over the last 25%.
export const glowAt = (u) => (u < 0.15 ? u / 0.15 : u <= 0.75 ? 1 : 1 - (u - 0.75) / 0.25)

// Seeded, so a rebuild draws the same hand-drawn pattern.
function rng(text) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let s = h >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// opts: id (seeds the jitter), mode ('clock' | 'scroll'), top (draw the section's top line)
export function createGrid(geo, { id, mode, top }) {
  const el = document.createElement('div')
  el.className = 'grid'
  el.style.setProperty('--span', `${geo.width + geo.sectionHeight}px`)

  const width = geo.width
  const height = geo.y[geo.rows]
  const lines = []
  const h = new Map() // row index -> line
  const v = new Map() // column index -> line

  function add(axis, index) {
    const rand = rng(`${id}:${axis}${index}`)
    const at = axis === 'h' ? geo.y[index] : geo.x[index]
    const line = { axis, index, at, frac: 0, len: 0, el: document.createElement('i') }

    if (mode === 'clock') {
      line.start = rand() * LOAD_SPREAD
      line.span = LOAD_DRAW_TOTAL - line.start
    } else if (axis === 'h') {
      // Starts when it comes into view (visible bottom reaches it), done within a window, by p = 1 at the latest.
      const inView = at / geo.sectionHeight
      const end0 = Math.min(1, inView + rand() * 0.03 + H_WINDOW * (0.8 + 0.4 * rand()))
      line.end = end0
      line.start = Math.min(inView + 0, end0 - 0.04)
    } else {
      // Like the loading draw: a seeded start, all finishing together at p = 1.
      line.start = V_START[0] + rand() * (V_START[1] - V_START[0])
      line.ease = 1 + rand() * (V_EASE - 1)
    }

    const s = line.el.style
    line.el.className = `grid-line grid-line--${axis}`
    line.el.dataset.d = '0'
    if (axis === 'h') {
      s.top = `${at}px`
      s.width = `${width}px`
      s.setProperty('--cx', `${width / 2}px`)
      s.setProperty('--cy', `${geo.sectionHeight / 2 - at}px`)
    } else {
      s.left = `${at}px`
      s.height = `${height}px`
      s.setProperty('--cx', `${width / 2 - at}px`)
      s.setProperty('--cy', `${geo.sectionHeight / 2}px`)
    }
    s.setProperty('--offset', `${at}px`)
    lines.push(line)
    ;(axis === 'h' ? h : v).set(index, line)
    return line
  }

  // Top line and interior lines. The screen edges and the bottom edge are counted as drawn.
  for (let i = top ? 0 : 1; i < geo.rows; i++) add('h', i)
  for (let i = 1; i < geo.cols; i++) add('v', i)
  el.append(...lines.map((l) => l.el))

  function set(line, frac, glow) {
    if (line.frac >= 1 && frac >= 1) return
    line.frac = frac
    line.len = frac * (line.axis === 'h' ? width : height)
    const s = line.el.style
    s.setProperty('--p', `${frac * 100}%`)
    s.setProperty('--glow', frac >= 1 ? 0 : glow)
    line.el.dataset.d = frac <= 0 ? '0' : frac >= 1 ? '2' : '1'
  }

  return {
    el,
    h,
    v,
    lines,

    // p: the section's scroll progress, 0..1.
    drawScroll(p) {
      for (const l of lines) {
        if (l.axis === 'h') {
          const u = clamp01((p - l.start) / (l.end - l.start))
          set(l, easeOutCubic(u), glowAt(u))
        } else {
          // Never ahead of the visible bottom: u is at most p (it starts later
          // and ends at the same time), and the ease-in only holds it back more.
          const u = clamp01((p - l.start) / (1 - l.start))
          set(l, u ** l.ease, glowAt(u))
        }
      }
    },

    // elapsed: ms since the loading draw started.
    drawClock(elapsed) {
      for (const l of lines) {
        const u = clamp01((elapsed - l.start) / l.span)
        set(l, easeInOutCubic(u), glowAt(u))
      }
    },

    finish() {
      for (const l of lines) set(l, 1, 0)
    },
  }
}
