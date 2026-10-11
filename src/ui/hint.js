// The scroll hint: appears once loading is done, fades over the first part of
// the first screen of scrolling, and returns when back at the top. Until the
// visitor scrolls, the page also peeks now and then (a small dip and back) to
// preview the scroll; the first input stops that for good.

import { HINT_FADE, PEEK_FIRST, PEEK_EVERY, PEEK_TIMES } from './config.js'

export function createHint(scroller) {
  const el = document.querySelector('.scroll-hint')
  let peeking = false

  function update() {
    if (peeking) return // the hint holds still while the page peeks
    const fade = 1 - Math.min(1, scrollY / (HINT_FADE * innerHeight))
    el.style.setProperty('--fade', fade)
  }

  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update)
  update()

  let left = PEEK_TIMES
  let timer = 0
  const stop = () => {
    left = 0
    clearTimeout(timer)
  }

  async function peek() {
    if (!left || scrollY !== 0) return stop() // scrolled by other means (scrollbar, a jump)
    left--
    peeking = true
    const ran = await scroller.peek()
    peeking = false
    update()
    if (!ran) return stop() // cancelled by input, or reduced motion
    if (left) timer = setTimeout(peek, PEEK_EVERY)
  }

  return {
    // Called when loading is over; input before that (blocked anyway) doesn't count.
    show() {
      el.dataset.show = ''
      for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) addEventListener(type, stop, { passive: true })
      timer = setTimeout(peek, PEEK_FIRST)
    },
  }
}
