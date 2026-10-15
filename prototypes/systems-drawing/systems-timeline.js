// Receipt 1's keyframes (D-016), built from the timings in config.js and played by Theatre:
// a man pushes a box in, shove by shove, straining between them; as it stops, three more drop
// from above; he jumps back, then stands proud beside the four. «۴» is pasted in and the
// caption follows. Every prop is a number.

import { INTRO } from '../../../config.js'
import { wordsFor } from './claim-timeline.js'

const s = (ms) => ms / 1000

// caption: how many words the caption has.
export function systemsSpec({ caption }) {
  const c = INTRO.systems
  const tracks = {}
  const key = (object, prop, keys) => ((tracks[object] ??= {})[prop] = keys)

  // ---------- The push ----------
  const shove = s(c.shove)
  const brace = s(c.brace)
  const x = [[0, 0, 'out']]
  const strain = [[0, 0, 'linear']]
  c.shoves.forEach((to, i) => {
    const at = i * (shove + brace)
    if (i > 0) x.push([at, c.shoves[i - 1], i === c.shoves.length - 1 ? 'draw' : 'out'])
    x.push([at + shove, to, 'linear'])
    if (i === c.shoves.length - 1) return
    const b = at + shove
    strain.push([b, 0, 'out'], [b + 0.08, 1, 'linear'], [b + brace - 0.04, 1, 'out'], [b + brace + 0.06, 0, 'linear'])
  })
  const pushed = (c.shoves.length - 1) * (shove + brace) + shove
  key('box', 'x', x) // 0 out of sight on the start side, 1 in its place
  key('man', 'strain', strain)
  // His feet keep going, scrabbling while the box won't move.
  key('man', 'step', [
    [0, 0, 'linear'],
    [pushed, pushed * 2 * Math.PI * 2.6],
  ])
  // Leaning into it (1); as the box stops he nearly tips over, then straightens a little.
  key('man', 'lean', [
    [0, 1, 'linear'],
    [pushed, 1, 'out'],
    [pushed + 0.12, 1.35, 'settle'],
    [pushed + s(c.lurch), 0.55],
  ])

  // ---------- Three more drop from above ----------
  const at = pushed + s(c.lurch) + s(c.pause)
  const fall = s(c.fall)
  c.drops.forEach((delay, i) => {
    const start = at + s(delay)
    const landed = start + fall
    key(`drop${i}`, 'fall', [
      [start, 0, 'fall'],
      [landed, 1],
    ])
    key(`drop${i}`, 'squash', [
      [landed, 0, 'out'],
      [landed + 0.06, 1, 'settle'],
      [landed + 0.3, 0],
    ])
    key(`drop${i}`, 'impact', [
      [landed, 0, 'out'],
      [landed + 0.35, 1],
    ])
  })

  // ---------- He jumps back, surprised (pose 1), then stands proud (pose 2) ----------
  const first = at + fall
  const jump = first + 0.02
  key('man', 'pose', [
    [jump, 0, 'out'],
    [jump + 0.18, 1, 'linear'],
    [first + s(c.proud), 1, 'settle'],
    [first + s(c.proud + c.proudFor), 2],
  ])
  key('man', 'back', [
    [jump, 0, 'out'],
    [jump + s(c.jump), 1],
  ])
  key('man', 'hop', [
    [jump, 0, 'out'],
    [jump + s(c.jump) * 0.45, 1, 'fall'],
    [jump + s(c.jump), 0],
  ])
  key('man', 'wow', [
    [jump, 0, 'linear'],
    [jump + 0.5, 1],
  ])

  // ---------- «۴» is pasted in, then the caption ----------
  const p = INTRO.paste
  const paste = first + s(c.paste)
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
