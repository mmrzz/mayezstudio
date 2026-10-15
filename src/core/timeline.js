// Theatre.js timelines for content animation (D-016). Imported dynamically from a container's
// load(), so it downloads behind the loading screen. A container describes its keyframes in
// code (a spec, built from config.js); that becomes the project state @theatre/core plays.
// A state exported from Theatre's studio can be passed instead.
//
// Dev: ?studio opens Theatre's studio on top of the page (the sequence is then left to it),
// ?speed=0.25 slows every timeline, ?at=2.5 holds every timeline on that second. The test
// route's controls bar (src/dev/test.js) drives the same things live through `dev`.

import { getProject } from '@theatre/core'
import { CURVES, INTRO } from '../config.js'

const params = new URLSearchParams(location.search)
export const studio = import.meta.env.DEV && params.has('studio')
// speed: the clock's rate; hold: seconds to hold every timeline on (as ?at); current: { length, t }
// of the run playing now. Only read in dev.
export const dev = { speed: (import.meta.env.DEV && Number(params.get('speed'))) || 1, hold: null, current: null }

let studioReady
const initStudio = () =>
  (studioReady ??= import('@theatre/studio').then(({ default: s }) => {
    s.initialize()
  }))

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// A cubic-bezier ease as a function of x (0 to 1); Theatre interpolates keyframes the same way.
export function cubic([x1, y1, x2, y2]) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const X = (t) => ((ax * t + bx) * t + cx) * t
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x
      const d = dX(t)
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break
      t -= e / d
    }
    if (!(t >= 0 && t <= 1) || Math.abs(X(t) - x) > 1e-4) {
      let lo = 0
      let hi = 1
      t = x
      for (let i = 0; i < 30; i++) {
        if (X(t) < x) lo = t
        else hi = t
        t = (lo + hi) / 2
      }
    }
    return ((ay * t + by) * t + cy) * t
  }
}
export const ease = Object.fromEntries(Object.entries(CURVES).map(([k, v]) => [k, cubic(v)]))

// Seconds a run of items takes: `stagger` apart, each `each` ms long. Used by specs and by
// containers that stagger words or UI parts from a progress value.
export const wordsFor = (count, stagger, each) => ((count - 1) * stagger + each) / 1000
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

// spec: { length, tracks: { object: { prop: [[t, value, ease?], ...] } } }, times in seconds.
// `ease` is a CURVES name for the move to the next key, or 'hold' to jump at the next key.
// Theatre reads a bezier between two keys from the left key's handles[2..3] and the right
// key's handles[0..1].
function toState(sheetId, { length, tracks }) {
  let n = 0
  const tracksByObject = {}
  for (const [object, props] of Object.entries(tracks)) {
    const trackData = {}
    const trackIdByPropPath = {}
    for (const [prop, keys] of Object.entries(props)) {
      const id = `${object}-${prop}-${++n}`
      trackIdByPropPath[JSON.stringify([prop])] = id
      trackData[id] = {
        type: 'BasicKeyframedTrack',
        __debugName: `${object}:${prop}`,
        keyframes: keys.map(([position, value, out = 'linear'], i) => {
          const before = CURVES[keys[i - 1]?.[2]] ?? CURVES.linear
          const after = CURVES[out] ?? CURVES.linear
          return {
            id: `${id}-${i}`,
            position,
            value,
            connectedRight: out !== 'hold' && i < keys.length - 1,
            handles: [before[2], before[3], after[0], after[1]],
            type: 'bezier',
          }
        }),
      }
    }
    tracksByObject[object] = { trackData, trackIdByPropPath }
  }
  return {
    sheetsById: {
      [sheetId]: {
        staticOverrides: { byObject: {} },
        sequence: { subUnitsPerUnit: 100, length, type: 'PositionalSequence', tracksByObject },
      },
    },
    definitionVersion: '0.4.0',
    revisionHistory: [],
  }
}

// One Theatre project per container. Returns { length, instance() }; each render takes its
// own instance (a sheet instance, with its own playhead).
export async function timeline(id, spec, saved) {
  if (studio) await initStudio()
  const state = saved ?? toState(id, spec)
  const project = getProject(id, { state })
  await project.ready
  const length = state.sheetsById[id].sequence.length
  // Every object's props, with the first key's value as its default.
  const config = Object.fromEntries(
    Object.entries(spec.tracks).map(([object, props]) => [
      object,
      Object.fromEntries(Object.entries(props).map(([prop, keys]) => [prop, keys[0][1]])),
    ]),
  )
  let n = 0
  return {
    length,
    instance() {
      const sheet = project.sheet(id, `i${++n}`)
      const objects = Object.entries(config).map(([key, props]) => [key, sheet.object(key, props)])
      const read = () => Object.fromEntries(objects.map(([key, o]) => [key, o.value]))
      return {
        sheet,
        read,
        // Every object's values at t seconds.
        at(t) {
          sheet.sequence.position = Math.max(0, Math.min(t, length))
          return read()
        },
      }
    },
  }
}

// Plays an instance from 0 to the end on our own clock, `delay` seconds after now. frame(values)
// runs every frame, done() once after the last. Returns stop(). With ?studio the playhead is
// the studio's: frame() keeps running on whatever it shows and done() never comes.
export function play(run, length, { delay = 0, frame, done }) {
  let raf
  const hold = import.meta.env.DEV ? (dev.hold ?? (params.has('at') ? Number(params.get('at')) : null)) : null
  if (hold !== null) {
    dev.current = { length, t: hold }
    frame(run.at(hold))
    return () => {}
  }
  if (studio) {
    run.sheet.sequence.play()
    const loop = () => {
      frame(run.read())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }
  const control = import.meta.env.DEV ? (dev.current = { length, t: 0 }) : null
  let start
  const loop = (now) => {
    start ??= now
    const t = ((now - start) / 1000) * dev.speed * INTRO.pace - delay * INTRO.pace
    if (control) control.t = Math.max(0, Math.min(t, length))
    frame(run.at(t))
    if (t >= length) return done?.()
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}

// The idle loop a card keeps after its timeline has played: tick(t, dt) every frame, t and dt in
// seconds since the loop began, but only while `el` is on screen and the page is shown; off
// screen it pauses where it is. show() and hide() run as it starts and pauses (to make or free
// what only the loop needs, such as a WebGL context). Never with reduced motion. Returns stop().
export function idle(el, { tick, show, hide }) {
  if (reduced()) return () => {}
  let raf
  let last = null
  let t = 0
  let seen = false
  let running = false
  const loop = (now) => {
    const dt = last === null ? 0 : (Math.min(100, now - last) / 1000) * dev.speed
    last = now
    t += dt
    tick(t, dt)
    raf = requestAnimationFrame(loop)
  }
  const update = () => {
    const on = seen && !document.hidden
    if (on === running) return
    running = on
    if (on) {
      show?.()
      last = null
      raf = requestAnimationFrame(loop)
    } else {
      cancelAnimationFrame(raf)
      hide?.()
    }
  }
  const io = new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting
    update()
  })
  io.observe(el)
  document.addEventListener('visibilitychange', update)
  return () => {
    io.disconnect()
    document.removeEventListener('visibilitychange', update)
    seen = false
    update()
  }
}
