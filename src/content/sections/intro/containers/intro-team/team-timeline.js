// Receipt 3's keyframes (D-016), built from the timings in config.js and played by Theatre: the
// room goes dark and the circle and candles light, the bear twitches, rips in two and each half
// grows back whole, one evil, one an angel; the room comes back (team-art.js), then «۲ نفر» is
// pasted in and the caption follows. Every prop is a number: progress (0 to 1) through a phase,
// except the clock, which is seconds (for the flicker of flames and the trembling).

import { INTRO } from '../../../../../config.js'
import { wordsFor } from '../../../../../core/timeline.js'

const s = (ms) => ms / 1000

// caption: how many words the caption has.
export function teamSpec({ caption }) {
  const c = INTRO.team
  const tracks = {}
  const key = (object, prop, keys) => ((tracks[object] ??= {})[prop] = keys)
  const span = (object, prop, phase, ease = 'linear') =>
    key(object, prop, [
      [s(phase.at), 0, ease],
      [s(phase.at + phase.for), 1],
    ])
  const lift = [s(c.lift.at), s(c.lift.at + c.lift.for)]

  // ---------- The room darkens, the circle draws, the candles light; all undone at the lift ----------
  key('room', 'dark', [
    [s(c.dark.at), 0, 'out'],
    [s(c.dark.at + c.dark.for), 1, 'linear'],
    [lift[0], 1, 'draw'],
    [lift[1], 0],
  ])
  span('circle', 'draw', c.circle, 'draw')
  key('circle', 'glow', [
    [s(c.circle.at), 0, 'out'],
    [s(c.circle.at + c.circle.glowIn), 1, 'linear'],
    [lift[0], 1, 'draw'],
    [lift[1], 0],
  ])
  span('candles', 'light', c.candles)
  span('candles', 'out', c.lift)

  // ---------- The bear ----------
  span('bear', 'uneasy', c.uneasy)
  span('bear', 'tear', c.tear, 'flight')
  span('bear', 'burst', { at: c.part.at, for: c.burst })
  key('bear', 'split', [
    [s(c.part.at), 0, 'out'],
    [s(c.part.at + c.part.jolt), c.part.wrench, 'draw'],
    [s(c.part.at + c.part.for), 1],
  ])
  span('bear', 'grow', c.grow)
  span('bear', 'ignite', c.ignite)
  span('bear', 'halo', c.halo)

  // ---------- «۲ نفر» is pasted in, then the caption ----------
  const p = INTRO.paste
  const paste = s(c.paste)
  key('figure', 'pop', [
    [paste - 0.01, 0, 'hold'],
    [paste, p.scale + 0.04, 'settle'],
    [paste + s(p.settle), 1],
  ])
  key('figure', 'selection', [
    [paste - 0.01, 0, 'hold'],
    [paste, 1, 'linear'],
    [paste + s(p.settle + p.hold), 1, 'linear'],
    [paste + s(p.settle + p.hold + p.fade), 0],
  ])
  const words = paste + s(c.caption)
  key('caption', 'words', [
    [words, 0, 'linear'],
    [words + wordsFor(caption, INTRO.words.stagger, INTRO.words.rise), 1],
  ])

  const length = Math.max(...Object.values(tracks).flatMap((props) => Object.values(props).map((keys) => keys.at(-1)[0])))
  key('clock', 't', [
    [0, 0, 'linear'],
    [length, length],
  ])
  return { length, tracks }
}
