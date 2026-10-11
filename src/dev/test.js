// The test route, `/test/<container id>`: one container fills the whole screen
// for checking a design. It gets the same context as on the page (profile, grid
// size in cells, props) from its placement in a section, so what you see is what
// the page renders, only larger. `?profile=portrait|tablet|landscape` forces a
// profile; without it the screen's own is used.

import { PROFILES } from '../config.js'
import { pickProfile } from '../core/layout.js'
import { loadContainer, renderFor, containerIds } from '../content/containers.js'
import sections from '../content/sections.js'

export async function mountTest(id) {
  document.querySelector('.chrome')?.remove()
  document.querySelector('.page')?.remove()
  document.querySelector('.scroll-hint')?.remove()
  document.title = `test · ${id}`

  const root = document.createElement('main')
  root.className = 'box test-box' // the page's box styles, so containers see the same container context
  root.dataset.state = 'ready'
  document.body.append(root)

  const asked = new URLSearchParams(location.search).get('profile')
  const profile = PROFILES.find((p) => p.name === asked) ?? pickProfile()

  try {
    const def = await loadContainer(id)
    const item = sections.flatMap((s) => s.items).find((i) => i.container === id)
    const place = item?.[profile.name]
    // Not placed (or hidden on this profile): fall back to the design grid's size.
    const size = place ?? { cols: profile.cols, rows: profile.rows }
    const ctx = { profile: profile.name, cols: size.cols, rows: size.rows, props: { ...def.props, ...item?.props, ...place?.props } }
    await def.load?.(ctx)
    renderFor(def, profile.name)(root, ctx)
  } catch (err) {
    console.error('[test]', err)
    root.textContent = `${err.message}\nContainers: ${containerIds().join(', ')}`
  }
}
