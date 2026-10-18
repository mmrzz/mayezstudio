// Every tunable number lives here (D-002). Starting values, to be tuned by eye.

// Matched in order; the first media query that matches wins.
// `cols` x `rows` is the design grid, not counting the one reserved header row.
// Cells are small on purpose (about 40 to 60px) so containers can be placed precisely.
export const PROFILES = [
  { name: 'portrait', query: '(orientation: portrait)', cols: 12, rows: 18 },
  // Near-square landscape (8:5 or narrower): tablets held sideways, 4:3 and
  // 5:4 screens, narrow windows. On 16 x 7 they would get 2 to 5 empty rows.
  { name: 'tablet', query: '(orientation: landscape) and (max-aspect-ratio: 8/5)', cols: 24, rows: 16 },
  { name: 'landscape', query: 'all', cols: 32, rows: 14 },
]

// Cell size limits in CSS px.
export const CELL_MIN = 24
export const CELL_MAX = 80

// Containers float inside their grid cells (px): the margin between a box and the
// grid lines around it, its corner radius and its border width. Fill and border
// colour come from each container's own `look`.
export const BOX = { gap: 6, radius: 16, border: 2 }
// Once its edges are drawn, a box is drawn like a rectangle dragged out in a design tool: from
// its inline-start top corner (top right in RTL) to full size, over BOX_DRAW ms. Then its
// content fades in.
export const BOX_DRAW = 650 // ms
export const BOX_DRAW_EASE = [0.3, 0.7, 0.2, 1] // a quick drag that slows into place

// Resize is debounced by this many ms before the layout is recomputed.
export const RESIZE_DEBOUNCE = 150

// Loading draw: every line ends at LOAD_DRAW_TOTAL (ms); each starts at a seeded
// offset within LOAD_SPREAD. When content is ready before the draw is over, the rest of
// the draw is played out in LOAD_FINISH ms, but the draw never ends before LOAD_MIN, so it
// is always seen.
export const LOAD_DRAW_TOTAL = 2400
export const LOAD_SPREAD = 1300
export const LOAD_FINISH = 250
export const LOAD_MIN = 2000

// Scroll drawing, as fractions of a section's progress (0 to 1).
export const H_WINDOW = 0.3 // how long a horizontal line takes to draw
// Vertical lines draw like the loading grid: each starts at a seeded point in
// V_START and all finish together at p = 1, each with a seeded ease-in of power
// 1 to V_EASE. Their tip never passes the visible bottom.
export const V_START = [0.05, 0.6]
export const V_EASE = 1.8

// Drawn progress follows the scroll progress with this time constant (ms).
// Touch scrolls arrive in coarser steps, so phones use the longer value.
export const DRAW_SMOOTHING = 140
export const DRAW_SMOOTHING_TOUCH = 220

// The ready burst on the loading grid lasts this long (ms) before the grid rests.
// Input is unlocked when it starts; it plays on while the visitor scrolls.
export const BURST_DURATION = 1500

// Once the visitor has been past the loading screen and the first section is drawn,
// the loading screen shrinks to this share of its rows, so coming back to the top
// shows the logo without a screen of empty grid. The header forms over that height.
export const LOAD_RETURN_ROWS = 0.5

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
export const PEEK_FIRST = 2700 // ms after loading ends (the burst plays for the first BURST_DURATION)
export const PEEK_EVERY = 5000 // ms between peeks
export const PEEK_TIMES = 3 // after that only the hint stays

// Theme change: the new theme bleeds out from the toggle like ink in water.
export const THEME_INK = 1800 // ms

// Header island (plan §6). Formation windows are fractions of the first screen of scrolling.
export const FORM_LOGO = [0, 0.5] // the logo shrinks and rises into the island; its big outline fades
export const FORM_OUTLINE = [0.35, 0.6] // the island outline draws and its fill fades in
export const FORM_TITLES = [0.5, 0.7] // the section titles appear one by one
export const HEADER_IDLE_HIDE = 2500 // ms without scroll, hover or focus before the island hides
// Island height in rows. Taller than the header row: it is centred on the first
// two rows and covers part of the second while shown. The hover band stays one row.
export const ISLAND_ROWS = 1.5
export const ISLAND_MIN = 44 // px

// Jumping (plan §7): the slide-in of an undrawn target, and the eased scroll to a drawn one.
export const JUMP_SLIDE = 1400 // slow enough that the target's draw is seen
export const JUMP_DRAWN_BASE = 600
export const JUMP_DRAWN_PER_SCREEN = 150
export const JUMP_DRAWN_MAX = 1200

// Below this much free width on each side the island goes compact (logo + current title).
export const ISLAND_GUTTER = 12 // px

// Cubic-bezier eases (x1, y1, x2, y2) for Theatre keyframes and staggered parts (D-016).
export const CURVES = {
  linear: [0, 0, 1, 1],
  draw: [0.65, 0, 0.35, 1], // strokes: ease in and out, like the loading grid
  land: [0.16, 1, 0.3, 1], // text and fills: quick, long soft landing
  settle: [0.3, 1.5, 0.5, 1], // a small overshoot, then rest
  out: [0.25, 0.8, 0.35, 1],
  flight: [0.45, 0, 0.25, 1], // lifts off slowly, drops in quickly
  fall: [0.55, 0.085, 0.68, 0.53], // gravity: faster and faster
}

