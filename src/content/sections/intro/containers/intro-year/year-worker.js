// Builds one planet texture off the main thread (year-planets.js starts three of these at once).
import { buildEarth, buildClouds, buildMoon } from './year-textures.js'

self.onmessage = ({ data: { part, palette, size } }) => {
  const result = part === 'earth' ? buildEarth(palette, size) : part === 'clouds' ? buildClouds(size) : buildMoon(palette, size)
  self.postMessage(result, Object.values(result).filter(ArrayBuffer.isView).map((view) => view.buffer))
}
