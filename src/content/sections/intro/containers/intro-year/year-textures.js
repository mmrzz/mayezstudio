// The planets' textures, computed from noise, so the page ships no images. Plain functions of
// numbers (a palette in, pixel arrays out), so they run in workers (year-worker.js).
//
// Every texel is a point on a sphere (row 0 is the south pole, so the arrays upload as they are),
// and everything is sampled in 3D, so there are no seams at the date line or at the poles.
//
// The Earth gets its continents from fractal noise, with the sea level set so that 30% is land,
// then climate decides the colours: ice at the poles and on peaks, tundra and boreal forest at
// high latitudes, deserts in the subtropics, rainforest at the equator. The data map packs the
// height (for relief), the ocean mask (for the sun's glint) and the night-side city lights.
import { fbm3, seeded, smoothstep, mix } from './year-noise.js'

const PI = Math.PI

// The Earth's sea level and highest ground in this noise. The planet is the same every time, so
// they are found once (measureEarth, below) instead of sorting every texel on every visit. Run
// measureEarth(512) again if the continents' noise below ever changes.
const SEA = 0.0347
const PEAK = 0.9347

// The height of the land at a point on the unit sphere.
function landHeight(px, py, pz) {
  // a gentle warp, so coasts wind instead of following the noise's grid
  const wx = fbm3(px * 2.2 + 4.1, py * 2.2 + 8.3, pz * 2.2 + 1.7, 2)
  const wz = fbm3(px * 2.2 + 9.5, py * 2.2 + 2.4, pz * 2.2 + 6.1, 2)
  const c = fbm3(px * 0.85 + wx * 0.22 + 3.1, py * 0.85 + 1.7, pz * 0.85 + wz * 0.22 + 9.2, 5, 2.1, 0.47)
  const ridge = 1 - Math.abs(fbm3(px * 3.2 + 1.3, py * 3.2 + 7.7, pz * 3.2 + 2.9, 3))
  return c + 0.2 * ridge * ridge * smoothstep(0.0, 0.3, c)
}

// The 70th percentile of the land's height (the sea level that leaves 30% dry) and its maximum.
export function measureEarth(W = 512) {
  const H = W / 2
  const { cosLon, sinLon, lat } = sphere(W, H)
  const all = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const la = lat(y)
    const cl = Math.cos(la)
    const sl = Math.sin(la)
    for (let x = 0; x < W; x++) all[y * W + x] = landHeight(cl * cosLon[x], sl, cl * sinLon[x])
  }
  all.sort()
  return { sea: all[Math.floor(0.7 * all.length)], peak: all[all.length - 1] }
}

// The unit vector of every texel's column and row, so the loops stay cheap.
function sphere(W, H) {
  const cosLon = new Float32Array(W)
  const sinLon = new Float32Array(W)
  for (let x = 0; x < W; x++) {
    const lon = ((x + 0.5) / W) * 2 * PI
    cosLon[x] = Math.cos(lon)
    sinLon[x] = Math.sin(lon)
  }
  return { cosLon, sinLon, lat: (y) => ((y + 0.5) / H - 0.5) * PI }
}

