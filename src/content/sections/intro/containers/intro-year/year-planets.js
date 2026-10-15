// The orrery's colours (the `--sp-*` tokens, resolved) and its planets' textures, built in three
// workers at once so the page is not held up: the Earth, its clouds and the Moon. Where workers
// are not available the same functions run here, one after the other.
import { buildEarth, buildClouds, buildMoon } from './year-textures.js'

export const SIZES = { earth: 512, clouds: 512, moon: 256 }

// A token as [r, g, b] in sRGB, 0 to 1. The browser resolves the token, a canvas reads it back.
export function readToken(name, el = document.documentElement) {
  const probe = document.createElement('i')
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(--sp-${name})`
  el.append(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  const ctx = readToken.ctx ?? (readToken.ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true }))
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = resolved
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0] / 255, d[1] / 255, d[2] / 255]
}

// Every colour the orrery uses, by the names the code uses.
export function readSpace(el) {
  const names = {
    void: 'void',
    text: 'text',
    oceanDeep: 'ocean-deep',
    ocean: 'ocean',
    shelf: 'shelf',
    tropic: 'tropic',
    lush: 'lush',
    forest: 'forest',
    dry: 'dry',
    desert: 'desert',
    rock: 'rock',
    tundra: 'tundra',
    snow: 'snow',
    cloud: 'cloud',
    lights: 'lights',
    air: 'air',
    dusk: 'dusk',
    sunCore: 'sun-core',
    sunMid: 'sun-mid',
    sunRim: 'sun-rim',
    corona: 'corona',
    moonLight: 'moon-light',
    moonDark: 'moon-dark',
    starCool: 'star-cool',
    starWarm: 'star-warm',
  }
  return Object.fromEntries(Object.entries(names).map(([key, token]) => [key, readToken(token, el)]))
}

const work = (part, palette, size) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./year-worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      resolve(e.data)
      worker.terminate()
    }
    worker.onerror = (e) => {
      reject(e)
      worker.terminate()
    }
    worker.postMessage({ part, palette, size })
  })

const here = {
  earth: (palette, size) => buildEarth(palette, size),
  clouds: (palette, size) => buildClouds(size),
  moon: (palette, size) => buildMoon(palette, size),
}

let planets // one build per page load

export function loadPlanets(space) {
  planets ??= (async () => {
    const parts = ['earth', 'clouds', 'moon']
    let results
    try {
      results = await Promise.all(parts.map((part) => work(part, space, SIZES[part])))
    } catch (err) {
      console.warn('[intro-year] no workers; building the planets here', err)
      results = parts.map((part) => here[part](space, SIZES[part]))
    }
    return Object.fromEntries(parts.map((part, i) => [part, results[i]]))
  })()
  return planets
}
