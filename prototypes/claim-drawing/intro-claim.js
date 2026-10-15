// Section 1's claim: two beats, one per party, then the supporting line (D-012), beside a
// drawing that tells the same story, from idea to delivery (claim-art.js). Text and drawing
// play on one Theatre timeline (claim-timeline.js, D-016).
//
// The finished state is what render made: the text, and the drawing's last frame as an SVG.
// A reveal that is not instant plays into it on a live Three.js canvas, then puts the SVG back
// and lets the canvas and its WebGL context go.
import '../intro.css'
import { INTRO } from '../../../../config.js'
import { claimSpec, wordsFor } from '../claim-timeline.js'

const BEATS = ['ایده از شما،', 'طراحی و ساخت از ما.']
const LINE = 'یک تیم، از ایده تا تحویل.'
const count = (text) => text.split(/\s+/).length

// A state exported from Theatre's studio (?studio in dev), if one has been saved next to the
// section. It replaces the keyframes built from config.js.
const saved = Object.values(import.meta.glob('../intro-claim.theatre-project-state.json', { eager: true, import: 'default' }))[0]

let lib
let timelines // { beside, behind }: where the drawing sits decides the order of text and drawing

export default {
  id: 'intro-claim',
  look: { fill: 'var(--tone-sun)', edge: 'var(--tone-sun-edge)' },
  async load() {
    const [timeline, drawing, art, words] = await Promise.all([
      import('../../../../core/timeline.js'),
      import('../../../../core/drawing.js'),
      import('../claim-art.js'),
      import('../../../../core/words.js'),
    ])
    lib = { ...timeline, ...drawing, ...art, ...words }
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
    layer.className = 'claim-art'
    layer.setAttribute('aria-hidden', 'true')
    root.prepend(layer)
    box.append(root)

    let art = null
    let area = null
    let materials = null
    // Measures the room the text leaves and draws the last frame there as an SVG.
    const place = () => {
      art?.dispose()
      materials ??= lib.createMaterials()
      area = artArea(root)
      Object.assign(layer.style, { left: `${area.x}px`, top: `${area.y}px`, width: `${area.width}px`, height: `${area.height}px` })
      layer.toggleAttribute('data-behind', area.behind)
      art = lib.createArt({ ...area, materials })
      const tl = area.behind ? timelines.behind : timelines.beside
      art.apply(tl.instance().at(tl.length))
      layer.innerHTML = art.svg()
    }
    place()
    // The text decides where the drawing goes; measure again once the font is in.
    let stale = !document.fonts.check('1em Vazirmatn')
    if (stale) document.fonts.load('1em Vazirmatn').then(() => stale && !playing && place())

    let playing = null
    const finish = () => {
      playing?.()
      playing = null
    }
    const onReveal = (e) => {
      if (e.detail.instant || lib.reduced()) return
      stale = false
      place()
      playing = play(box, root, layer, art, area, materials)
    }
    box.addEventListener('reveal', onReveal, { once: true })
    return () => {
      box.removeEventListener('reveal', onReveal)
      finish()
      art?.dispose()
      materials?.dispose()
    }
  },
}

// Where the drawing goes, in px from the root's top left. Beside the text on its end side when
// there is room; otherwise smaller, behind the text, in the end corner (portrait phones).
function artArea(root) {
  const box = root.getBoundingClientRect()
  const pad = parseFloat(getComputedStyle(root).paddingInlineStart)
  const rtl = getComputedStyle(root).direction === 'rtl'
  const range = document.createRange()
  let edge = rtl ? Infinity : -Infinity
  for (const el of root.querySelectorAll('.claim-beat, .claim-line')) {
    range.selectNodeContents(el)
    const r = range.getBoundingClientRect()
    edge = rtl ? Math.min(edge, r.left) : Math.max(edge, r.right)
  }
  const gap = pad * 1.5
  const height = box.height - 2 * pad
  const width = rtl ? edge - box.left - gap - pad : box.right - edge - gap - pad
  if (width >= Math.max(200, height * 1.3)) {
    return { x: rtl ? pad : edge - box.left + gap, y: pad, width: Math.floor(width), height: Math.floor(height), behind: false, rtl }
  }
  const w = Math.floor(box.width * 0.62)
  const h = Math.floor(box.height * 0.72)
  return { x: rtl ? pad / 2 : box.width - w - pad / 2, y: box.height - h - pad / 2, width: w, height: h, behind: true, rtl }
}

// Sets the starting state at once (before the next paint), then plays after the motion delay.
// Returns stop(), which also puts the finished state back.
function play(box, root, layer, art, area, materials) {
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

  // Where the caret stands in each beat: its start, then the far edge of each word.
  const rtl = area.rtl
  const frame = h1.getBoundingClientRect()
  const caretHeight = caret.getBoundingClientRect().height
  const stops = splits.slice(0, 2).map(({ words }, i) => {
    const rects = words.map((w) => w.getBoundingClientRect())
    const lineRect = beats[i].getBoundingClientRect()
    return {
      y: lineRect.top - frame.top + (lineRect.height - caretHeight) / 2,
      xs: [(rtl ? rects[0].right - 2 : rects[0].left) - frame.left, ...rects.map((r) => (rtl ? r.left : r.right - 2) - frame.left)],
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

  // ---------- Drawing ----------
  let renderer = null
  try {
    renderer = lib.createRenderer(area.width, area.height, lib.cssZoom(layer))
  } catch (err) {
    console.warn('[intro-claim] no WebGL; the drawing shows finished', err)
  }
  const svg = layer.firstElementChild
  let tips = null
  let stopTheme = null
  if (renderer) {
    svg.style.display = 'none'
    layer.append(renderer.domElement)
    const tipLayer = document.createElement('div')
    tipLayer.className = 'claim-tips'
    layer.append(tipLayer)
    tips = lib.createTips(tipLayer)
    materials.set(lib.readPalette(box))
    stopTheme = lib.onTheme(() => materials.set(lib.readPalette(box)))
  }

  const frameAt = (v) => {
    text(v)
    if (v.layer) layer.style.setProperty('--dim', v.layer.dim)
    if (!renderer) return
    tips.place(art.apply(v))
    renderer.render(art.scene, art.camera)
  }
  frameAt(run.at(0))

  let done = false
  const finish = () => {
    if (done) return
    done = true
    stop()
    stopTheme?.()
    for (const s of splits) s.revert()
    for (const beat of beats) beat.style.clipPath = ''
    caret.remove()
    layer.style.removeProperty('--dim')
    if (renderer) {
      lib.disposeRenderer(renderer)
      layer.querySelector('.claim-tips')?.remove()
      svg.style.display = ''
    }
  }
  const stop = lib.play(run, tl.length, { delay: sec(INTRO.motionDelay), frame: frameAt, done: finish })
  return finish
}
