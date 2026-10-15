// Receipt 2: «۱ سال توسعه و نگهداری سامانه‌های در حال اجرا», shown as one year: the Earth goes once
// round the Sun (year-art.js, a 3D scene with real orbital mechanics). The scene, figure and
// caption play on one Theatre timeline (year-timeline.js, D-016).
//
// The finished state is what render made: the figure, the caption and an image of the finished
// year, which sits behind the text across the whole card. A reveal that is not instant plays into
// it on a live WebGL canvas, then lets the canvas and its context go and leaves the image. After
// that, while the card is on screen, the years go on slowly on a live canvas (the idle loop,
// core/timeline.js); off screen it is let go again and the image shows where she had got to.
import '../../intro.css'
import { receipt } from '../../receipt.js'
import { INTRO } from '../../../../../config.js'
import { wordsFor } from '../../../../../core/timeline.js'
import { yearSpec } from './year-timeline.js'

const FIGURE = '۱ سال'
const CAPTION = 'توسعه و نگهداری سامانه‌های در حال اجرا'
const count = (text) => text.split(/\s+/).length

let lib
let tl
let planets // a promise: the planets' textures are built in workers while the page loads
let space

export default {
  id: 'intro-year',
  look: { fill: 'var(--tone-mint)', edge: 'var(--tone-mint-edge)' },
  async load() {
    const [timeline, art, words, pl] = await Promise.all([
      import('../../../../../core/timeline.js'),
      import('./year-art.js'),
      import('../../../../../core/words.js'),
      import('./year-planets.js'),
    ])
    lib = { ...timeline, ...art, ...words, ...pl }
    space = lib.readSpace()
    // The page does not wait for the planets: the card is not seen until it is scrolled to, and
    // finishes itself (its image, or its animation) as soon as they are built.
    planets ??= lib.loadPlanets(space)
    tl ??= await timeline.timeline('intro-year', yearSpec({ caption: count(CAPTION) }))
  },
  render(box) {
    const root = receipt(box, { kind: 'year', figure: FIGURE, caption: CAPTION })
    root.dataset.motion = ''
    const stage = document.createElement('div')
    stage.className = 'orb-stage'
    stage.setAttribute('aria-hidden', 'true')
    root.prepend(stage)
    let alive = true

    // The orrery sized to the card; null where WebGL is not available (the card is then plain space).
    const make = (built) => {
      const rect = root.getBoundingClientRect()
      const zoom = rect.width / root.offsetWidth || 1 // rects are in screen px; the test route zooms the box
      const width = root.clientWidth
      const height = root.clientHeight
      try {
        return lib.createOrrery({ width, height, strip: width / height > 2.6, planets: built, space, zoom })
      } catch (err) {
        console.warn('[intro-year] no WebGL; the year shows as plain space', err)
        return null
      }
    }
    // The finished year, as an image, once the planets exist.
    const still = document.createElement('img')
    still.alt = ''
    planets.then((built) => {
      if (!alive) return
      const orrery = make(built)
      if (!orrery) return
      still.src = orrery.snapshot()
      orrery.dispose()
      stage.prepend(still)
    })

    let stopIdle = null
    const startIdle = (built) => {
      if (!alive || stopIdle) return
      let orrery = null
      let year = 1
      stopIdle = lib.idle(box, {
        show: () => {
          orrery = make(built)
          if (orrery) stage.append(orrery.canvas)
        },
        tick: (t) => {
          year = 1 + t / INTRO.year.idle
          orrery?.render(year)
        },
        hide: () => {
          if (!orrery) return
          still.src = orrery.snapshot(year)
          orrery.dispose()
          orrery = null
        },
      })
    }

    let playing = null
    const onReveal = (e) => {
      planets.then((built) => {
        if (!alive) return
        if (e.detail.instant || lib.reduced()) return startIdle(built)
        const orrery = make(built)
        if (orrery) playing = play(root, stage, orrery, () => startIdle(built))
      })
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
function play(root, stage, orrery, then) {
  const sec = (ms) => ms / 1000
  const run = tl.instance()
  stage.append(orrery.canvas)

  // ---------- Text: «۱ سال» is pasted in, the caption's words rise ----------
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
    orrery.render(v.orbit.t)
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
    orrery.dispose() // the image of the finished year is still under it
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
