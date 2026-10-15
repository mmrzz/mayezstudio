// The claim's keyframes (D-016), built from the timings in config.js and played by Theatre.
// One timeline for the text and the interface that builds itself beside it (claim-ui.js), so
// they stay in step:
//   ایده از شما،          rough blocks are placed on an empty window by a cursor
//   طراحی و ساخت از ما.   they snap into the grid, then the content is built
//   ... از ایده تا تحویل.  it is delivered
// Every prop is a number. Each is progress (0 to 1) through a phase; the container staggers the
// words, blocks, bars and rows from it, so the counts of items come in.

import { INTRO } from '../../../../../config.js'
import { wordsFor } from '../../../../../core/timeline.js'

const s = (ms) => ms / 1000

// How many of each part the interface has (claim-ui.js builds that many).
export const PARTS = { blocks: 7, nav: 5, stats: 3, bars: 7, rows: 3, guides: 4 }

// `behind`: the window sits behind the text, so it plays first and the text follows it.
export function claimSpec({ beat1, beat2, line, behind = false }) {
  const c = INTRO.claim
  const tracks = {}
  const key = (object, prop, keys) => ((tracks[object] ??= {})[prop] = keys)
  // From `from` to `to`, starting at `at` (s), over `dur` (s).
  const move = (object, prop, at, dur, ease = 'linear', from = 0, to = 1) =>
    key(object, prop, [
      [at, from, ease],
      [at + dur, to],
    ])

  // ---------- Text ----------
  const late = behind ? s(c.behind.text) : 0
  key('text', 'caret', [
    [0, 0, 'hold'],
    [late + s(c.caretOn), 1],
    [late + s(c.caretOff), 1],
    [late + s(c.caretOff + c.caretFade), 0],
  ])
  move('text', 'beat1', late + s(c.beat1), wordsFor(beat1, c.wordStagger, c.word))
  move('text', 'beat2', late + s(c.beat2), wordsFor(beat2, c.beat2Stagger, c.word))
  move('text', 'line', late + s(c.line), wordsFor(line, c.lineStagger, c.lineWord))

  // ---------- The interface ----------
  const part = (prop, p, count) => move('ui', prop, s(p.at), wordsFor(count, p.stagger, p.each))
  move('ui', 'win', s(c.win.at), s(c.win.for))
  part('rough', c.rough, PARTS.blocks)
  move('ui', 'cursor', s(c.cursor.at), s(c.cursor.until - c.cursor.at))
  part('snap', c.snap, PARTS.blocks)
  move('ui', 'guides', s(c.snap.at), wordsFor(PARTS.guides, c.guides.stagger, c.guides.in + c.guides.hold + c.guides.out))
  part('build', c.build, PARTS.blocks)
  part('nav', c.nav, PARTS.nav)
  part('stats', c.stats, PARTS.stats)
  part('bars', c.bars, PARTS.bars)
  part('rows', c.rows, PARTS.rows)
  move('ui', 'sheen', s(c.sheen.at), s(c.sheen.for))
  move('ui', 'toast', s(c.toast.at), s(c.toast.for))
  // How far the window has stepped back behind the text: 0 full strength, 1 faded.
  if (behind) move('ui', 'dim', s(c.behind.dim), s(c.behind.dimFor), 'out')

  const length = Math.max(...Object.values(tracks).flatMap((props) => Object.values(props).map((keys) => keys.at(-1)[0])))
  return { length, tracks }
}
