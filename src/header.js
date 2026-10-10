// The header island (plan §6): the only thing above the grid. It forms from the
// loading logo over the first screen of scrolling (in both directions), then
// hides and shows as you scroll, and is used to navigate.
//
// Layers (all inside the fixed .chrome):
//   .logo-link  the logo, centred at hero size; moves into the island's logo slot
//   .island     a pill: outline (drawn like a grid line), fill, section titles, theme toggle

import {
  DRAW_SMOOTHING,
  FORM_LOGO,
  FORM_OUTLINE,
  FORM_TITLES,
  HEADER_IDLE_HIDE,
  ISLAND_ROWS,
  ISLAND_MIN,
  ISLAND_GUTTER,
} from './config.js'
import { glowAt } from './grid.js'
import { isDark, toggleTheme, onSystemTheme } from './theme.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const range = (v, [from, to]) => clamp01((v - from) / (to - from))
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const NS = 'http://www.w3.org/2000/svg'

export function createHeader(sections) {
  const chrome = document.querySelector('.chrome')
  const island = chrome.querySelector('.island')
  const logoLink = chrome.querySelector('.logo-link')

  // ---- Build the island: outline, logo slot, one real link per section, theme toggle.
  island.innerHTML = `<svg class="island-outline" aria-hidden="true"><path class="island-line" pathLength="1"/><circle class="island-tip" r="2.5"/></svg><span class="island-slot"></span><button class="island-toggle" type="button" aria-expanded="false" aria-controls="island-links">Menu</button><div class="island-links" id="island-links"></div><button class="island-theme" type="button" aria-label="Dark mode"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="theme-moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/><g class="theme-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></g></svg></button>`
  const outline = island.querySelector('.island-outline')
  const line = island.querySelector('.island-line')
  const tip = island.querySelector('.island-tip')
  const slot = island.querySelector('.island-slot')
  const items = sections
    .filter((s) => !s.def.clock)
    .map((s) => {
      const a = document.createElement('a')
      a.className = 'island-link'
      a.href = `#${s.def.id}`
      a.textContent = s.def.title
      return { a, s }
    })
  const toggle = island.querySelector('.island-toggle')
  const linkBox = island.querySelector('.island-links')
  linkBox.append(...items.map((i) => i.a))
  const theme = island.querySelector('.island-theme')

  // Pressed = dark. It shows the moon in light mode and the sun in dark mode.
  // The new theme bleeds out from the click (from the button's centre for a key press).
  const syncTheme = () => theme.setAttribute('aria-pressed', String(isDark()))
  theme.addEventListener('click', (e) => {
    const r = theme.getBoundingClientRect()
    const [x, y] = e.detail ? [e.clientX, e.clientY] : [r.left + r.width / 2, r.top + r.height / 2]
    toggleTheme(x, y, syncTheme)
  })
  onSystemTheme(syncTheme)
  syncTheme()

  let cellH = 0
  let firstH = 1
  let hero = { x: 0, y: 0, scale: 1 } // offset and scale from the hero spot to the island's logo slot
  let pathLength = 1

  // ---- Geometry
  function layout(geo) {
    cellH = geo.cellH
    firstH = geo.sectionHeight
    const h = Math.max(ISLAND_MIN, ISLAND_ROWS * cellH)
    const top = (cellH - h) / 2
    chrome.style.setProperty('--island-h', `${h}px`)
    chrome.style.setProperty('--island-top', `${top}px`)
    chrome.style.setProperty('--hide-dist', `${-(top + h + 12)}px`)
    // Compact when the titles do not fit with a margin on each side. Measured
    // at the new height, since the island's padding and text scale with it.
    island.removeAttribute('data-compact')
    setMenu(false)
    island.toggleAttribute('data-compact', island.offsetWidth + 2 * ISLAND_GUTTER > chrome.clientWidth)

    // Where the logo ends up (measured from layout, so transforms don't matter).
    const heroW = logoLink.offsetWidth
    const slotCX = island.offsetLeft + slot.offsetLeft + slot.offsetWidth / 2
    const slotCY = island.offsetTop + h / 2
    hero = {
      x: slotCX - chrome.clientWidth / 2,
      y: slotCY - chrome.clientHeight / 2,
      scale: slot.offsetWidth / heroW,
    }

    // The outline is a pill path starting at the top centre, drawn clockwise.
    const w = island.offsetWidth
    const r = h / 2
    outline.setAttribute('width', w)
    outline.setAttribute('height', h)
    line.setAttribute(
      'd',
      `M${w / 2} .5H${w - r}A${r - 0.5} ${r - 0.5} 0 0 1 ${w - r} ${h - 0.5}H${r}A${r - 0.5} ${r - 0.5} 0 0 1 ${r} .5Z`,
    )
    pathLength = line.getTotalLength()
    line.style.strokeDasharray = ''
    apply(F)
  }

  // ---- Formation: follows the scroll position, smoothed, in both directions.
  let F = 0 // smoothed formation, 0..1
  let raf = 0
  let last = 0

  function apply(f) {
    const move = easeInOutCubic(range(f, FORM_LOGO))
    const s = chrome.style
    s.setProperty('--lx', `${hero.x * move}px`)
    s.setProperty('--ly', `${hero.y * move}px`)
    s.setProperty('--ls', 1 + (hero.scale - 1) * move)
    s.setProperty('--outline', 1 - range(f, FORM_LOGO))

    const drawn = range(f, FORM_OUTLINE)
    line.style.strokeDasharray = `${drawn} 1`
    const point = line.getPointAtLength(pathLength * drawn)
    tip.setAttribute('cx', point.x)
    tip.setAttribute('cy', point.y)
    tip.style.opacity = drawn > 0 && drawn < 1 ? glowAt(drawn) : 0
    s.setProperty('--fill', drawn * drawn * (3 - 2 * drawn))

    // The titles appear one by one, then the theme toggle.
    const titles = range(f, FORM_TITLES)
    const steps = items.length + 1
    toggle.style.setProperty('--o', titles)
    items.forEach((item, i) => item.a.style.setProperty('--o', clamp01(titles * steps - i)))
    theme.style.setProperty('--o', clamp01(titles * steps - items.length))

    // Usable only once formed; until then the island is not in the tab order or the page's tree.
    const live = f >= FORM_TITLES[1]
    island.inert = !live
    logoLink.tabIndex = live ? 0 : -1
    chrome.toggleAttribute('data-live', live)
  }

  // Reduced motion: no travelling logo. The header switches between hero and
  // island with a fade when the formation passes the half way point.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  let switching = false
  function switchTo(value) {
    if (value === F || switching) return
    switching = true
    chrome.toggleAttribute('data-fading', true)
    setTimeout(() => {
      F = value
      apply(F)
      chrome.toggleAttribute('data-fading', false)
      switching = false
      run() // the scroll may have moved on meanwhile
    }, 150)
  }

  function tick(now) {
    const dt = Math.min(100, now - last)
    last = now
    const target = clamp01(scrollY / firstH)
    if (reduce.matches) {
      raf = 0
      return switchTo(target >= FORM_LOGO[1] ? 1 : 0)
    }
    F += (target - F) * (1 - Math.exp(-dt / DRAW_SMOOTHING))
    if (Math.abs(target - F) < 0.0005) F = target
    apply(F)
    raf = F === target ? 0 : requestAnimationFrame(tick)
  }

  function run() {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  // ---- Show and hide: only once the first screen is fully scrolled.
  let hidden = false
  let hovered = false
  let focused = false
  let inBand = false
  let idleTimer = 0
  let prevY = scrollY
  const formed = (y = scrollY) => y >= firstH - 1

  function setHidden(value) {
    hidden = value
    chrome.toggleAttribute('data-hidden', value)
    if (value) setMenu(false)
  }
  const resting = () => !hovered && !focused && !inBand

  function armIdle() {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => formed() && resting() && setHidden(true), HEADER_IDLE_HIDE)
  }

  function onScroll() {
    const y = scrollY
    const dy = y - prevY
    if (!formed()) {
      clearTimeout(idleTimer)
      setHidden(false)
    } else {
      // Arriving at the end of the first screen never hides; scrolling on from there does.
      if (dy > 2 && formed(prevY) && resting()) setHidden(true)
      else if (dy < -2) setHidden(false)
      armIdle()
    }
    prevY = y
    run()
    markCurrent()
  }

  function show() {
    if (!formed()) return
    setHidden(false)
    armIdle()
  }

  // The top band is one row tall and full width, detected from the pointer
  // position (never an element, so it can't block clicks on content under it).
  addEventListener(
    'pointermove',
    (e) => {
      const now = e.clientY < cellH
      if (now === inBand) return
      inBand = now
      if (now) show()
      else armIdle()
    },
    { passive: true },
  )
  // Tapping the band on touch screens.
  addEventListener(
    'pointerdown',
    (e) => e.pointerType !== 'mouse' && e.clientY < cellH && show(),
    { passive: true },
  )

  for (const el of [island, logoLink]) {
    el.addEventListener('pointerenter', () => ((hovered = true), show()))
    el.addEventListener('pointerleave', () => ((hovered = false), armIdle()))
  }
  chrome.addEventListener('focusin', () => ((focused = true), show()))
  chrome.addEventListener('focusout', () => ((focused = false), armIdle()))

  // ---- Compact mode: tap the current title to open the other sections.
  function setMenu(open) {
    island.toggleAttribute('data-open', open)
    toggle.setAttribute('aria-expanded', String(open))
  }
  toggle.addEventListener('click', () => setMenu(!island.hasAttribute('data-open')))
  addEventListener('pointerdown', (e) => !island.contains(e.target) && setMenu(false), { passive: true })
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false))

  // ---- Current section gets aria-current.
  function markCurrent() {
    const viewTop = scrollY
    const viewBottom = scrollY + innerHeight
    let best = null
    let bestOverlap = 0
    for (const { s } of items) {
      const top = s.el.offsetTop
      const overlap = Math.min(top + s.el.offsetHeight, viewBottom) - Math.max(top, viewTop)
      if (overlap > bestOverlap) [best, bestOverlap] = [s, overlap]
    }
    // The loading section counts too: nothing is current while it covers most of the screen.
    if (bestOverlap < innerHeight / 2) best = null
    for (const item of items) {
      if (item.s === best) item.a.setAttribute('aria-current', 'true')
      else item.a.removeAttribute('aria-current')
    }
    toggle.firstChild.nodeValue = best ? best.def.title : 'Menu'
  }

  // Titles jump to their section, the logo to the top. Modified clicks keep their
  // default (open in a new tab).
  let jump = () => {}
  chrome.addEventListener('click', (e) => {
    const a = e.target.closest('a')
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (a.matches('.logo-link')) jump(0)
    else if (a.matches('.island-link')) {
      setMenu(false)
      jump(sections.indexOf(items.find((i) => i.a === a).s))
    }
    else return
    e.preventDefault()
  })

  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', run)
  markCurrent()

  return {
    layout,
    bindJump(fn) {
      jump = fn
    },
  }
}
