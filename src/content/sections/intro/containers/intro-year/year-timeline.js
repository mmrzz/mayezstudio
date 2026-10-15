// Receipt 2's keyframes (D-016), built from the timings in config.js and played by Theatre: the
// Earth goes once round the Sun (`orbit.t`, 0 to 1, the share of the year gone), then «۱ سال» is
// pasted in and the caption follows. Every prop is a number.

import { INTRO } from '../../../../../config.js'
import { wordsFor } from '../../../../../core/timeline.js'

const s = (ms) => ms / 1000

// caption: how many words the caption has.
export function yearSpec({ caption }) {
  const c = INTRO.year
  const tracks = {}
  const key = (object, prop, keys) => ((tracks[object] ??= {})[prop] = keys)

  key('orbit', 't', [
    [s(c.orbit.at), 0, 'draw'],
    [s(c.orbit.at + c.orbit.for), 1],
  ])

  // ---------- «۱ سال» is pasted in, then the caption ----------
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
