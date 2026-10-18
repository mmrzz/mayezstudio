// Screen size, profile and grid geometry (plan §1). Positions are never stored
// in pixels: items live on the profile's design grid, and this file turns that
// into whole screen cells and pixel edges for the current screen.

import { PROFILES, CELL_MIN, CELL_MAX, LOAD_RETURN_ROWS } from '../config.js'

export function pickProfile(matches = (query) => matchMedia(query).matches) {
  return PROFILES.find((p) => matches(p.query)) ?? PROFILES[PROFILES.length - 1]
}

// Measured 100lvh: the large viewport, so a section always fills the screen even
// after a phone's address bar hides. Stays put (unlike innerHeight / dvh), so a
// chrome show/hide never rebuilds the grid with undrawn lines beside drawn ones.
function measureLvh() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none'
  document.body.append(probe)
  const height = probe.offsetHeight
  probe.remove()
  return height || innerHeight
}

// clientWidth excludes the scrollbar, so no column ever sits under it.
export function measureScreen() {
  const root = document.documentElement
  return { width: root.clientWidth, height: measureLvh(), dpr: devicePixelRatio || 1, dir: root.dir }
}

// Pixel edges shared by lines and boxes, so they always line up.
function edges(count, size, dpr) {
  return Array.from({ length: count + 1 }, (_, i) => Math.round(i * size * dpr) / dpr)
}

// Pure: no DOM access, so it can be checked from anywhere.
export function computeGeometry(profile, { width, height, dpr = 1, dir = 'ltr' }) {
  const { cols: C, rows: R } = profile
  const t = Math.min(Math.max(Math.min(width / C, height / (R + 1)), CELL_MIN), CELL_MAX)
  const cols = Math.max(C, Math.round(width / t))
  const rows = Math.max(R + 1, Math.round(height / t))
  const cellW = width / cols
  const cellH = Math.max(height / rows, CELL_MIN)

  // The design grid is centred below the header row; the rest is spare cells.
  // The inline-start side gets floor(spare / 2), so in RTL the left side gets the rest.
  // colStart is the physical (left to right) index of the design grid's left column.
  const rtl = dir === 'rtl'
  const colStart = rtl ? cols - C - Math.floor((cols - C) / 2) : Math.floor((cols - C) / 2)
  const rowStart = 1 + Math.floor((rows - 1 - R) / 2)

  return {
    profile: profile.name,
    rtl,
    design: { cols: C, rows: R },
    width,
    height,
    sectionHeight: cellH * rows, // taller than the screen only when the cell floor applies
    cols,
    rows,
    cellW,
    cellH,
    colStart,
    rowStart,
    x: edges(cols, cellW, dpr),
    y: edges(rows, cellH, dpr),
  }
}

// The loading screen's height once the visitor has been past it: whole rows, so its grid
// still ends on a line.
export function returnHeight(geo) {
  return geo.y[Math.max(1, Math.round(geo.rows * LOAD_RETURN_ROWS))]
}

// Physical (left to right, 0-based) index of the column where a design item starts.
// Design column 1 is the inline-start edge: the right edge in RTL.
export function physCol(geo, col, cols) {
  return geo.rtl ? geo.colStart + geo.design.cols - col - cols + 1 : geo.colStart + col - 1
}

// Rectangle of a 1-based design-grid item, in section pixels.
export function itemRect(geo, { col, row, cols, rows }) {
  const c0 = physCol(geo, col, cols)
  const r0 = geo.rowStart + row - 1
  const x = geo.x[c0]
  const y = geo.y[r0]
  return { x, y, width: geo.x[c0 + cols] - x, height: geo.y[r0 + rows] - y }
}
