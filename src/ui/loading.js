// The loading section is built in index.html (the logo stays inline). Its grid
// draws on a clock: lines draw, shimmer if content is late, then burst when ready. Content
// that is ready mid-draw speeds the clock up so the draw ends in LOAD_FINISH ms, but never
// before LOAD_MIN, so the draw is always seen. Input is free as soon as the burst starts.
//
// Once the visitor has been past it, the loading screen shrinks to LOAD_RETURN_ROWS of its
// rows (shrinkLoading), so coming back to the top is not a screen of empty grid.
//
// data-state on the section: loading -> waiting | filled -> rest
//   waiting  drawn but content is not ready; the grid shimmers
//   filled   drawn and ready; the burst plays
//   rest     the burst is over; a rebuild never replays it

import { LOAD_DRAW_TOTAL, LOAD_FINISH, LOAD_MIN, BURST_DURATION } from '../config.js'
import { returnHeight } from '../core/layout.js'

export default { id: 'loading', title: 'در حال بارگذاری', clock: true, items: [] }

// Resolves when the burst starts (loading is over; the burst plays on by itself). When the
// draw ends we go to `filled` if content is ready, otherwise to `waiting` until `ready` resolves.
export function startLoading(section, ready, reduceMotion) {
  const el = section.el
  let isReady = false
  let rate = 1 // the clock's speed: more than 1 once content is ready and the draw is not over
  let done
  const finished = new Promise((r) => (done = r))

  function burst() {
    el.dataset.state = 'filled'
    done()
    setTimeout(() => (el.dataset.state = 'rest'), reduceMotion ? 0 : BURST_DURATION)
  }

  function settle() {
    section.finish()
    if (isReady) burst()
    else el.dataset.state = 'waiting'
  }

  const start = performance.now()
  let elapsed = 0
  ready.then(() => {
    isReady = true
    if (section.drawn) burst()
    else {
      // Finish in LOAD_FINISH ms, but not before LOAD_MIN after the start.
      const now = performance.now() - start
      rate = Math.max(1, (LOAD_DRAW_TOTAL - elapsed) / Math.max(LOAD_FINISH, LOAD_MIN - now))
    }
  })

  el.dataset.state = 'loading'
  section.clock = { start }
  if (reduceMotion) {
    settle()
    return finished
  }

  let last = section.clock.start
  const tick = (now) => {
    elapsed += (now - last) * rate
    last = now
    section.clock.start = now - elapsed // a rebuild during loading continues from here
    if (elapsed >= LOAD_DRAW_TOTAL) return settle()
    section.drawClock(elapsed)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return finished
}

// Shrinks the loading screen once the visitor is fully past it and the next section is
// drawn, keeping what is on screen where it is. Not during a jump or a lock, whose scroll
// positions would shift under them. Calls onShrink once, after the change.
export function shrinkLoading(section, next, scroller, onShrink) {
  let waiting = 0
  function check() {
    if (section.short || scrollY < section.el.offsetHeight) return
    // Past it, but the next section is still drawing or a jump is running: look again next frame.
    if (!next.drawn || scroller.locked()) {
      waiting ||= requestAnimationFrame(() => ((waiting = 0), check()))
      return
    }
    removeEventListener('scroll', check)
    const restore = scroller.anchor()
    section.short = true
    section.el.style.height = `${returnHeight(section.geo)}px`
    restore()
    onShrink()
  }
  addEventListener('scroll', check, { passive: true })
  check()
}
