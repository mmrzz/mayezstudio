// Seeded 3D simplex noise (after Stefan Gustavson) and fractal sums over it, for the planets'
// procedural textures (year-textures.js). Plain functions of numbers, so they run in a worker.
// Sampling a sphere in 3D, rather than a flat map, keeps the textures free of seams and poles.

// A small seeded generator (mulberry32), so every visit gets the same planets.
export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const perm = new Uint8Array(512)
const permMod12 = new Uint8Array(512)
{
  const p = Array.from({ length: 256 }, (_, i) => i)
  const rand = seeded(0x9e3779b9)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]
    permMod12[i] = perm[i] % 12
  }
}
// The twelve edge directions of a cube
const G = new Int8Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1])
const F3 = 1 / 3
const G3 = 1 / 6

// About -1 to 1.
export function noise3(xin, yin, zin) {
  const s = (xin + yin + zin) * F3
  const i = Math.floor(xin + s)
  const j = Math.floor(yin + s)
  const k = Math.floor(zin + s)
  const t = (i + j + k) * G3
  const x0 = xin - (i - t)
  const y0 = yin - (j - t)
  const z0 = zin - (k - t)
  let i1, j1, k1, i2, j2, k2
  if (x0 >= y0) {
    if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0]
    else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1]
    else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1]
  } else if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1]
  else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1]
  else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0]
  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3
  const ii = i & 255
  const jj = j & 255
  const kk = k & 255
  let n = 0
  let c = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
  if (c > 0) {
    const g = permMod12[ii + perm[jj + perm[kk]]] * 3
    c *= c
    n += c * c * (G[g] * x0 + G[g + 1] * y0 + G[g + 2] * z0)
  }
  c = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
  if (c > 0) {
    const g = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3
    c *= c
    n += c * c * (G[g] * x1 + G[g + 1] * y1 + G[g + 2] * z1)
  }
  c = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
  if (c > 0) {
    const g = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3
    c *= c
    n += c * c * (G[g] * x2 + G[g + 1] * y2 + G[g + 2] * z2)
  }
  c = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
  if (c > 0) {
    const g = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3
    c *= c
    n += c * c * (G[g] * x3 + G[g + 1] * y3 + G[g + 2] * z3)
  }
  return 32 * n
}

// Fractal sum, normalised to about -1 to 1.
export function fbm3(x, y, z, octaves = 5, lacunarity = 2, gain = 0.5) {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq)
    norm += amp
    amp *= gain
    freq *= lacunarity
  }
  return sum / norm
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export const mix = (a, b, t) => a + (b - a) * t