// Intro motion (plan/intro.md). Starting values, tuned by eye. Times in ms.
export const INTRO = {
  // Every card's timeline plays at this share of the speed its timings are written at (1 is as
  // written), so the motion is not missed. The idle loops after it are tuned on their own.
  pace: 0.75,
  motionDelay: 300, // after a box's reveal, once its fill is done

  paste: { scale: 1.04, settle: 300, hold: 350, fade: 200 },
  words: { rise: 350, stagger: 35 },

  // The claim (claim-timeline.js, D-016): ms from the start of its timeline. The text sets the
  // claim in two beats while an interface builds itself beside it, from idea to delivery (claim-ui.js).
  // A part's `stagger` is between its items (blocks, bars, rows...), `each` is how long one takes.
  claim: {
    caretOn: 150, caretOff: 2500, caretFade: 150,
    beat1: 350, word: 500, wordStagger: 60, // beat 1: «ایده از شما،»
    beat2: 1350, beat2Stagger: 120, // beat 2: «طراحی و ساخت از ما.»
    line: 3050, lineWord: 450, lineStagger: 100, lineRise: 0.3, // the supporting line, word by word; lineRise in em
    win: { at: 50, for: 550, fade: 300 }, // the empty window arrives
    // The idea: rough blocks appear, a little crooked, as the cursor places them...
    rough: { at: 550, stagger: 120, each: 350 },
    cursor: { at: 100, until: 1850, fadeIn: 200, outAt: 1550, fadeOut: 300 }, // the designer's cursor
    // ...then snap into the grid while the smart guides flash...
    snap: { at: 1500, stagger: 50, each: 500 },
    guides: { stagger: 60, in: 100, hold: 100, out: 300 }, // from the snap's start
    // ...and the content is built.
    build: { at: 2100, stagger: 60, each: 500 },
    nav: { at: 2250, stagger: 70, each: 400 },
    stats: { at: 2200, stagger: 100, each: 900 }, // the figures count up
    bars: { at: 2450, stagger: 60, each: 600, ink: 500, inkFor: 350 }, // violet while growing, then ink
    rows: { at: 2800, stagger: 120, each: 500 },
    sheen: { at: 3300, for: 800 }, // the finished build catches the light once
    toast: { at: 3550, for: 600, fade: 250, tickAt: 150, tickFor: 300, ringAt: 350, ringFor: 400 }, // «تحویل شد»; the tick draws, a violet ring fades
    // Behind the text (no room beside or below it): the window plays alone, steps back, then
    // the text is written over it, `text` ms later than beside it.
    behind: { dim: 1900, dimFor: 600, text: 2100, rest: 0.22 }, // rest: how faint the window stays
  },
  // Receipt 1 (systems-timeline.js, systems-art.js): a pixel man pushes a crate in, three more
  // drop onto it, he startles and then cheers; «۴» is pasted in and the caption follows.
  systems: {
    push: { at: 0, for: 1050, step: 120 }, // step: ms per walking frame
    back: { at: 1100, for: 260 }, // he steps back from the pile
    drop: { at: 1450, stagger: 300, each: 330 }, // the three crates fall, one after another
    land: { bump: 70, dust: 420, startle: 320 }, // after a crate lands: the screen bumps, dust rises; the first one startles him
    cheer: { at: 2500, for: 800 }, // he jumps for joy, twice
    sparkle: { at: 2500, for: 1000 }, // stars over the pile, then gone
    paste: 2850, caption: 150, // «۴» is pasted in; the caption's words follow
  },
  // Receipt 2 (year-timeline.js, year-art.js): one year as the Earth's single orbit round the Sun, in
  // a time-lapse. The turns are what happens in that year: the Moon really goes round 13.37 times;
  // a day would be 365 turns of the Earth, too fast to see, and the Sun turns 14.6 times, so those
  // two are slowed.
  year: {
    orbit: { at: 0, for: 4200 },
    spins: 12, moonOrbits: 13.37, sunTurns: 2,
    paste: 3600, caption: 150, // «۱ سال» is pasted in near the end of the orbit; the caption's words follow
    idle: 90, // then, while on screen, the years go on, slowly: seconds per year
  },
  // Receipt 3 (team-timeline.js, team-art.js): a ritual. The room darkens, a chalk circle draws
  // itself in violet and candles light; the teddy bear twitches, rips down the middle, and each
  // half grows back whole: one with red eyes, one with a halo. The room comes back, then «۲ نفر».
  team: {
    dark: { at: 0, for: 600 },
    circle: { at: 150, for: 1100, glowIn: 300 },
    candles: { at: 550, for: 700 }, // lit one after another
    uneasy: { at: 1300, for: 1000 }, // twitches; the head tilts too far and snaps back
    tear: { at: 2350, for: 420 }, // the crack runs down the seam
    part: { at: 2770, jolt: 90, wrench: 0.05, for: 1300 }, // wrenched apart (jolt), then pulled away while the goo stretches and snaps
    burst: 900, // the card shakes as it rips, from the part
    grow: { at: 4150, for: 950 }, // the lost halves grow back, in fits and starts
    ignite: { at: 5150, for: 500 }, // the evil one's eyes catch
    halo: { at: 5300, for: 600 }, // the angel's halo comes down
    lift: { at: 5800, for: 700 }, // candles out, the room comes back, the magic fades to chalk
    paste: 6300, caption: 150,
  },
}
