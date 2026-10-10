// Page grid: drawn line by line on load, then kept as the backdrop of every section.
//
// States (data-state on the root):
//   loading  lines are drawing in, one at a time
//   waiting  drawing finished but content is not ready yet; accent shimmers
//   filled   drawing finished and content is ready; grid rests as backdrop
//
// Drawing is never cut short. When it ends we go to `filled` if content is
// ready, otherwise to `waiting` until setReady() is called.

// Target cell size per viewport width. The real cell is width / cols so that
// columns always divide the screen exactly; rows then run to the bottom edge.
const CELL_TARGETS = [
  { minWidth: 1600, size: 120 },
  { minWidth: 1024, size: 96 },
  { minWidth: 640, size: 80 },
  { minWidth: 0, size: 64 },
]
const MIN_COLS = 4

// Every line ends at DRAW_TOTAL (ms). Each line starts at a random offset within
// START_SPREAD, so early starters draw slowly and late ones quickly, all finishing together.
// TEST values (production: 1400 / 800).
const DRAW_TOTAL = 5000
const START_SPREAD = 3000

export function measureGrid(width, height) {
  const { size } = CELL_TARGETS.find((t) => width >= t.minWidth)
  const cols = Math.max(MIN_COLS, Math.round(width / size))
  const cell = width / cols
  const rows = Math.ceil(height / cell)
  return { cols, rows, cell }
}

export function createGrid(root) {
  let ready = false
  let drawn = false
  let size = { cols: 0, rows: 0 }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')

  function setState(state) {
    root.dataset.state = state
  }

  function settle() {
    drawn = true
    setState(ready ? 'filled' : 'waiting')
  }

  function build() {
    const { cols, rows, cell } = measureGrid(innerWidth, innerHeight)
    if (cols === size.cols && rows === size.rows && cell === size.cell) return
    size = { cols, rows, cell }

    root.style.setProperty('--cell', `${cell}px`)
    root.style.setProperty('--span', `${innerWidth + innerHeight}px`)

    // Interior lines only; the screen edges are the outer border.
    const lines = []
    for (let i = 1; i < Math.max(cols, rows); i++) {
      if (i < rows) lines.push(['h', i])
      if (i < cols) lines.push(['v', i])
    }

    root.replaceChildren(
      ...lines.map(([axis, index]) => {
        const line = document.createElement('i')
        line.className = `grid-line grid-line--${axis}`
        line.style.setProperty('--index', index)
        const delay = Math.round(Math.random() * START_SPREAD)
        line.style.setProperty('--delay', `${delay}ms`)
        line.style.setProperty('--duration', `${DRAW_TOTAL - delay}ms`)
        return line
      }),
    )
    return lines.length
  }

  function start() {
    const count = build()
    setState('loading')
    if (reduceMotion.matches || !count) return settle()
    root.lastElementChild.addEventListener('animationend', settle, { once: true })
  }

  addEventListener('resize', () => {
    // Rebuild only the geometry; a finished grid must not redraw.
    if (!drawn) return
    build()
    root.dataset.state = ready ? 'filled' : 'waiting'
  })

  start()

  return {
    get state() {
      return root.dataset.state
    },
    setReady() {
      ready = true
      if (drawn) setState('filled')
    },
  }
}
