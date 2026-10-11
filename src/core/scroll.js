// Scroll-linked drawing (plan §3) and snapping (§4). Turns the scroll position
// into each section's progress, smooths it, keeps the drawn state, glides to
// finish a draw, peeks for the scroll hint, jumps between sections, and can
// lock input.

import {
  DRAW_SMOOTHING,
  SNAP_COMMIT,
  SNAP_GLIDE_PER_SCREEN,
  SNAP_GLIDE_MIN,
  SCROLL_STOP_FALLBACK,
  JUMP_SLIDE,
  JUMP_DRAWN_BASE,
  JUMP_DRAWN_PER_SCREEN,
  JUMP_DRAWN_MAX,
  PEEK_DISTANCE,
  PEEK_DURATION,
} from './config.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutQuad = (t) => 1 - (1 - t) ** 2
const bump = (t) => Math.sin(Math.PI * t) ** 2 // 0 -> 1 -> 0, still at both ends

// Keys that scroll the page.
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'])

export function startScroll(sections) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let raf = 0
  let last = 0

  // The page always starts at the top.
  history.scrollRestoration = 'manual'
  scrollTo(0, 0)

  // ---- Input lock: wheel, touch and scroll keys are blocked, and any other
  // scroll (e.g. dragging the scrollbar) is reset. No overflow: hidden, which
  // would change the grid width by hiding the scrollbar.
  let locks = 0
  let resets = 0 // locks that also undo any scroll (the loading lock); jumps scroll by themselves
  let lockY = 0
  const locked = () => locks > 0
  const stop = (e) => locked() && e.cancelable && e.preventDefault()
  addEventListener('wheel', stop, { passive: false })
  addEventListener('touchmove', stop, { passive: false })
  addEventListener('keydown', (e) => SCROLL_KEYS.has(e.key) && stop(e))

  // ---- Snapping: never pulls back, finishes what you started.
  const hasScrollEnd = 'onscrollend' in window
  let restY = 0 // scroll position when scrolling last stopped
  let scrolling = false
  let touching = false
  let gliding = false
  let glideRaf = 0
  let glideDone = null
  let stopTimer = 0

  function cancelGlide() {
    if (!gliding) return
    gliding = false
    cancelAnimationFrame(glideRaf)
    restY = scrollY
    glideDone?.(false)
    glideDone = null
  }

  // Our own scroll motion (snap glides and the peek): y = path(u) over ms. Its
  // scroll events never count as the user's, and any input cancels it.
  // done(true) when it ran to the end, done(false) when cancelled.
  function animate(path, ms, done) {
    cancelGlide()
    const t0 = performance.now()
    gliding = true
    glideDone = done
    const step = (now) => {
      if (!gliding) return
      const u = clamp01((now - t0) / ms)
      scrollTo(0, path(u))
      if (u < 1) glideRaf = requestAnimationFrame(step)
      else {
        gliding = false
        glideDone = null
        restY = scrollY
        done?.(true)
      }
    }
    glideRaf = requestAnimationFrame(step)
  }

  function glide(target) {
    cancelGlide()
    if (reduceMotion.matches) {
      scrollTo(0, target)
      restY = target
      return
    }
    const from = scrollY
    // Slow enough that the draw is seen, and shorter and softer the less is left:
    // past the half point of the section the snap is only a gentle settle.
    const left = Math.abs(target - from) / innerHeight
    const ms = Math.max(SNAP_GLIDE_MIN, left * SNAP_GLIDE_PER_SCREEN)
    const ease = left > 0.5 ? easeInOutCubic : easeOutQuad
    animate((u) => from + (target - from) * ease(u), ms)
  }

  // The scroll hint's peek (plan §5): at the top, before any scroll, the page
  // dips a little and back, then once more, smaller. Not a snap: it starts and
  // ends at the top and stops at the first input. Resolves true if it ran.
  function peek() {
    return new Promise((resolve) => {
      if (locks || gliding || scrollY !== 0 || reduceMotion.matches) return resolve(false)
      const d = PEEK_DISTANCE * innerHeight
      animate((u) => d * (u < 0.6 ? bump(u / 0.6) : 0.4 * bump((u - 0.6) / 0.4)), PEEK_DURATION, resolve)
    })
  }

  function onStop() {
    scrolling = false
    if (touching) return // finger still down; the next stop will decide
    const y = scrollY
    const dir = Math.sign(y - restY)
    restY = y
    // Off during loading and jumps, and inside a section taller than the screen.
    if (!dir || locked() || gliding || sections[0].el.offsetHeight > innerHeight + 1) return
    const tops = sections.map((s) => s.el.offsetTop)
    if (tops.some((t) => Math.abs(t - y) < 1)) return // exactly on a section
    // The section boundary behind you and the one ahead, in the scroll direction.
    const behind = dir > 0 ? tops.findLast((t) => t <= y) : tops.find((t) => t >= y)
    const target = dir > 0 ? tops.find((t) => t > y) : tops.findLast((t) => t < y)
    if (behind === undefined || target === undefined) return
    // Snapping only finishes a draw: once a section is drawn, scrolling is free.
    if (sections[tops.indexOf(target)].drawn) return
    // Far enough toward the next section? Otherwise stay where you are.
    if (Math.abs(y - behind) >= SNAP_COMMIT * innerHeight) glide(target)
  }

  function onScroll() {
    if (locked()) {
      if (resets && scrollY !== lockY) scrollTo(0, lockY)
      return
    }
    if (gliding) return
    scrolling = true
    if (!hasScrollEnd) {
      clearTimeout(stopTimer)
      stopTimer = setTimeout(onStop, SCROLL_STOP_FALLBACK)
    }
  }

  if (hasScrollEnd) addEventListener('scrollend', () => scrolling && onStop())
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('touchstart', () => ((touching = true), cancelGlide()), { passive: true })
  const touchDone = () => {
    touching = false
    if (!hasScrollEnd && scrolling) {
      clearTimeout(stopTimer)
      stopTimer = setTimeout(onStop, SCROLL_STOP_FALLBACK)
    }
  }
  addEventListener('touchend', touchDone, { passive: true })
  addEventListener('touchcancel', touchDone, { passive: true })
  // Any user input cancels a glide.
  addEventListener('wheel', cancelGlide, { passive: true })
  addEventListener('pointerdown', cancelGlide, { passive: true })
  addEventListener('keydown', (e) => SCROLL_KEYS.has(e.key) && cancelGlide())

  // 0 when the section's top enters at the bottom of the screen, 1 when it fills the screen.
  function target(s) {
    return clamp01((innerHeight - s.el.getBoundingClientRect().top) / s.el.offsetHeight)
  }

  function preloadAhead() {
    const height = sections[0].el.offsetHeight
    const current = Math.min(sections.length - 1, Math.max(0, Math.floor((scrollY + innerHeight / 2) / height)))
    sections[current + 1]?.preload()
  }

  function tick(now) {
    const dt = Math.min(100, now - last)
    last = now
    let active = false

    for (const s of sections) {
      // The loading section is on its own clock; a drawn section is never touched again.
      if (s.def.clock || s.drawn) continue
      const goal = target(s)
      let p = s.progress
      if (reduceMotion.matches) p = goal > 0 ? 1 : p
      else p += (goal - p) * (1 - Math.exp(-dt / DRAW_SMOOTHING))
      if (Math.abs(goal - p) < 0.0005) p = goal
      // Never goes down.
      p = Math.max(p, s.progress)
      if (p !== s.progress) s.draw(p)
      if (p >= 1) s.finish()
      else if (p < goal) active = true
    }

    preloadAhead()
    raf = active ? requestAnimationFrame(tick) : 0
  }

  function run() {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  addEventListener('scroll', run, { passive: true })
  addEventListener('resize', run)
  run()

  // ---- Jumping (plan §7)

  // The section covering most of the screen.
  function currentIndex() {
    let best = 0
    let bestOverlap = -1
    sections.forEach((s, i) => {
      if (s.el.style.display === 'none') return
      const top = s.el.offsetTop
      const overlap = Math.min(top + s.el.offsetHeight, scrollY + innerHeight) - Math.max(top, scrollY)
      if (overlap > bestOverlap) [best, bestOverlap] = [i, overlap]
    })
    return best
  }

  // Eased scroll to y; resolves when done.
  function animateTo(y, ms) {
    return new Promise((resolve) => {
      if (reduceMotion.matches || ms <= 0) {
        scrollTo(0, y)
        return resolve()
      }
      const from = scrollY
      const t0 = performance.now()
      const step = (now) => {
        const u = clamp01((now - t0) / ms)
        scrollTo(0, from + (y - from) * easeInOutCubic(u))
        if (u < 1) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  const nextFrame = () => new Promise((r) => requestAnimationFrame(r))
  let jumping = false

  async function jump(index) {
    const target = sections[index]
    if (!target || jumping || locks) return
    jumping = true
    const release = lock(false)
    cancelGlide()
    const screen = innerHeight

    try {
      const current = currentIndex()
      if (target.drawn || index <= current) {
        // A drawn section: eased scroll, a little longer for a longer way.
        const screens = Math.abs(target.el.offsetTop - scrollY) / screen
        await animateTo(target.el.offsetTop, Math.min(JUMP_DRAWN_MAX, JUMP_DRAWN_BASE + JUMP_DRAWN_PER_SCREEN * screens))
      } else if (index === current + 1) {
        // The next section: glide one screen; the scroll draws it as usual.
        target.preload()
        await animateTo(target.el.offsetTop, JUMP_SLIDE)
      } else {
        // Further away: slide the target in as if it were the next section, with
        // the sections between hidden. They are marked drawn once it has arrived.
        target.preload()
        const between = sections.slice(current + 1, index)
        for (const s of between) s.el.style.display = 'none'
        await animateTo(target.el.offsetTop, JUMP_SLIDE)
        // It draws through the usual smoothing; give it a moment, then finish it.
        const give = performance.now() + 1500
        while (!target.drawn && performance.now() < give) await nextFrame()
        target.finish()
        // In one frame: remove the shift and put the scroll at the target's real position.
        for (const s of between) {
          s.el.style.display = ''
          s.finish()
        }
        scrollTo(0, target.el.offsetTop)
      }
      target.el.focus({ preventScroll: true })
    } finally {
      jumping = false
      release()
    }
  }

  // Loading uses lock() (stray scrolls are undone); jumps lock input but scroll by themselves.
  function lock(reset = true) {
    if (!locks++ && reset) lockY = scrollY
    if (reset) resets++
    let released = false
    return () => {
      if (released) return
      released = true
      if (reset) resets--
      if (!--locks) restY = scrollY
    }
  }

  // Resize and rotation (plan §9): the page is rebuilt with other heights, so
  // remember which section is at the top and how far into it we are. Call
  // before the rebuild; the returned function puts the scroll back after it.
  function anchor() {
    if (sections.some((s) => s.el.style.display === 'none')) return () => {} // mid-jump: heights are shifted
    cancelGlide()
    let top = sections[0]
    for (const s of sections) if (s.el.offsetTop <= scrollY + 0.5) top = s
    const fraction = (scrollY - top.el.offsetTop) / top.el.offsetHeight
    return () => {
      const y = top.el.offsetTop + fraction * top.el.offsetHeight
      scrollTo(0, y)
      restY = y
      if (resets) lockY = y // a resetting lock now holds the restored position
    }
  }

  return { lock, jump, anchor, peek, current: currentIndex }
}
