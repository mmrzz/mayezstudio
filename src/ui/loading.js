// The loading section is built in index.html (the logo stays inline). Its grid
// draws on a clock: lines draw, shimmer if content is late, then burst when ready.
//
// data-state on the section: loading -> waiting | filled -> rest
//   waiting  drawn but content is not ready; the grid shimmers
//   filled   drawn and ready; the burst plays
//   rest     the burst is over; a rebuild never replays it

import { LOAD_DRAW_TOTAL, BURST_DURATION } from '../config.js'

export default { id: 'loading', title: 'Loading', clock: true, items: [] }

// Resolves when the burst is over. Drawing is never cut short: when it ends we
// go to `filled` if content is ready, otherwise to `waiting` until `ready` resolves.
export function startLoading(section, ready, reduceMotion) {
  const el = section.el
  let isReady = false
  let done
  const finished = new Promise((r) => (done = r))

  function burst() {
    el.dataset.state = 'filled'
    setTimeout(
      () => {
        el.dataset.state = 'rest'
        done()
      },
      reduceMotion ? 0 : BURST_DURATION,
    )
  }

  function settle() {
    section.finish()
    if (isReady) burst()
    else el.dataset.state = 'waiting'
  }

  ready.then(() => {
    isReady = true
    if (section.drawn) burst()
  })

  el.dataset.state = 'loading'
  section.clock = { start: performance.now() }
  if (reduceMotion) {
    settle()
    return finished
  }

  const tick = (now) => {
    const elapsed = now - section.clock.start
    if (elapsed >= LOAD_DRAW_TOTAL) return settle()
    section.drawClock(elapsed)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return finished
}
