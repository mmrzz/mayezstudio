// Light/dark theme. Every token is a light-dark() pair, so the theme is just
// the root's color-scheme: the system's by default, or the visitor's pick from
// the header toggle (data-theme on <html>). The pick is kept in localStorage
// and applied before the first paint by the inline script in index.html.
//
// A change is a view transition: the new theme is revealed through an ink
// mask that spreads from the toggle (src/ink.js). Without view transitions, or
// with reduced motion, it switches at once.

import { THEME_INK } from '../config.js'
import { inkMask } from './ink.js'

const KEY = 'theme'
const root = document.documentElement
const system = matchMedia('(prefers-color-scheme: dark)')
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')

export const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : system.matches)

let current = null // the running transition, so an older one never clears a newer one's mask

// x, y: where the ink starts (viewport px). then: runs with the change, so the
// new state is complete when it is captured.
export function toggleTheme(x, y, then) {
  const next = isDark() ? 'light' : 'dark'
  const apply = () => {
    root.dataset.theme = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Storage blocked (private mode): the pick lasts for this visit only.
    }
    then?.()
  }
  if (!document.startViewTransition || reduceMotion.matches) return apply()

  // The mask finishes a little early, so the screen is covered before the transition ends.
  root.style.setProperty('--ink', inkMask(x, y, THEME_INK * 0.9))
  const transition = (current = document.startViewTransition(apply))
  // The transition lasts as long as its animations; this one only holds it open.
  transition.ready
    .then(() => root.animate({ opacity: [1, 1] }, { duration: THEME_INK, pseudoElement: '::view-transition-new(root)' }))
    .catch(() => {}) // skipped by a newer toggle
  transition.finished.finally(() => {
    if (current !== transition) return
    current = null
    root.style.removeProperty('--ink')
  })
}

// Calls fn when the system theme changes, so a toggle that follows it stays in sync.
export const onSystemTheme = (fn) => system.addEventListener('change', fn)
