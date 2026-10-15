// The claim's keyframes (D-016), built from the timings in config.js and played by Theatre.
// One timeline for the text and the drawing, so they stay in step:
//   ایده از شما،          a bulb is traced and lights up
//   طراحی و ساخت از ما.   its rays reach four stages of the work, one per word
//   ... از ایده تا تحویل.  the stages go into a box, the light goes, and they peek out of it
// Every prop is a number. Text props are progress (0 to 1) through a beat; the container
// staggers the words from it, so the counts of words come in.

import { INTRO } from '../../../config.js'

const s = (ms) => ms / 1000

// Seconds a run of words takes: `stagger` apart, each `each` long.
export const wordsFor = (count, stagger, each) => s((count - 1) * stagger + each)

// `behind`: the drawing sits behind the text, so it plays first and the text follows it.
export function claimSpec({ beat1, beat2, line, behind = false }) {
  const c = INTRO.claim
  const tracks = {}
  const key = (object, prop, keys) => ((tracks[object] ??= {})[prop] = keys)
  // From `from` to `to`, starting at `at` (s), over `dur` (s).
  const move = (object, prop, at, dur, ease = 'draw', from = 0, to = 1) =>
    key(object, prop, [
      [at, from, ease],
      [at + dur, to],
    ])

  // ---------- Text ----------
  const beat1For = wordsFor(beat1, c.wordStagger, c.word)
  const beat2For = wordsFor(beat2, c.beat2Stagger, c.word)
  const start = behind ? s(c.behind.text) : 0
  const b1 = start + s(c.blink)
  const b2 = behind ? b1 + beat1For + s(c.behind.beatGap) : s(c.beat2)
  const caretOff = behind ? b2 + beat2For + 0.1 : s(c.caretOff)
  const lineAt = behind ? b2 + beat2For + s(c.behind.lineGap) : s(c.line)
  key('text', 'caret', [
    ...(behind ? [[0, 0, 'hold']] : []),
    [start, 1, 'hold'],
    [start + s(c.blinkOn), 0, 'hold'],
    [b1, 1, 'hold'],
    [caretOff, 1],
    [caretOff + s(c.caretFade), 0],
  ])
  move('text', 'beat1', b1, beat1For, 'linear')
  move('text', 'beat2', b2, beat2For, 'linear')
  move('text', 'line', lineAt, wordsFor(line, c.lineStagger, c.lineWord), 'linear')
  // How far the drawing has stepped back behind the text: 0 full strength, 1 faded.
  if (behind) move('layer', 'dim', s(c.behind.dim), s(c.behind.dimFor), 'out')

  // ---------- The idea ----------
  const bulb = s(c.bulb)
  const light = s(c.light)
  move('bulb', 'outline', bulb, 0.6)
  move('bulb', 'base', bulb + 0.35, 0.4)
  move('bulb', 'filament', bulb + 0.55, 0.35)
  const erase = s(c.erase)
  key('bulb', 'ticks', [
    [light, 0, 'settle'],
    [light + 0.45, 1, 'hold'],
    [erase, 1, 'draw'],
    [erase + 0.25, 0],
  ])
  move('bulb', 'halo', light, 0.7, 'out')
  move('bulb', 'erase', erase, 0.45)

  // ---------- The work: four rays, four stage cards ----------
  const absorbed = []
  for (let i = 0; i < 4; i++) {
    const at = s(c.rays + i * c.rayStagger)
    move(`ray${i}`, 'head', at, 0.32)
    const absorb = s(c.absorb + i * c.flyStagger)
    move(`ray${i}`, 'tail', absorb, 0.3)
    absorbed.push(absorb + 0.3)
    move(`card${i}`, 'outline', at + 0.32, 0.3)
    // Pasted: once its outline closes it fills, a little too big, and settles.
    const closed = at + 0.62
    key(`card${i}`, 'pop', [
      [closed - 0.01, 1, 'hold'],
      [closed, INTRO.paste.scale + 0.04, 'settle'],
      [closed + s(INTRO.paste.settle), 1],
    ])
    move(`card${i}`, 'icon', at + 0.55, 0.3)
    move(`card${i}`, 'fly', s(c.fly + i * c.flyStagger), s(c.flyFor), 'flight')
    move(`card${i}`, 'peek', s(c.peek + i * c.peekStagger), 0.45, 'settle')
  }
  // The filament is violet while the idea is lit: 0 unlit, 1 violet, 2 ink once the light has gone into the cards.
  key('bulb', 'glow', [
    [0, 0, 'hold'],
    [light, 1, 'hold'],
    [Math.max(...absorbed), 2],
  ])

  // ---------- The camera turns the flat sketch into a drawing with depth, then moves in on the box ----------
  const turn = s(c.turn)
  move('view', 'az', turn, s(c.turnFor), 'draw', c.view.from[0], c.view.to[0])
  move('view', 'el', turn, s(c.turnFor), 'draw', c.view.from[1], c.view.to[1])
  const focus = s(c.focus)
  ;['x', 'y', 'zoom'].forEach((prop, k) => move('view', prop, focus, s(c.focusFor), 'draw', c.at.from[k], c.at.to[k]))

  // ---------- Delivery: the box ----------
  const box = s(c.box)
  move('box', 'edges', box, 0.8, 'linear') // bottom, uprights, rim: a third each, eased in the drawing
  move('box', 'fill', box + 0.8, 0.15, 'linear') // the box fills once its edges are drawn
  move('box', 'flaps', box + 0.8, 0.35)
  key('box', 'flapFill', [
    [box + 0.8, 0, 'hold'],
    [box + 1.15, 1],
  ])
  const spread = s(c.spread)
  move('box', 'spread', spread, 0.5, 'settle') // the flaps flop open with a bounce...
  key('box', 'squash', [
    [spread + 0.05, 0, 'out'],
    [spread + 0.15, 1, 'settle'],
    [spread + 0.5, 0],
  ]) // ...and the box gives a little
  const label = s(c.label)
  move('box', 'label', label, 0.35)
  key('box', 'labelFill', [
    [label, 0, 'hold'],
    [label + 0.35, 1],
  ])

  const length = Math.max(...Object.values(tracks).flatMap((props) => Object.values(props).map((keys) => keys.at(-1)[0])))
  return { length, tracks }
}
