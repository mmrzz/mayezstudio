// The logo's slash, copied from `#logo-slash` in index.html, reordered to begin at its
// bottom end (the same shape, never mirrored). The viewBox is the path's bounds.
import { Vector2 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

export const SLASH_PATH =
  'M351.91 147.083C348.92 154.976 344.511 158.044 336.167 158.044H325.35C317.006 158.044 314.925 154.976 317.915 147.083L370.901 7.22835C373.891 -0.664839 378.3 -3.7334 386.645 -3.7334H397.461C405.806 -3.7334 407.887 -0.664839 404.897 7.22835L351.91 147.083Z'
export const SLASH_VIEWBOX = '315 -4.5 94 163.5'

let raw
// The slash as a closed loop of 2D points (y up), `height` tall, centred on (cx, cy).
export function slashLoop(height, cx, cy) {
  const [vx, vy, vw, vh] = SLASH_VIEWBOX.split(' ').map(Number)
  if (!raw) {
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${SLASH_PATH}"/></svg>`)
    raw = SVGLoader.createShapes(data.paths[0])[0].getPoints(6)
  }
  const k = height / vh
  const pts = raw.map((p) => new Vector2((p.x - vx - vw / 2) * k + cx, -(p.y - vy - vh / 2) * k + cy))
  if (pts[0].distanceTo(pts.at(-1)) > 1e-6) pts.push(pts[0].clone())
  return pts
}
