// Dev overlay, enabled with ?grid (plan §1). Shows the screen grid in every
// section with column and row numbers, marks the header row and the spare cells,
// and prints the numbers the layout came up with. Colours come from tokens only.

import { RESIZE_DEBOUNCE } from '../config.js'
import { pickProfile, measureScreen, computeGeometry } from '../core/layout.js'

export function mountGridOverlay(sections = []) {
  const info = document.createElement('pre')
  info.className = 'grid-debug-info'
  document.body.append(info)

  let timer

  function cells(geo) {
    const { cols, rows, colStart, rowStart, design } = geo
    const out = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const header = r === 0
        const inDesign = c >= colStart && c < colStart + design.cols && r >= rowStart && r < rowStart + design.rows
        const cell = document.createElement('div')
        cell.className = 'grid-debug-cell'
        if (header) cell.dataset.kind = 'header'
        else if (!inDesign) cell.dataset.kind = 'spare'
        cell.style.cssText = `left:${geo.x[c]}px;top:${geo.y[r]}px;width:${geo.x[c + 1] - geo.x[c]}px;height:${geo.y[r + 1] - geo.y[r]}px`
        // Design-grid numbers are 1-based, as items use them, and count from the start edge.
        if (inDesign) cell.textContent = `${geo.rtl ? colStart + design.cols - c : c - colStart + 1},${r - rowStart + 1}`
        out.push(cell)
      }
    }
    return out
  }

  function render() {
    const geo = computeGeometry(pickProfile(), measureScreen())
    // One overlay per section; it stays in the section across rebuilds.
    for (const s of sections) {
      let root = s.el.querySelector(':scope > .grid-debug')
      if (!root) {
        root = document.createElement('div')
        root.className = 'grid-debug'
        root.setAttribute('aria-hidden', 'true')
        s.el.append(root)
      }
      root.replaceChildren(...cells(geo))
    }

    info.textContent = [
      `${geo.profile}  ${geo.width}x${geo.height}  ${geo.rtl ? 'rtl' : 'ltr'}`,
      `screen grid ${geo.cols}x${geo.rows}  (design ${geo.design.cols}x${geo.design.rows})`,
      `cell ${geo.cellW.toFixed(1)}x${geo.cellH.toFixed(1)}`,
      `section height ${geo.sectionHeight.toFixed(0)}`,
      `design starts at screen col ${geo.colStart} (from the left), row ${geo.rowStart}`,
    ].join('\n')
  }

  // Live progress and drawn state of every section.
  const status = document.createElement('pre')
  status.className = 'grid-debug-info grid-debug-status'
  document.body.append(status)
  setInterval(() => {
    status.textContent = sections
      .map((s) => `${s.def.id.padEnd(8)} ${s.def.clock ? '  clock' : s.progress.toFixed(2).padStart(6)} ${s.drawn ? 'drawn' : ''}`)
      .join('\n')
  }, 100)

  addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(render, RESIZE_DEBOUNCE)
  })
  render()
}
