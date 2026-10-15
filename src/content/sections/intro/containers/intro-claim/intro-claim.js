// Section 1's claim: two beats, one per party, then the supporting line (D-012), beside an
// interface that builds itself, from idea to delivery (claim-ui.js). Text and interface play on
// one Theatre timeline (claim-timeline.js, D-016).
//
// The finished state is what render made: the text and the interface's markup. A reveal that is
// not instant plays into it, then clears what it set and leaves the finished state as it was.
// After that, while the card is on screen, new orders come in to the app (the idle loop,
// core/timeline.js).
import '../../intro.css'
import { INTRO } from '../../../../../config.js'
import { claimSpec } from './claim-timeline.js'
import { wordsFor } from '../../../../../core/timeline.js'

const BEATS = ['ایده از شما،', 'طراحی و ساخت از ما.']
const LINE = 'یک تیم، از ایده تا تحویل.'
const count = (text) => text.split(/\s+/).length

// A state exported from Theatre's studio (?studio in dev), if one has been saved next to the
// section. It replaces the keyframes built from config.js.
const saved = Object.values(import.meta.glob('../../intro-claim.theatre-project-state.json', { eager: true, import: 'default' }))[0]

let lib
let timelines // { beside, behind }: where the window sits decides the order of text and window

export default {
  id: 'intro-claim',
  look: { fill: 'var(--tone-sun)', edge: 'var(--tone-sun-edge)' },
  async load() {
    const [timeline, ui, words] = await Promise.all([
      import('../../../../../core/timeline.js'),
      import('./claim-ui.js'),
      import('../../../../../core/words.js'),
    ])
    lib = { ...timeline, ...ui, ...words }
    const counts = { beat1: count(BEATS[0]), beat2: count(BEATS[1]), line: count(LINE) }
    timelines ??= {
      beside: await timeline.timeline('intro-claim', claimSpec(counts), saved),
      behind: await timeline.timeline('intro-claim-behind', claimSpec({ ...counts, behind: true })),
    }
  },
  render(box) {
    const root = document.createElement('div')
    root.className = 'intro-claim'
    root.dataset.motion = ''
    root.innerHTML = `<h1>${BEATS.map((b) => `<span class="claim-beat">${b}</span>`).join('')}</h1><p class="claim-line">${LINE}</p>`
    const layer = document.createElement('div')
    layer.className = 'claim-ui'
    layer.setAttribute('aria-hidden', 'true')
    root.prepend(layer)
    box.append(root)
    const ui = lib.createUi(layer)

    let area = null
    // Measures the room the text leaves and puts the window there, finished.
    const place = () => {
      area = layoutFor(root)
      ui.place(area)
    }
    place()
    // The text decides where the window goes; measure again once the font is in.
    let stale = !document.fonts.check('1em Vazirmatn')
    if (stale) document.fonts.load('1em Vazirmatn').then(() => stale && !playing && place())

    let alive = true
    let stopIdle = null
    const startIdle = () => {
      if (!alive || stopIdle) return
      stopIdle = lib.idle(box, { tick: (t) => ui.idle(t) })
    }

    let playing = null
    const finish = () => {
      playing?.()
      playing = null
    }
    const onReveal = (e) => {
      if (e.detail.instant || lib.reduced()) return startIdle()
      stale = false
      place()
      playing = play(root, ui, area, startIdle)
    }
    box.addEventListener('reveal', onReveal, { once: true })
    return () => {
      alive = false
      box.removeEventListener('reveal', onReveal)
      finish()
      stopIdle?.()
    }
  },
}

// Where the window goes, in px from the root's top left. Beside the text on its end side when
// there is room; else below it, scaled to fit the room that is left, with the text and window
// centred together; else behind the text, centred, where it plays alone and then steps back.
function layoutFor(root) {
  const { width: W, height: H } = lib.DESIGN
  const bw = root.clientWidth
  const bh = root.clientHeight
  const pad = parseFloat(getComputedStyle(root).paddingInlineStart)
  const rect = root.getBoundingClientRect()
  const zoom = rect.width / root.offsetWidth || 1 // rects are in screen px; the test route zooms the box
  const range = document.createRange()
  // The text's extent, with the text laid out as the mode says.
  const extent = () => {
    let left = Infinity
    let bottom = 0
    for (const el of root.querySelectorAll('.claim-beat, .claim-line')) {
      range.selectNodeContents(el)
      const r = range.getBoundingClientRect()
      left = Math.min(left, (r.left - rect.left) / zoom)
      bottom = Math.max(bottom, (r.bottom - rect.top) / zoom)
    }
    return { left, bottom }
  }
  root.style.removeProperty('--lift')
  let mode = 'beside'
  root.dataset.layout = mode
  const gap = pad * 1.5
  const areaW = extent().left - gap - pad
  const areaH = bh - 2 * pad
  let x
  let y
  let s
  if (bw / bh > 1.3 && areaW >= Math.max(240, areaH * 1.2)) {
    s = Math.min(areaW / W, (areaH * 1.04) / H, 1.7)
    x = pad + (areaW - W * s) / 2
    y = pad + Math.max(0, (areaH - H * s) / 2)
  } else {
    mode = 'below'
    root.dataset.layout = mode
    const w = bw - 2 * pad
    const top = extent().bottom + pad * 0.6
    const room = bh - pad - top
    s = Math.min(w / W, room / H, 1.4)
    if (room > 0 && W * s >= 0.5 * bw) {
      const free = room - H * s
      root.style.setProperty('--lift', `${free / 2}px`) // text and window sit centred together
      x = pad + (w - W * s) / 2
      y = top + free / 2
    } else {
      mode = 'behind'
      root.dataset.layout = mode
      s = Math.min((bw * 0.9) / W, (bh * 0.85) / H)
      x = (bw - W * s) / 2
      y = (bh - H * s) / 2
    }
  }
  const behind = mode === 'behind'
  // The delivered chip hangs over the window's top end corner (bottom start when behind the text).
  const toastLeft = Math.max(8, x - 16 * s)
  const toastTop = behind ? bh - 8 - 40 * Math.max(s, 0.9) : Math.max(8, y - 16 * s)
  return { x, y, s, behind, toastLeft, toastTop, rtl: getComputedStyle(root).direction === 'rtl' }
}

