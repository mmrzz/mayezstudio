// Receipt 1: «۴ سامانهٔ دولتی ساخته‌ایم», counted with four boxes: a man pushes one in, three
// more drop from above, and he stands proud beside the pile (systems-art.js). Drawing, figure
// and caption play on one Theatre timeline (systems-timeline.js, D-016).
//
// The finished state is what render made: the pile as an SVG in the mark, the figure and the
// caption. A reveal that is not instant plays into it on a live Three.js canvas that reaches
// out to the box's start edge and top, so the man and the boxes come in from outside; then it
// puts the SVG back and lets the canvas and its WebGL context go.
import '../intro.css'
import { receipt } from '../receipt.js'
import { INTRO } from '../../../../config.js'
import { systemsSpec } from '../systems-timeline.js'
import { wordsFor } from '../claim-timeline.js'

const FIGURE = '۴'
const CAPTION = 'سامانهٔ دولتی ساخته‌ایم'
const count = (text) => text.split(/\s+/).length

let lib
let tl

export default {
  id: 'intro-systems',
  look: { fill: 'var(--tone-coral)', edge: 'var(--tone-coral-edge)' },
  async load() {
    const [timeline, drawing, art, words] = await Promise.all([
      import('../../../../core/timeline.js'),
      import('../../../../core/drawing.js'),
      import('../systems-art.js'),
      import('../../../../core/words.js'),
    ])
    lib = { ...timeline, ...drawing, ...art, ...words }
    tl ??= await timeline.timeline('intro-systems', systemsSpec({ caption: count(CAPTION) }))
  },
  render(box) {
    const mark = document.createElement('span')
    mark.className = 'pile'
    const root = receipt(box, { kind: 'systems', mark, figure: FIGURE, caption: CAPTION })
    root.dataset.motion = ''

    const materials = lib.createMaterials()
    const rest = tl.instance().at(tl.length)
    const art = lib.createArt({ rtl: getComputedStyle(root).direction === 'rtl', materials, rest })
    mark.style.aspectRatio = `${art.frame.width} / ${art.frame.height}`
    mark.innerHTML = art.svg()

    let playing = null
    const onReveal = (e) => {
      if (e.detail.instant || lib.reduced()) return
      playing = play(box, root, mark, art, materials)
    }
    box.addEventListener('reveal', onReveal, { once: true })
    return () => {
      box.removeEventListener('reveal', onReveal)
      playing?.()
      art.dispose()
      materials.dispose()
    }
  },
}

// Sets the starting state at once (before the next paint), then plays after the motion delay.
// Returns stop(), which also puts the finished state back.
function play(box, root, mark, art, materials) {
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

  // ---------- Drawing: a layer from the mark out to the box's start edge and top ----------
  const rtl = getComputedStyle(root).direction === 'rtl'
  const reach = 0.15 * parseFloat(getComputedStyle(mark).fontSize) // room for strokes past the mark's end
  const left = rtl ? mark.offsetLeft - reach : 0
  const width = rtl ? root.clientWidth - left : mark.offsetLeft + mark.offsetWidth + reach
  const height = mark.offsetTop + mark.offsetHeight + reach
  const layer = document.createElement('div')
  layer.className = 'pile-layer'
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, { left: `${left}px`, top: '0px', width: `${width}px`, height: `${height}px` })

  let renderer = null
  try {
    renderer = lib.createRenderer(width, height, lib.cssZoom(root))
  } catch (err) {
    console.warn('[intro-systems] no WebGL; the drawing shows finished', err)
  }
  const svg = mark.firstElementChild
  let stopTheme = null
  if (renderer) {
    art.fit({ width, height, ox: mark.offsetLeft - left, oy: mark.offsetTop, scale: mark.offsetHeight / art.frame.height })
    svg.style.visibility = 'hidden'
    layer.append(renderer.domElement)
    root.append(layer)
    materials.set(lib.readPalette(box))
    stopTheme = lib.onTheme(() => materials.set(lib.readPalette(box)))
  }

  const frameAt = (v) => {
    text(v)
    if (!renderer) return
    art.apply(v)
    renderer.render(art.scene, art.camera)
  }
  frameAt(run.at(0))

  let done = false
  const finish = () => {
    if (done) return
    done = true
    stop()
    stopTheme?.()
    split.revert()
    selection.remove()
    figure.style.opacity = ''
    figure.style.transform = ''
    if (renderer) {
      lib.disposeRenderer(renderer)
      layer.remove()
      svg.style.visibility = ''
    }
  }
  const stop = lib.play(run, tl.length, { delay: sec(INTRO.motionDelay), frame: frameAt, done: finish })
  return finish
}
