// Container registry. A container is one file in `src/content/sections/<section>/containers/`, named after
// its id, that default-exports:
//   { id, props?, load?(ctx), render(box, ctx), <profile>?: { render } }
// `render` fills the box and may return a cleanup function. A profile key
// (portrait, tablet, landscape) swaps the content on that profile.
// Sections place containers by id; `/test/<id>` shows one full screen.

const files = import.meta.glob('./sections/*/containers/*.js')
const byId = new Map(Object.entries(files).map(([path, load]) => [path.split('/').pop().slice(0, -3), load]))

export const containerIds = () => [...byId.keys()]

export async function loadContainer(id) {
  const load = byId.get(id)
  if (!load) throw new Error(`no container "${id}" (expected a containers/${id}.js file under src/content/sections/*)`)
  const def = (await load()).default
  if (def?.id !== id) throw new Error(`${id}.js must export a container with id "${id}"`)
  return def
}

// Props and render for one profile: the container's, with the profile's swap on top.
export const renderFor = (def, profileName) => def[profileName]?.render ?? def.render
