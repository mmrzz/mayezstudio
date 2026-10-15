// Receipt 1: «۴ سامانهٔ دولتی ساخته‌ایم», counted in a retro game: a pixel-art man pushes a crate
// in, three more drop onto it, he startles and cheers beside the pile (systems-art.js). The scene,
// figure and caption play on one Theatre timeline (systems-timeline.js, D-016).
//
// The finished state is what render made: the figure, the caption and the scene's markup (the
// pile and the man standing proud), which sits behind the text across the whole card. A reveal
// that is not instant plays into it, then puts the finished markup back. After that, while the
// card is on screen, he lies back on a crate and whistles (the idle loop, core/timeline.js).
import '../../intro.css'
import { receipt } from '../../receipt.js'
import { INTRO } from '../../../../../config.js'
import { wordsFor } from '../../../../../core/timeline.js'
import { systemsSpec } from './systems-timeline.js'

const FIGURE = '۴'
const CAPTION = 'سامانهٔ دولتی ساخته‌ایم'
const count = (text) => text.split(/\s+/).length

let lib
let tl

export default {
  id: 'intro-systems',
  look: { fill: 'var(--tone-coral)', edge: 'var(--tone-coral-edge)' },
  async load() {
    const [timeline, art, words] = await Promise.all([
      import('../../../../../core/timeline.js'),
      import('./systems-art.js'),
      import('../../../../../core/words.js'),
    ])
    lib = { ...timeline, ...art, ...words }
    tl ??= await timeline.timeline('intro-systems', systemsSpec({ caption: count(CAPTION) }))
  },
  render(box) {
    const root = receipt(box, { kind: 'systems', figure: FIGURE, caption: CAPTION })
    root.dataset.motion = ''
    const stage = document.createElement('div')
    stage.className = 'px-stage'
    stage.setAttribute('aria-hidden', 'true')
    root.prepend(stage)

    let scene = null
    // The scene is sized to the card and to the room the text leaves it, and drawn finished.
    const place = () => {
      const rect = root.getBoundingClientRect()
      const zoom = rect.width / root.offsetWidth || 1 // rects are in screen px; the test route zooms the box
      const w = root.clientWidth
      const h = root.clientHeight
      const text = [root.querySelector('.receipt-figure'), root.querySelector('.receipt-caption')]
      const top = Math.max(...text.map((el) => (el.getBoundingClientRect().bottom - rect.top) / zoom))
      const textLeft = Math.min(...text.map((el) => (el.getBoundingClientRect().left - rect.left) / zoom))
      scene = lib.createScene(w, h, { top, textLeft, strip: w / h > 2.6 })
      return scene.mount(stage)
    }
    let art = place()

    let alive = true
    let stopIdle = null
    const startIdle = () => {
      if (!alive || stopIdle) return
      let live = null
      stopIdle = lib.idle(box, { show: () => (live ??= place()), tick: (t) => live.idle(t) })
    }

    let playing = null
    const onReveal = (e) => {
      if (e.detail.instant || lib.reduced()) return startIdle()
      art = place()
      playing = play(root, art, startIdle)
    }
    box.addEventListener('reveal', onReveal, { once: true })
    return () => {
      alive = false
      box.removeEventListener('reveal', onReveal)
      playing?.()
      stopIdle?.()
    }
  },
}

// Sets the starting state at once (before the next paint), then plays after the motion delay,
// then calls then(). Returns stop(), which also puts the finished state back.
function play(root, art, then) {
  const sec = (ms) => ms / 1000
  const run = tl.instance()

  // ---------- Text: «۴» is pasted in, the caption's words rise ----------
  const figure = root.querySelector('.receipt-figure')
  const caption = root.querySelector('.receipt-caption')
  const split = lib.splitWords(caption)
  const selection = document.createElement('i')
  selection.className = 'selection'
  selection.setAttribute('aria-hidden', 'true')
  selection.append(...Array.from({ length: 4 }, () => document.createElement('b')))
  figure.append(selection)
  const rise = 0.3 * parseFloat(getComputedStyle(caption).fontSize)
  const w = INTRO.words
  const wordsLength = wordsFor(split.words.length, w.stagger, w.rise)

  function text(v) {
    figure.style.opacity = v.figure.pop > 0 ? 1 : 0
    figure.style.transform = `scale(${v.figure.pop || 1})`
    selection.style.opacity = v.figure.selection
    const elapsed = v.caption.words * wordsLength
    split.words.forEach((word, k) => {
      const u = lib.clamp01((elapsed - k * sec(w.stagger)) / sec(w.rise))
      word.style.opacity = u
      word.style.transform = `translateY(${(1 - lib.ease.land(u)) * rise}px)`
    })
  }

  const frameAt = (v) => {
    text(v)
    art.apply(v)
  }
  frameAt(run.at(0))

  let done = false
  const finish = () => {
    if (done) return
    done = true
    stop()
    split.revert()
    selection.remove()
    figure.style.opacity = ''
    figure.style.transform = ''
    art.reset()
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
