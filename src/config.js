// Every tunable number lives here (D-002). Starting values, to be tuned by eye.

// Matched in order; the first media query that matches wins.
// `cols` x `rows` is the design grid, not counting the one reserved header row.
export const PROFILES = [
  { name: 'portrait', query: '(orientation: portrait)', cols: 6, rows: 9 },
  // Near-square landscape (8:5 or narrower): tablets held sideways, 4:3 and
  // 5:4 screens, narrow windows. On 16 x 7 they would get 2 to 5 empty rows.
  { name: 'tablet', query: '(orientation: landscape) and (max-aspect-ratio: 8/5)', cols: 12, rows: 8 },
  { name: 'landscape', query: 'all', cols: 16, rows: 7 },
]

// Cell size limits in CSS px.
export const CELL_MIN = 48
export const CELL_MAX = 160

// Resize is debounced by this many ms before the layout is recomputed.
export const RESIZE_DEBOUNCE = 150

// Loading draw: every line ends at LOAD_DRAW_TOTAL (ms); each starts at a seeded
// offset within LOAD_SPREAD. TEST values (production: 1400 / 800).
export const LOAD_DRAW_TOTAL = 5000
export const LOAD_SPREAD = 3000

// Scroll drawing, as fractions of a section's progress (0 to 1).
export const H_WINDOW = 0.3 // how long a horizontal line takes to draw
// Vertical lines draw like the loading grid: each starts at a seeded point in
// V_START and all finish together at p = 1, each with a seeded ease-in of power
// 1 to V_EASE. Their tip never passes the visible bottom.
export const V_START = [0.05, 0.6]
export const V_EASE = 1.8

// Drawn progress follows the scroll progress with this time constant (ms).
export const DRAW_SMOOTHING = 120

// The ready burst on the loading grid lasts this long (ms) before the grid rests.
export const BURST_DURATION = 1500

// Snapping only finishes a draw (D-005): once you are this far past a section
// boundary (fraction of a screen), glide the rest of the way to the next section
// if it is not drawn yet. Drawn sections scroll freely. Never pulls back.
// The glide is slow (so the draw is seen) and scales with the distance left, so
// a late snap, past the half point of the section, is short and soft.
export const SNAP_COMMIT = 0.25
export const SNAP_GLIDE_PER_SCREEN = 1800 // ms for a whole screen
export const SNAP_GLIDE_MIN = 700 // ms
// Where `scrollend` is unsupported, scrolling counts as stopped after this many ms of silence.
export const SCROLL_STOP_FALLBACK = 150

// The scroll hint fades over this fraction of the first screen of scrolling.
export const HINT_FADE = 0.2
// Until the visitor scrolls, the loading screen peeks to preview the scroll: the
// page dips PEEK_DISTANCE of a screen and back, then once more, smaller. The
// first input stops it for good.
export const PEEK_DISTANCE = 0.12
export const PEEK_DURATION = 1600 // ms, both dips
export const PEEK_FIRST = 1200 // ms after loading ends
export const PEEK_EVERY = 5000 // ms between peeks
export const PEEK_TIMES = 3 // after that only the hint stays

// Theme change: the new theme bleeds out from the toggle like ink in water.
export const THEME_INK = 1800 // ms

// Header island (plan §6). Formation windows are fractions of the first screen of scrolling.
export const FORM_LOGO = [0, 0.5] // the logo shrinks and rises into the island; its big outline fades
export const FORM_OUTLINE = [0.35, 0.6] // the island outline draws and its fill fades in
export const FORM_TITLES = [0.5, 0.7] // the section titles appear one by one
export const HEADER_IDLE_HIDE = 2500 // ms without scroll, hover or focus before the island hides
export const ISLAND_ROWS = 0.6 // island height in rows
export const ISLAND_MIN = 44 // px

// Jumping (plan §7): the slide-in of an undrawn target, and the eased scroll to a drawn one.
export const JUMP_SLIDE = 1400 // slow enough that the target's draw is seen
export const JUMP_DRAWN_BASE = 600
export const JUMP_DRAWN_PER_SCREEN = 150
export const JUMP_DRAWN_MAX = 1200

// Below this much free width on each side the island goes compact (logo + current title).
export const ISLAND_GUTTER = 12 // px
