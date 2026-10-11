import './style.css'
import sections from './content/sections.js'
import { createSection } from './core/section.js'
import { startLoading } from './ui/loading.js'
import { startScroll } from './core/scroll.js'
import { createHint } from './ui/hint.js'
import { createHeader } from './ui/header.js'
import { createUrl } from './core/url.js'
import { pickProfile, measureScreen, computeGeometry } from './core/layout.js'
import { RESIZE_DEBOUNCE } from './config.js'

const params = new URLSearchParams(location.search)

// Build the page: the loading section is already in index.html, the rest are made here.
const page = document.querySelector('.page')
const built = sections.map((def) =>
  createSection(def, def.id === 'loading' ? page.querySelector('[data-section="loading"]') : undefined),
)
page.append(...built.map((s) => s.el).filter((el) => !el.parentNode))

const header = createHeader(built)

// Recompute the geometry and rebuild every section, keeping each one's progress
// and drawn state, and the scroll at the same section and offset. A resize that
// leaves the grid as it was (a phone's address bar showing or hiding: the width
// and 100svh stay put) only re-places the header, whose hero spot is the
// viewport's centre.
let scroller = null
let mounted = ''
function layout() {
  const profile = pickProfile()
  const screen = measureScreen()
  const geo = computeGeometry(profile, screen)
  const key = `${profile.name} ${screen.width}x${screen.height}@${screen.dpr}`
  if (key === mounted) return header.layout(geo)
  mounted = key
  const restore = scroller?.anchor()
  built.forEach((s) => s.mount(geo, profile))
  header.layout(geo)
  restore?.()
}
layout()

let resizeTimer
addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(layout, RESIZE_DEBOUNCE)
})

if (import.meta.env.DEV && params.has('grid')) {
  import('./dev/debug.js').then((m) => m.mountGridOverlay(built))
}

// Content is ready once fonts, the window and the first section's content have
// loaded. In dev, readiness is held back 15s (TEST: 5s draw + 10s waiting);
// override with ?delay=ms.
const delay = import.meta.env.DEV ? Number(params.get('delay') ?? 15000) : 0
const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r)))
const ready = Promise.all([document.fonts.ready, loaded, new Promise((r) => setTimeout(r, delay)), built[1].preload()])

// Input stays locked until the loading burst ends; then the scroll hint appears.
scroller = startScroll(built)
const hint = createHint(scroller)
const unlock = scroller.lock()
header.bindJump(scroller.jump)
const url = createUrl(built, scroller)
startLoading(built[0], ready, matchMedia('(prefers-reduced-motion: reduce)').matches).then(() => {
  unlock()
  hint.show()
  url.start() // opening on a section link jumps there now
})