// palette: { name: [r, g, b] } in sRGB, 0 to 1. W: the width (the height is half).
export function buildEarth(P, W) {
  const H = W / 2
  const { cosLon, sinLon, lat } = sphere(W, H)
  const day = new Uint8ClampedArray(W * H * 4)
  const data = new Uint8ClampedArray(W * H * 4)
  const col = [0, 0, 0]
  const set = (c) => {
    col[0] = c[0]
    col[1] = c[1]
    col[2] = c[2]
  }
  const blend = (c, t) => {
    col[0] += (c[0] - col[0]) * t
    col[1] += (c[1] - col[1]) * t
    col[2] += (c[2] - col[2]) * t
  }

  const land = [0, 0, 0]
  const ocean = [0, 0, 0]
  for (let y = 0; y < H; y++) {
    const la = lat(y)
    const cl = Math.cos(la)
    const sl = Math.sin(la)
    const polar = Math.abs(la) / (PI / 2) // 0 at the equator, 1 at a pole
    const subtropics = Math.exp(-(((polar * 90 - 26) / 13) ** 2))
    for (let x = 0; x < W; x++) {
      const px = cl * cosLon[x]
      const py = sl
      const pz = cl * sinLon[x]
      const h = landHeight(px, py, pz)
      // how much of this texel is land: soft across the coast, so it stays smooth where it is enlarged
      const dry = smoothstep(SEA - 0.012, SEA + 0.012, h)
      const e = h > SEA ? (h - SEA) / (PEAK - SEA) : 0 // elevation 0 to 1
      const temp = 1 - polar * 1.05 - 0.38 * e + 0.08 * fbm3(px * 2.7 + 11, py * 2.7 + 3, pz * 2.7 + 5, 2)
      let lights = 0
      let oceanMask = 0

      if (dry > 0) {
        const detail = 0.9 + 0.2 * (0.5 + 0.5 * fbm3(px * 22, py * 22, pz * 22, 2))
        const m = 0.5 + 0.5 * fbm3(px * 2.1 + 13.3, py * 2.1 + 5.5, pz * 2.1 + 0.7, 3) // moisture
        set(P.lush)
        blend(P.forest, smoothstep(0.62, 0.38, temp))
        blend(P.tropic, smoothstep(0.74, 0.9, temp) * smoothstep(0.45, 0.62, m))
        blend(P.dry, smoothstep(0.5, 0.32, m) * smoothstep(0.45, 0.75, temp) * 0.85)
        blend(P.desert, Math.min(1, smoothstep(0.45, 0.25, m) * subtropics + smoothstep(0.22, 0.1, m) * 0.6))
        blend(P.tundra, smoothstep(0.34, 0.22, temp))
        blend(P.rock, smoothstep(0.3, 0.65, e) * 0.85)
        const snow = Math.max(smoothstep(0.8, 0.97, e), smoothstep(0.2, 0.09, temp))
        blend(P.snow, snow)
        land[0] = col[0] * detail
        land[1] = col[1] * detail
        land[2] = col[2] * detail
        // city lights: small and clustered, mostly on low ground, none under the ice
        const pop = 0.5 + 0.5 * fbm3(px * 9 + 2.2, py * 9 + 9.1, pz * 9 + 4.4, 3)
        lights = smoothstep(0.66, 0.8, pop + 0.1 * smoothstep(0.35, 0, e) - 0.2 * e) * smoothstep(0.72, 0.45, polar) * (1 - snow) * dry
      }
      if (dry < 1) {
        const depth = Math.max(0, SEA - h)
        const ice = smoothstep(0.2, 0.08, temp) // sea ice
        set(P.ocean)
        blend(P.shelf, smoothstep(0.11, 0, depth) * 0.95)
        blend(P.oceanDeep, smoothstep(0.18, 0.75, depth))
        blend(P.snow, ice)
        const v = 0.97 + 0.06 * (0.5 + 0.5 * fbm3(px * 9, py * 9, pz * 9, 2))
        ocean[0] = col[0] * v
        ocean[1] = col[1] * v
        ocean[2] = col[2] * v
        oceanMask = (1 - ice) * (1 - dry)
      }
      const j = (y * W + x) * 4
      for (let k = 0; k < 3; k++) day[j + k] = (dry >= 1 ? land[k] : dry <= 0 ? ocean[k] : mix(ocean[k], land[k], dry)) * 255
      day[j + 3] = 255
      data[j] = 128 + 127 * Math.min(1, e * 1.3)
      data[j + 1] = oceanMask * 255
      data[j + 2] = lights * 255
      data[j + 3] = 255
    }
  }
  return { w: W, h: H, day, data }
}

