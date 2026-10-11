// The URL (plan §8): the current section is written to the hash with
// history.replaceState, so no back-button steps are added. At the top the hash
// is removed. Opening the site on a section link plays loading, then jumps there.

export function createUrl(sections, scroller) {
  const idOf = (i) => sections[i].def.id
  const indexOfHash = (hash) => sections.findIndex((s) => !s.def.clock && s.def.id === hash)

  const withHash = (hash) => location.pathname + location.search + (hash ? `#${hash}` : '')
  const setHash = (hash) => {
    if (location.hash !== (hash ? `#${hash}` : '')) history.replaceState(history.state, '', withHash(hash))
  }

  // A link to a section is kept while loading plays; an unknown hash is ignored and removed.
  let pending = null
  const initial = location.hash.slice(1)
  if (initial) {
    pending = indexOfHash(initial)
    if (pending < 0) {
      pending = null
      setHash('')
    }
  }

  let following = false
  let queued = 0
  function follow() {
    if (!following || queued) return
    queued = requestAnimationFrame(() => {
      queued = 0
      const current = scroller.current()
      setHash(current === 0 ? '' : idOf(current))
    })
  }
  addEventListener('scroll', follow, { passive: true })

  // Someone edited the hash by hand, or followed an in-page link.
  addEventListener('hashchange', () => {
    const hash = location.hash.slice(1)
    if (!hash) return
    const index = indexOfHash(hash)
    if (index < 0) return follow() // unknown: back to the current section's hash
    if (!following) pending = index // still loading: jump when it is done
    else if (index !== scroller.current()) scroller.jump(index)
  })

  return {
    // Called once loading is over and input is unlocked.
    async start() {
      if (pending !== null) await scroller.jump(pending)
      pending = null
      following = true
      follow()
    },
  }
}
