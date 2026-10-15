// Pixel-art sprites as SVG. A sprite is composed on a grid of colour keys, given a one-pixel
// outline, and turned into paths, one per key. The keys are CSS classes (`px-<key>`), coloured
// from tokens in the stylesheet, so a sprite follows the theme and needs no canvas or image.
// The svg that holds sprites is drawn crisp (shape-rendering: crispEdges) at a whole-number
// scale, so every game pixel is the same size.

// A repeatable pseudo-random number from a position, 0 to 1: texture that stays the same every time.
export const noise = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export function createGrid(w, h) {
  const cells = Array.from({ length: h }, () => Array(w).fill(null))
  const api = {
    w,
    h,
    cells,
    px(x, y, key) {
      if (x >= 0 && x < w && y >= 0 && y < h) cells[y][x] = key
      return api
    },
    // Inclusive corners.
    rect(x0, y0, x1, y1, key) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) api.px(x, y, key)
      return api
    },
    // A filled disc; `key` is a key or a function (x, y) => key for shading it.
    circle(cx, cy, r, key) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) api.px(x, y, typeof key === 'function' ? key(x, y) : key)
        }
      }
      return api
    },
    // A one-pixel ring around everything drawn so far, in `key`.
    outline(key = 'o') {
      const add = []
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (cells[y][x]) continue
          if (cells[y - 1]?.[x] || cells[y + 1]?.[x] || cells[y][x - 1] || cells[y][x + 1]) add.push([x, y])
        }
      }
      for (const [x, y] of add) cells[y][x] = key
      return api
    },
  }
  return api
}

// The grid as `<path class="px-key" d="..."/>` markup: runs of one key along a row are one rect.
export function paths(grid) {
  const byKey = new Map()
  grid.cells.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row[x]
      if (!key) {
        x++
        continue
      }
      let end = x
      while (row[end + 1] === key) end++
      const len = end - x + 1
      byKey.set(key, `${byKey.get(key) ?? ''}M${x} ${y}h${len}v1h-${len}z`)
      x = end + 1
    }
  })
  return [...byKey].map(([key, d]) => `<path class="px-${key}" d="${d}"/>`).join('')
}