export function buildClouds(W) {
  const H = W / 2
  const { cosLon, sinLon, lat } = sphere(W, H)
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    const la = lat(y)
    const cl = Math.cos(la)
    const sl = Math.sin(la)
    const deg = Math.abs(la) * (180 / PI)
    // more cloud on the equator's convergence zone and in the storm tracks, less over the subtropical highs
    const band = 0.16 * Math.exp(-((deg / 10) ** 2)) + 0.14 * Math.exp(-(((deg - 48) / 16) ** 2)) - 0.14 * Math.exp(-(((deg - 26) / 9) ** 2))
    for (let x = 0; x < W; x++) {
      const px = cl * cosLon[x]
      const py = sl
      const pz = cl * sinLon[x]
      const warp = 0.22 * fbm3(px * 2.4 + 3.3, py * 2.4 + 1.1, pz * 2.4 + 7.7, 2)
      const base = fbm3(px * 1.3 + warp, py * 3.6 + warp * 0.3, pz * 1.3 - warp, 4)
      const fine = 0.5 + 0.5 * fbm3(px * 9 + 5, py * 9, pz * 9 + 2, 2)
      const cover = smoothstep(0.06, 0.46, base + band) * (0.7 + 0.3 * fine)
      const j = (y * W + x) * 4
      data[j] = data[j + 1] = data[j + 2] = cover * 255
      data[j + 3] = 255
    }
  }
  return { w: W, h: H, data }
}

// The Moon: grey rock, dark maria mostly on the near side, and craters painted into the texels
// they cover: a bowl with a raised rim, big ones and many small.
export function buildMoon(P, W) {
  const H = W / 2
  const { cosLon, sinLon, lat } = sphere(W, H)
  const relief = new Float32Array(W * H)
  const rand = seeded(7)
  const craters = []
  for (let n = 0; n < 40; n++) craters.push(0.07 + 0.13 * rand() ** 2)
  for (let n = 0; n < 260; n++) craters.push(0.02 + 0.045 * rand() ** 2)
  for (const rho of craters) {
    const z = rand() * 2 - 1
    const lon = rand() * 2 * PI
    const r = Math.sqrt(1 - z * z)
    const [cx, cy, cz] = [r * Math.cos(lon), z, r * Math.sin(lon)]
    const la = Math.asin(z)
    const y0 = Math.max(0, Math.floor(((la - rho * 1.4) / PI + 0.5) * H))
    const y1 = Math.min(H - 1, Math.ceil(((la + rho * 1.4) / PI + 0.5) * H))
    for (let y = y0; y <= y1; y++) {
      const lay = lat(y)
      const cl = Math.cos(lay)
      const sl = Math.sin(lay)
      const span = Math.min(W / 2, Math.ceil(((rho * 1.4) / Math.max(cl, 0.05) / (2 * PI)) * W))
      const xc = Math.round(((lon / (2 * PI)) * W) % W)
      for (let dx = -span; dx <= span; dx++) {
        const x = (xc + dx + W) % W
        const dot = cl * cosLon[x] * cx + sl * cy + cl * sinLon[x] * cz
        const d = Math.acos(Math.min(1, dot)) / rho
        if (d > 1.4) continue
        const k = y * W + x
        if (d < 1) relief[k] -= (1 - d * d) * (0.5 + 4 * rho)
        relief[k] += 0.45 * Math.exp(-(((d - 1) / 0.16) ** 2))
      }
    }
  }
  const albedo = new Uint8ClampedArray(W * H * 4)
  const bump = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    const la = lat(y)
    const cl = Math.cos(la)
    const sl = Math.sin(la)
    for (let x = 0; x < W; x++) {
      const px = cl * cosLon[x]
      const py = sl
      const pz = cl * sinLon[x]
      const base = 0.5 + 0.5 * fbm3(px * 2.2 + 5, py * 2.2, pz * 2.2 + 1, 3)
      const maria = smoothstep(0.08, 0.3, fbm3(px * 1.3 + 2.4, py * 1.3, pz * 1.3 + 8, 2)) * smoothstep(-0.25, 0.55, px)
      const c = Math.max(-1, Math.min(1, relief[y * W + x]))
      const tone = (0.82 + 0.3 * base) * (1 + 0.14 * c)
      const t = Math.min(1, maria * 0.85)
      const j = (y * W + x) * 4
      for (let k = 0; k < 3; k++) albedo[j + k] = mix(P.moonLight[k], P.moonDark[k], t) * tone * 255
      albedo[j + 3] = 255
      bump[j] = bump[j + 1] = bump[j + 2] = 128 + 110 * c + 20 * (base - 0.5)
      bump[j + 3] = 255
    }
  }
  return { w: W, h: H, albedo, bump }
}
