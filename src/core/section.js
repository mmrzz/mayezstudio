// One section: its element, grid and boxes (plan §3). A section keeps its own
// `progress` and `drawn` state, so a rebuild (resize) can restore what was drawn.
//
// Box states: empty -> filled -> ready
//   empty   hidden; once all four edges are drawn and the container's look is applied, a frame
//           with the box's look is dragged out from its inline-start top corner (BOX_DRAW)
//   filled  the frame is done and the box takes its place; the box covers the lines inside it
//           and floats BOX.gap inside the outer ones (shimmers while its content loads)
//   ready   content is loaded and fades in
//
// The first time a box becomes ready in a mount it dispatches `reveal` (D-014);
// detail.instant is true when it was shown without animation (a jump, a drawn
// section, a rebuild). Animated containers listen for it.

import { itemRect, physCol, returnHeight } from './layout.js'
import { createGrid } from './grid.js'
import { loadContainer, renderFor, applyLook } from '../content/containers.js'
import { BOX, BOX_DRAW, BOX_DRAW_EASE } from '../config.js'
import { checkItems, checkOverflow, warn } from '../dev/checks.js'

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

  // short: the loading section, shrunk once the visitor has been past it (shrinkLoading).
  const section = { el, def, progress: 0, drawn: false, clock: null, short: false, geo: null }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')

  // Drags out a frame with the box's look, like a rectangle drawn in a design tool: from the
  // inline-start top corner to full size, with a handle on the corner being dragged. Then the
  // box takes its place.
  function drawFrame(b) {
    b.drawing = true
    const { left, top, width, height } = b.el.style
    const frame = document.createElement('div')
    frame.className = 'box-frame'
    frame.dataset.dir = geo.rtl ? 'rtl' : 'ltr'
    for (const name of ['--box-fill', '--box-edge', '--box-radius', '--box-border'])
      frame.style.setProperty(name, b.el.style.getPropertyValue(name))
    Object.assign(frame.style, { left, top, width, height })
    b.el.before(frame)
    const corner = geo.rtl ? { left: `calc(${left} + ${width})` } : { left }
    const anim = frame.animate(
      [
        { ...corner, width: '0px', height: '0px' },
        { left, width, height },
      ],
      { duration: BOX_DRAW, easing: `cubic-bezier(${BOX_DRAW_EASE})` },
    )
    anim.finished.then(
      () => {
        if (b.dead) return
        b.shown = true
        refresh(b)
        frame.remove() // the box, identical, is in place now
      },
      () => {},
    )
  }

  function refresh(b) {
    if (!b.filled || !b.looked) return
    if (!b.shown) {
      if (b.el.classList.contains('instant') || reduceMotion.matches) b.shown = true
      else return b.drawing || drawFrame(b)
    }
    b.el.dataset.state = b.loaded ? 'ready' : 'filled'
    if (!b.loaded) return
    b.el.inert = false
    if (b.revealed) return
    b.revealed = true
    // Synchronous, so a listener can set its starting state before the next paint.
    b.el.dispatchEvent(new CustomEvent('reveal', { detail: { instant: b.el.classList.contains('instant') } }))
  }

  function load(b) {
    b.loadP ??= (async () => {
      try {
        const key = `${b.item.container}/${profile.name}`
        if (!loads.has(key)) {
          loads.set(
            key,
            (async () => {
              const container = await b.defP
              await container.load?.(b.ctx)
              return container
            })(),
          )
        }
        const container = await loads.get(key)
        if (b.dead) return
        b.ctx.props = { ...container.props, ...b.ctx.props } // the placement overrides the container's
        const cleanup = renderFor(container, profile.name)(b.el, b.ctx)
        if (typeof cleanup === 'function') b.cleanup = cleanup
        b.loaded = true
        refresh(b)
        if (import.meta.env.DEV) checkOverflow(`${def.id}/${b.item.container}`, b.el)
      } catch (err) {
        console.error(`[container] ${def.id}/${b.item.container}`, err)
      }
    })()
    return b.loadP
  }

  // An item is complete when its four edges are drawn along their full length.
  // A missing line is a screen edge or the section's bottom edge: counted as drawn.
  // Horizontal lines draw from the inline-start edge, so the far edge of a box
  // is reached at x1 in LTR and at width - x0 in RTL.
  function complete(b) {
    const reach = geo.rtl ? geo.width - geo.x[b.c0] : geo.x[b.c1]
    const y1 = geo.y[b.r1]
    return (
      !(grid.h.get(b.r0)?.len < reach - EPS) &&
      !(grid.h.get(b.r1)?.len < reach - EPS) &&
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
    section.geo = geo
    el.style.height = `${section.short ? returnHeight(geo) : geo.sectionHeight}px`

    grid = createGrid(geo, { id: def.id, mode: def.clock ? 'clock' : 'scroll', top: !def.clock })
    layer = document.createElement('div')
    layer.className = 'section-layer'
    layer.append(grid.el)

    if (import.meta.env.DEV) warn(checkItems(def, profile))

    for (const item of def.items) {
      const place = item[profile.name]
      if (!place) continue
      const rect = itemRect(geo, place)
      const c0 = physCol(geo, place.col, place.cols)
      const r0 = geo.rowStart + place.row - 1
      const box = document.createElement('div')
      box.className = 'box'
      box.dataset.item = item.container
      box.dataset.state = 'empty'
      box.inert = true
      // Inside its four outline lines, which stay visible, BOX.gap away from them.
      Object.assign(box.style, {
        left: `${rect.x + 1 + BOX.gap}px`,
        top: `${rect.y + 1 + BOX.gap}px`,
        width: `${rect.width - 1 - 2 * BOX.gap}px`,
        height: `${rect.height - 1 - 2 * BOX.gap}px`,
      })
      layer.append(box)
      const b = {
        item,
        place,
        el: box,
        c0,
        r0,
        c1: c0 + place.cols,
        r1: r0 + place.rows,
        ctx: { profile: profile.name, cols: place.cols, rows: place.rows, props: { ...item.props, ...place.props } },
        filled: false,
        looked: false, // the container's look is on the box; until then it stays hidden
        shown: false, // its frame has been drawn (or skipped); the box itself is visible
        loaded: false,
      }
      boxes.push(b)
      // The look is the container's own, so it comes with its module (not with load()).
      b.defP = loadContainer(item.container)
      b.defP.then(
        (def) => {
          if (b.dead) return
          applyLook(box, def)
          b.looked = true
          refresh(b)
        },
        () => {}, // load() reports it
      )
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
