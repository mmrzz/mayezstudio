// Container registry. A container lives in `src/content/sections/<section>/containers/<id>/`,
// with its entry file named after its id (`<id>/<id>.js`). Helpers for that container sit beside
// it in the same folder. A section's shared helpers stay outside `containers/`. The entry
// default-exports:
//   { id, props?, look?, load?(ctx), render(box, ctx), <profile>?: { render } }
// `render` fills the box and may return a cleanup function. A profile key
// (portrait, tablet, landscape) swaps the content on that profile.
// `look` is the container's own colours, tokens only: { fill, edge } as `var(--token)`
// values (palette tokens `--tone-*` live in style.css). Without one the box is plain surface.
// Sections place containers by id; `/test/<id>` shows one full screen.

import { BOX } from '../config.js'

// Only the entry file whose name matches its folder: containers/intro-claim/intro-claim.js, not
// its helpers (claim-ui.js, …).
const files = import.meta.glob('./sections/*/containers/*/*.js')
const byId = new Map()
for (const [path, load] of Object.entries(files)) {
  const parts = path.split('/')
  const file = parts.at(-1).slice(0, -3)
  if (file === parts.at(-2)) byId.set(file, load)
}

export const containerIds = () => [...byId.keys()]

export async function loadContainer(id) {
  const load = byId.get(id)
  if (!load) throw new Error(`no container "${id}" (expected containers/${id}/${id}.js under src/content/sections/*)`)
  const def = (await load()).default
  if (def?.id !== id) throw new Error(`${id}.js must export a container with id "${id}"`)
  return def
}

// Props and render for one profile: the container's, with the profile's swap on top.
export const renderFor = (def, profileName) => def[profileName]?.render ?? def.render

// Puts a container's look and the shared box shape (config BOX) on its box.
export function applyLook(el, def) {
  const { fill = 'var(--surface)', edge = 'var(--border)' } = def.look ?? {}
  el.style.setProperty('--box-fill', fill)
  el.style.setProperty('--box-edge', edge)
  el.style.setProperty('--box-radius', `${BOX.radius}px`)
  el.style.setProperty('--box-border', `${BOX.border}px`)
}
