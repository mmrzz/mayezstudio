// Receipt 1's keyframes (D-016), built from the timings in config.js and played by Theatre:
// a pixel man pushes a crate in, three more drop onto it, he startles and then cheers beside the
// pile; «۴» is pasted in and the caption follows. Every prop is a number: progress (0 to 1)
// through a phase, which systems-art.js turns into moves in whole game pixels.

import { INTRO } from '../../../../../config.js'
import { wordsFor } from '../../../../../core/timeline.js'

const s = (ms) => ms / 1000

export const DROPS = 3 // the crates that fall

// caption: how many words the caption has.
export function systemsSpec({ caption }) {
  const c = INTRO.systems
  const tracks = {}
  const key = (object, prop, keys) => ((tracks[object] ??= {})[prop] = keys)
  const move = (object, prop, at, dur, ease = 'linear') =>
    key(object, prop, [
      [s(at), 0, ease],
      [s(at) + s(dur), 1],
    ])

  move('man', 'push', c.push.at, c.push.for)
  move('man', 'back', c.back.at, c.back.for)
  move('drop', 'p', c.drop.at, wordsFor(DROPS, c.drop.stagger, c.drop.each) * 1000)
  move('man', 'cheer', c.cheer.at, c.cheer.for)
  move('fx', 'sparkle', c.sparkle.at, c.sparkle.for)

  // ---------- «۴» is pasted in, then the caption ----------
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
  return { length, tracks }
}