// Sets the starting state at once (before the next paint), then plays after the motion delay,
// then calls then(). Returns stop(), which also puts the finished state back.
function play(root, ui, area, then) {
  const c = INTRO.claim
  const sec = (ms) => ms / 1000
  const tl = area.behind ? timelines.behind : timelines.beside
  const run = tl.instance()

  // ---------- Text ----------
  const h1 = root.querySelector('h1')
  const beats = [...root.querySelectorAll('.claim-beat')]
  const line = root.querySelector('.claim-line')
  const splits = [...beats, line].map((el) => lib.splitWords(el))
  for (const beat of beats) beat.style.clipPath = 'inset(-0.3em -1em -0.3em -1em)' // the words rise from behind their line
  const caret = document.createElement('i')
  caret.className = 'claim-caret'
  caret.setAttribute('aria-hidden', 'true')
  h1.append(caret)

  // Where the caret stands in each beat: its start, then the far edge of each word. Measured
  // in screen px and brought back to the box's own.
  const rtl = area.rtl
  const frame = h1.getBoundingClientRect()
  const zoom = frame.width / h1.offsetWidth || 1
  const caretHeight = caret.getBoundingClientRect().height / zoom
  const stops = splits.slice(0, 2).map(({ words }, i) => {
    const rects = words.map((w) => w.getBoundingClientRect())
    const lineRect = beats[i].getBoundingClientRect()
    return {
      y: (lineRect.top - frame.top) / zoom + ((lineRect.height / zoom) - caretHeight) / 2,
      xs: [(rtl ? rects[0].right - 2 : rects[0].left) - frame.left, ...rects.map((r) => (rtl ? r.left : r.right - 2) - frame.left)].map((x) => x / zoom),
    }
  })
  const lineSize = parseFloat(getComputedStyle(line).fontSize)
  const staggers = [c.wordStagger, c.beat2Stagger]

  function text(v) {
    const progress = [v.text.beat1, v.text.beat2]
    splits.slice(0, 2).forEach(({ words }, i) => {
      const elapsed = progress[i] * wordsFor(words.length, staggers[i], c.word)
      words.forEach((w, k) => {
        const u = lib.ease.land(lib.clamp01((elapsed - k * sec(staggers[i])) / sec(c.word)))
        w.style.transform = `translateY(${(1 - u) * 140}%)`
      })
    })
    const { words } = splits[2]
    const elapsed = v.text.line * wordsFor(words.length, c.lineStagger, c.lineWord)
    words.forEach((w, k) => {
      const u = lib.clamp01((elapsed - k * sec(c.lineStagger)) / sec(c.lineWord))
      w.style.opacity = u
      w.style.transform = `translateY(${(1 - lib.ease.land(u)) * c.lineRise * lineSize}px)`
    })
    // The caret travels ahead of the words, a word per stagger.
    const i = progress[1] > 0 ? 1 : 0
    const s = stops[i]
    const at = (progress[i] * wordsFor(splits[i].words.length, staggers[i], c.word)) / sec(staggers[i])
    const k = Math.min(Math.floor(at), s.xs.length - 2)
    const x = s.xs[k] + (s.xs[k + 1] - s.xs[k]) * lib.clamp01(at - k)
    caret.style.opacity = v.text.caret
    caret.style.transform = `translate(${x}px, ${s.y}px)`
  }

  const frameAt = (v) => {
    text(v)
    ui.apply(v)
  }
  frameAt(run.at(0))

  let done = false
  const finish = () => {
    if (done) return
    done = true
    stop()
    for (const s of splits) s.revert()
    for (const beat of beats) beat.style.clipPath = ''
    caret.remove()
    ui.reset()
  }
  const stop = lib.play(run, tl.length, {
    delay: sec(INTRO.motionDelay),
    frame: frameAt,
    done: () => {
      finish()
      then()
    },
  })
  return finish
}
