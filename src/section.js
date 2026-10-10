// One section: its element, grid and boxes (plan §3). A section keeps its own
// `progress` and `drawn` state, so a rebuild (resize) can restore what was drawn.
//
// Box states: empty -> filled -> ready
//   empty   hidden
//   filled  all four edges are drawn; the box covers the lines inside it (shimmers while its content loads)
//   ready   content is loaded and fades in

import { itemRect } from './layout.js'
import { createGrid } from './grid.js'
import { checkItems, checkOverflow, warn } from './checks.js'

const EPS = 0.5 // px

export function createSection(def, existing) {
  const el = existing ?? document.createElement('section')
  if (!existing) {
    el.className = 'section'
    el.dataset.section = def.id
    el.tabIndex = -1
    el.setAttribute('aria-label', def.title)
  }

  const loads = new Map() // creator module + load(), once per item and profile
  let layer = null
  let grid = null
  let boxes = []
  let geo = null
  let profile = null

  const section = { el, def, progress: 0, drawn: false, clock: null }

  function refresh(b) {
    if (!b.filled) return
    b.el.dataset.state = b.loaded ? 'ready' : 'filled'
    if (b.loaded) b.el.inert = false
  }

  function load(b) {
    b.loadP ??= (async () => {
      try {
        const key = `${def.id}/${b.item.id}/${profile.name}`
        if (!loads.has(key)) {
          loads.set(
            key,
            (async () => {
              const mod = await (b.place.content ?? b.item.content)()
              await mod.load?.(b.ctx)
              return mod
            })(),
          )
        }
        const mod = await loads.get(key)
        if (b.dead) return
        const cleanup = mod.default(b.el, b.ctx)
        if (typeof cleanup === 'function') b.cleanup = cleanup
        b.loaded = true
        refresh(b)
        if (import.meta.env.DEV) checkOverflow(`${def.id}/${b.item.id}`, b.el)
      } catch (err) {
        console.error(`[content] ${def.id}/${b.item.id}`, err)
      }
    })()
    return b.loadP
  }

  // An item is complete when its four edges are drawn along their full length.
  // A missing line is a screen edge or the section's bottom edge: counted as drawn.
  function complete(b) {
    const x1 = geo.x[b.c1]
    const y1 = geo.y[b.r1]
    return (
      !(grid.h.get(b.r0)?.len < x1 - EPS) &&
      !(grid.h.get(b.r1)?.len < x1 - EPS) &&
      !(grid.v.get(b.c0)?.len < y1 - EPS) &&
      !(grid.v.get(b.c1)?.len < y1 - EPS)
    )
  }

  function updateBoxes(instant = false) {
    for (const b of boxes) {
      if (b.filled || !(instant || complete(b))) continue
      b.filled = true
      if (instant) b.el.classList.add('instant')
      refresh(b)
    }
  }

  function unmount() {
    for (const b of boxes) {
      b.dead = true
      b.cleanup?.()
    }
    layer?.remove()
    layer = grid = null
    boxes = []
  }

  section.mount = (newGeo, newProfile) => {
    unmount()
    geo = newGeo
    profile = newProfile
    el.style.height = `${geo.sectionHeight}px`

    grid = createGrid(geo, { id: def.id, mode: def.clock ? 'clock' : 'scroll', top: !def.clock })
    layer = document.createElement('div')
    layer.className = 'section-layer'
    layer.append(grid.el)

    if (import.meta.env.DEV) warn(checkItems(def, profile))

    for (const item of def.items) {
      const place = item[profile.name]
      if (!place) continue
      const rect = itemRect(geo, place)
      const c0 = geo.colStart + place.col - 1
      const r0 = geo.rowStart + place.row - 1
      const box = document.createElement('div')
      box.className = 'box'
      box.dataset.item = item.id
      box.dataset.state = 'empty'
      box.inert = true
      // Edge to edge between its four outline lines, which stay visible.
      Object.assign(box.style, {
        left: `${rect.x + 1}px`,
        top: `${rect.y + 1}px`,
        width: `${rect.width - 1}px`,
        height: `${rect.height - 1}px`,
      })
      layer.append(box)
      boxes.push({
        item,
        place,
        el: box,
        c0,
        r0,
        c1: c0 + place.cols,
        r1: r0 + place.rows,
        ctx: { profile: profile.name, cols: place.cols, rows: place.rows, props: { ...item.props, ...place.props } },
        filled: false,
        loaded: false,
      })
    }
    el.append(layer)

    // Restore what was already drawn.
    if (section.drawn) {
      grid.finish()
      updateBoxes(true)
      section.preload()
    } else if (def.clock) {
      if (section.clock) grid.drawClock(performance.now() - section.clock.start)
    } else if (section.progress > 0) {
      section.draw(section.progress)
    }
  }

  section.unmount = unmount

  // Scroll driver: p is the (smoothed) progress, 0..1.
  section.draw = (p) => {
    section.progress = p
    if (!grid) return
    if (p > 0) section.preload()
    grid.drawScroll(p)
    updateBoxes()
  }

  // Loading driver: elapsed ms since the draw started.
  section.drawClock = (elapsed) => grid?.drawClock(elapsed)

  // Mark drawn without animation (finished drawing, or skipped by a jump).
  section.finish = () => {
    section.progress = 1
    section.drawn = true
    if (!grid) return
    grid.finish()
    updateBoxes(true)
    section.preload()
  }

  // Load every box's content ahead (import, load(), render() into the hidden box).
  section.preload = () => Promise.all(boxes.map(load))

  return section
}
