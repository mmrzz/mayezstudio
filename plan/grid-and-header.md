# Plan: grid, sections and header island

Date: 2026-10-10 · Status: ready to build · Decisions: D-002, D-003, D-004 in `decisions.md`

## Goal

- The page is a stack of full-screen sections. The first is the loading screen, which draws its grid on a timer.
- Every other section draws its grid as it scrolls in. When an item's edges are drawn, its box fills and its content shows. Each section draws once.
- A floating header island (logo + section titles) forms from the loading logo during the first scroll and is used to jump between sections.
- Three mock sections with coloured empty boxes exercise all of it.

## What changes from the current code

| Now | Problem | Plan |
|---|---|---|
| Columns from width breakpoints, `rows = ceil(height / cell)` | 6–29 columns and 7–13 rows depending on the screen, so stored positions can't work; the bottom row is cut off | Fixed design grid per profile, whole cells (§1) |
| One `position: fixed` grid layer | Can't hold several sections | One grid per section, scrolling with it (§3) |
| Size from `innerWidth` | Includes the scrollbar once the page scrolls | `clientWidth` |
| Size from `innerHeight` | Changes on phones when the address bar hides | A measured `100svh` |
| Resize ignored while loading | Grid can be wrong after loading | Rebuild on every resize, keep states (§9) |
| Fractional line positions | Blurry lines; boxes can sit 1px off | Pixel-rounded edges shared by lines and boxes |
| CSS keyframes on a clock | Can't follow scroll | One engine drawn to a progress value (§3) |
| Loading styles target every `.grid` | Would hit every section | Scoped to the loading section |
| Shimmer and burst assume one square `--cell` | Cells are only near-square now | Per-line pixel positions, separate cell width and height |

## 1. Grid and layout

### Profiles

Defined in `src/config.js` and matched in order with media queries; the first match wins.

| Profile | Media query | Design grid | Screen rows incl. header |
|---|---|---|---|
| portrait | `(orientation: portrait)` | 6 × 9 | 10 |
| landscape | anything else | 16 × 7 | 8 |

Adding a profile (e.g. tablet) means one entry here plus a layout for it in each item.

### Fitting the grid to a screen

W = `clientWidth`, H = measured `100svh`, C × R = the profile's design grid. Every section has one header row on top.

1. Target cell `t = min(W / C, H / (R + 1))`, clamped to 48–160px.
2. `cols = max(C, round(W / t))`, `rows = max(R + 1, round(H / t))`.
3. `cellW = W / cols`, `cellH = max(H / rows, 48)`. Cells come out within a few % of square and divide the screen exactly. Only when the 48px floor applies (phone held sideways) is a section `rows × 48` tall, a bit taller than the screen.
4. Screen row 0 is the header row in every section.
5. The design grid is centred in the rest: it starts at screen column `floor((cols − C) / 2)` and screen row `1 + floor((rows − 1 − R) / 2)` (counting from 0). Spare cells around it are plain grid.
6. Pixel edges: `x[i] = round(i × cellW × dpr) / dpr`, same for y. Lines and boxes are both placed from these arrays, so they always line up.

| Window | Profile | Screen grid | Cell | Spare |
|---|---|---|---|---|
| 1920×960 | landscape | 16×8 | 120×120 | – |
| 1536×730 | landscape | 17×8 | 90×91 | 1 column |
| 1440×790 | landscape | 16×9 | 90×88 | 1 row |
| 1024×700 | landscape | 16×11 | 64×64 | 3 rows |
| 3440×1300 | landscape | 22×8 | 156×163 | 6 columns |
| 820×1050 | portrait | 8×10 | 103×105 | 2 columns |
| 412×780 | portrait | 6×11 | 69×71 | 1 row |
| 390×664 | portrait | 6×10 | 65×66 | – |
| 844×340 | landscape | 18×8 | 47×48 | 2 columns, section 384px tall |

### Section files

Each section has a definition file `src/<name>.js` and a folder `src/<name>/` with its content creators.

```js
// src/about.js
export default {
  id: 'about',     // also the URL hash: /#about
  title: 'About',  // menu label
  items: [
    {
      id: 'intro',
      content: () => import('./about/box.js'),
      props: { tone: 1 },
      landscape: { col: 1, row: 2, cols: 7, rows: 4 },
      portrait: { col: 1, row: 1, cols: 6, rows: 3, content: () => import('./about/box-small.js') },
    },
    {
      id: 'note',
      content: () => import('./about/box.js'),
      props: { tone: 4 },
      landscape: { col: 13, row: 5, cols: 4, rows: 2 },
      portrait: null, // hidden on portrait on purpose
    },
  ],
}
```

- Positions are 1-based design-grid cells. Row 1 is the first row under the header, so an item can't land in the header row.
- A profile entry can override `content` and `props`.
- `null` hides the item on that profile on purpose. A missing profile is a dev warning.
- `id` is also the URL hash; `title` is the menu label.

### Content creators

```js
// src/<name>/<creator>.js
export async function load(ctx) {}          // optional: fetch what must be ready before the reveal
export default function render(box, ctx) {} // build the content inside box; may return a cleanup function
```

- `ctx` is `{ profile, cols, rows, props }`.
- `render` runs as soon as the content is loaded, while the box is still hidden; filling the box only reveals it.
- If the profile changes, the cleanup runs and the new profile's content renders.
- Boxes are CSS size containers. Content sizes itself to its box (container query units, text relative to the cell with a minimum and a maximum). `overflow: hidden` is a guard.

### Dev checks and overlay

- Warnings: item outside the design grid, overlapping items, missing profile layout, content overflowing its box.
- `?grid` shows column and row numbers, marks the header row and spare cells, and lists each section's progress and drawn state.

## 2. Page structure and files

```
src/
  main.js        startup: build the page, run loading, start scroll and header
  config.js      profiles, cell limits, every timing (§11)
  layout.js      screen size, profile, grid geometry, box rectangles
  grid.js        one section's lines, drawn up to a progress value
  section.js     one section: grid, boxes, loading and revealing content
  scroll.js      progress, drawn tracking, snapping, jumps, input lock, URL
  header.js      the island: formation, show/hide, links
  sections.js    page order: [loading, about, work, contact]
  loading.js     loading section (the logo stays inline in index.html)
  about.js       about/box.js, about/box-small.js
  work.js        work/box.js
  contact.js     contact/box.js
  style.css
```

`index.html`:

```html
<div class="chrome">  <!-- fixed; the only thing above the grid -->
  …logo SVG…
  <nav class="island">…</nav>
</div>
<main class="page">
  <section class="section" data-section="loading">…</section>
  <!-- the other sections are built from sections.js -->
</main>
```

- Sections are marked with `data-section`, never an `id` equal to the hash, so the browser can't jump to them by itself before loading finishes.
- Each section gets `tabindex="-1"` and an `aria-label` from its title, so focus can move to it after a jump.

## 3. Section drawing

### Engine

- `grid.js` builds a section's lines and draws them to a progress value `p` (0–1). Each line has a start/end window inside `p` and sets its own `--p` (drawn length) and `--glow` (tip) from it. The current line look (accent trail, glowing tip) stays.
- Two drivers:
  - Loading: a clock. Each line gets a random start within the spread and all finish together, as now.
  - Other sections: scroll.

### Progress

- `p = (bottom of the visible screen − section top) / section height`, clamped to 0–1: 0 when the top enters at the bottom of the screen, 1 when the section fills the screen.
- During a jump, the section's shifted position is used (§7).

### Scroll schedule (top-down, never off-screen)

- A horizontal line starts drawing when it comes into view and finishes within a set window, at the latest by `p = 1`.
- Vertical lines grow downward, lagging `p`, with the tip just above the bottom of the screen; they reach the end at `p = 1`.
- A small per-line jitter keeps it hand-drawn. It's seeded, so a rebuild draws the same pattern.

### Smoothing and draw once

- The drawn progress follows the scroll progress with a short delay. Wheel steps are smoothed, and the last rows finish smoothly after scrolling stops.
- The drawn progress never goes down. Each section keeps `progress` and `drawn` (true at 1). Drawn sections are skipped by the scroll loop.
- Drawn sections always run unbroken from the top: scrolling draws them in order, and jumps mark the skipped ones drawn. At most one partly drawn section follows them.

### Which lines a section draws

- Its top line and its interior lines. The loading section has no top line.
- Counted as already drawn: the screen's left and right edges and the section's bottom edge (that line belongs to the next section).

### Items

States: `empty` → `filled` → `ready`.

- An item is complete when its four edges are drawn along their full length, checked on every progress update.
- Filled: the box (from the pixel edges, inset 1px so its outline lines stay visible) fills with `--surface` and covers the lines inside it.
- Ready: the content fades in. If it isn't loaded yet, the box shows the waiting shimmer until it is.
- Until revealed, the box's content is `inert` (hidden from screen readers and the keyboard).
- Sections marked drawn by a jump show their boxes filled and ready straight away, without animation.

### Loading content ahead

- Loaded ahead: the section after the current one, and a jump target as soon as the jump starts. Loading means importing the creator, running `load()`, then `render()` into the hidden box.
- The fill only reveals what is already there.

## 4. Snapping

Only finishes a draw (D-005); never pulls back.

- When scrolling stops (`scrollend`, or 150ms without scroll events where it's unsupported; never while a finger is still down):
  - exactly on a section: nothing;
  - the section ahead is already drawn: nothing, scrolling is free;
  - at least 25% of a screen past the section boundary behind you, in the direction you were scrolling: glide the rest of the way to the next (undrawn) section;
  - otherwise: stay.
- The glide is slow so the draw is seen, and scales with the distance left (1800ms per screen, at least 700ms). Past the half point of the section it is only a short, soft settle (ease-out instead of ease-in-out).
- Our own glide, no CSS scroll-snap. Any user input cancels it.
- Off during loading and jumps. No snapping inside a section taller than the screen (phone held sideways).

## 5. Loading section

- Draws on the clock as now: lines draw, shimmer if content is late, burst when ready.
- Ready = fonts + window load + section 1's content loaded. The dev `?delay=ms` stays.
- Input is locked until the burst ends: wheel, touch and scroll keys are blocked, and any other scroll (e.g. dragging the scrollbar) is reset. No `overflow: hidden`, which would make the scrollbar appear and disappear and change the grid width.
- `history.scrollRestoration = 'manual'`: the page always starts at the top.
- A scroll hint appears once loading is done and fades over the first 20% of scrolling; back at the top it returns.
- If the URL has a section hash, loading plays and then jumps there (§7).

## 6. Header island

### Layer

`.chrome` is fixed over the whole screen, with pointer events only on its children. It holds the logo and the island and is the only thing above the grid. The logo is in it from the start (inline SVG, visible before JS runs), at its current hero size, `min(86vw, 760px)`, centred.

### Formation

Follows the scroll position over the first screen in both directions (smoothed, not draw-once). `f` = scroll / screen height.

| f | What happens |
|---|---|
| 0 → 0.5 | the logo shrinks and rises from the hero spot into the island's logo slot; its big outline fades |
| 0.35 → 0.6 | the island outline draws around it (line + glowing tip, like the grid) and its fill fades in |
| 0.5 → 0.7 | the section titles appear one by one |
| 0.7 → 1 | formed and at the top; section 1 keeps drawing underneath |

Scrolling back up reverses it: at the top the hero logo is back and the island is gone.

### Show and hide

Only once the first screen is fully scrolled; inside it, the island just follows the formation.

- Hides: when scrolling down, or after 2.5s without scroll, hover or focus.
- Shows: scrolling up; pointer in the top band; tapping the top band (touch screens); keyboard focus on one of its links.
- Stays while hovered or focused. Slides up and down (250ms); it never redraws.
- The top band is one row tall (`cellH`), full width and fixed to the screen, so it works between sections too. It's detected from the pointer position, not an element, so it never blocks clicks on content under it.

### The island

- A centred pill, about 0.6 of a row tall and at least 44px. Colours from tokens: `--surface` fill, `--border` outline, `--text` titles, `--accent` for the current section.
- A `<nav>` with real links (`<a href="#work">`), so "open in new tab" works. The current section's link gets `aria-current`.
- Logo: back to the top. Titles: jump (§7).
- Compact mode, only if the titles don't fit (phones with many sections): logo + current title, tap to expand. Built last.

## 7. Jumping

Triggered by island links, the logo, opening the site on a section link, and `hashchange`.

| Target | What happens |
|---|---|
| drawn | eased scroll to it (600ms + 150ms per screen, at most 1.2s) |
| the next section, not drawn | glide one screen; the scroll draws it as usual |
| further away, not drawn | slide-in (below) |

Slide-in:

1. Lock input and start loading the target's content. Hide the sections in between and shift the target up so it sits right below the current screen, where the next section would be.
2. Glide one screen (1400ms). The target slides in and draws exactly like a normal next section. Starting from the loading screen, the header forms during this glide.
3. In one frame: remove the shift, show the sections in between marked as drawn (finished, no animation), and set the scroll to the target's real position. Nothing visibly changes.
4. Unlock and move focus to the target section.

- If the jump starts while resting between two sections, the partly visible next section is replaced by the target (a small pop). It's marked drawn too.
- Opening on a section link: the jump starts after the loading burst ends.
- Unknown hash: ignored and removed.

## 8. URL

- The current section (the one covering most of the screen) is written to the hash with `history.replaceState`, so no back-button steps are added. At the top the hash is removed.
- Refresh or a shared link: starts at the top, plays loading, then jumps to the hash's section.

## 9. Resize, rotation, reduced motion

- Resize (debounced) or profile change: recompute the geometry, rebuild lines and boxes, keep every section's progress and drawn state, and restore the scroll to the same section and offset. A profile change switches item layouts, and content where the profile overrides it.
- Reduced motion: loading draws instantly; sections appear drawn and filled as they arrive; the header switches between hero and island with a fade at `f = 0.5`; jumps and snaps are instant.

## 10. Mock sections

- Temporary tokens `--mock-1` … `--mock-5` in `src/style.css`, with light and dark values. Removed when real content arrives.
- `src/<name>/box.js` renders an empty `div` filling the box with `var(--mock-N)`, where N is `props.tone`.
- `about/box-small.js` is the portrait swap: the same tone with diagonal stripes (from tokens), so the swap is visible.
- In dev, mock `load()` waits a random 0–1.5s so the box shimmer shows.

Positions are `col, row, cols × rows` on the design grid.

About (4 boxes)

| Box | Tone | Landscape | Portrait |
|---|---|---|---|
| intro | 1 | 1, 2, 7 × 4 | 1, 1, 6 × 3 (`box-small.js`) |
| photo | 2 | 9, 1, 8 × 3 | 1, 4, 4 × 3 |
| stat | 3 | 9, 5, 3 × 3 | 5, 4, 2 × 3 |
| note | 4 | 13, 5, 4 × 2 | hidden (`null`) |

Work (5 boxes)

| Box | Tone | Landscape | Portrait |
|---|---|---|---|
| a | 1 | 1, 1, 4 × 3 | 1, 1, 3 × 2 |
| b | 2 | 5, 1, 4 × 3 | 4, 1, 3 × 2 |
| c | 3 | 9, 1, 4 × 3 | 1, 3, 3 × 2 |
| d | 4 | 13, 1, 4 × 3 | 4, 3, 3 × 2 |
| wide | 5 | 1, 5, 16 × 3 | 1, 6, 6 × 4 |

Contact (3 boxes)

| Box | Tone | Landscape | Portrait |
|---|---|---|---|
| big | 2 | 3, 2, 8 × 5 | 1, 2, 6 × 4 |
| small-1 | 3 | 12, 2, 3 × 2 | 1, 7, 3 × 2 |
| small-2 | 5 | 12, 5, 3 × 2 | 4, 7, 3 × 2 |

## 11. Config defaults

All in `src/config.js`. Starting values, to be tuned by eye.

| Setting | Default |
|---|---|
| Profiles | portrait 6 × 9 on `(orientation: portrait)`, landscape 16 × 7 otherwise, plus 1 header row |
| Cell size | 48–160px |
| Loading draw | 1400ms total, starts spread over 800ms (5000 / 3000 while testing) |
| Dev loading delay | `?delay=ms` |
| Horizontal line draw window | 0.3 of section progress |
| Vertical line lag | 0.15 of section progress |
| Draw smoothing | ~120ms |
| Snap commit | 25% of a screen |
| Snap glide | 1800ms per screen of distance left, at least 700ms |
| Scroll-stop fallback | 150ms without scroll events |
| Scroll hint fade | first 20% of the first screen |
| Header formation | logo 0–0.5, outline 0.35–0.6, titles 0.5–0.7 of the first screen |
| Header idle hide | 2500ms |
| Header slide | 250ms |
| Island height | 0.6 of a row, at least 44px |
| Jump slide-in | 1400ms |
| Jump to a drawn section | 600ms + 150ms per screen, at most 1200ms |
| Resize debounce | 150ms |
| Mock load delay (dev) | random 0–1500ms |

## 12. Build order

Each step ends with a check in the browser.

1. **Config, geometry and the `?grid` overlay.**
   Check: the windows in §1 give the listed grids; resizing keeps whole cells; no column sits under the scrollbar.
2. **Page structure, section files and mock boxes**, placed without animation.
   Check: boxes sit on grid lines in landscape and portrait; the swapped and the hidden box behave; a deliberately broken layout triggers the dev warnings.
3. **Drawing engine:** loading on the clock, sections on scroll, draw once, box fill, content reveal, box shimmer.
   Check: loading looks as it does today; lines draw on screen, never off it; boxes fill top-down; scrolling back changes nothing.
4. **Snapping, loading input lock, start at the top, scroll hint.**
   Check: 2–3 wheel notches always land on a section; a small scroll stays put; nothing scrolls during loading.
5. **Header island:** chrome layer, formation and its reverse, hide/show, top band, touch tap, keyboard focus.
   Check: the formation follows the scroll both ways; the island hides and comes back; content under the band stays clickable between sections.
6. **Jumping and URL:** the three jump cases, logo to top, hash following the current section, opening on a section link, `hashchange`.
   Check: jumping from About to Contact slides Contact in as the next section and Work is drawn afterwards; a refresh on `#work` plays loading, then jumps.
7. **Resize, rotation, reduced motion**, compact island if needed, then a browser pass at desktop, laptop, tablet and phone sizes in light and dark mode.

## 13. Accepted edge cases

- Home/End or dragging the scrollbar far: the sections passed count as drawn (they finish off screen); the section you land on draws quickly through the smoothing.
- A jump while resting between sections: a small pop (§7).
- Phone held sideways: sections are slightly taller than the screen, with no snapping inside them.

## 14. Later

- Full-bleed items that stretch into the spare cells to the screen edge.
- A tablet profile, if a real device looks wrong.
- Real content; remove the mock tokens and creators.

## 15. Implementation log

Added after the build. Sections 1–14 are the plan as written and are left unchanged; this section records how it was built and every change it received since. Where they disagree, this section and the code are current.

### 15.1 Built (2026-10-10)

All seven build steps (§12) are in place.

| Step | Where |
|---|---|
| 1. Config, geometry, `?grid` overlay | `config.js`, `layout.js`, `debug.js` |
| 2. Page structure, section files, mock boxes, dev warnings | `main.js`, `sections.js`, `section.js`, `checks.js`, `mock.js`, `about.js`, `work.js`, `contact.js` and their folders |
| 3. Drawing engine: loading clock, scroll drawing, draw once, box fill and reveal, shimmer | `grid.js`, `section.js`, `loading.js` |
| 4. Snapping, loading input lock, start at the top, scroll hint | `scroll.js`, `hint.js` |
| 5. Header island: formation and reverse, hide/show, top band, touch tap, focus, compact mode | `header.js` |
| 6. Jumps (three cases, logo to top), URL following, section links, `hashchange` | `scroll.js`, `url.js` |
| 7. Resize and rotation (state and scroll position kept), reduced motion | `main.js`, `scroll.js`, `header.js` |

How the build differs from the plan as written:

- Modules beyond §2: `checks.js` (dev warnings), `debug.js` (`?grid`), `hint.js`, `url.js`, and `mock.js`, one shared mock creator that the box files re-export.
- Loading uses the testing values (5000 / 3000 ms), and in dev, readiness waits 15 s by default; `?delay=ms` overrides it.
- Slide-in jump (§7): after the glide the target gets up to 1.5 s to finish drawing through the smoothing, then it is finished.
- The loading section's states are `loading → waiting | filled → rest`; `rest` means the burst is over and a rebuild never replays it.
- Compact island: the toggle shows the current section's title, or "Menu" while the loading screen is current.

### 15.2 Review fixes (2026-10-11)

- Compact mode was decided before the island took its new height, so a resize (e.g. desktop to 390px) could pick compact by mistake.
- Every resize rebuilt every section, even when the grid was unchanged (a phone's address bar showing or hiding), rendering box content again each time. Now only the header is re-placed in that case.
- The scroll restore after a resize had an inverted lock check.
- The `?grid` overlay drew only on the loading section, which has no boxes; it now draws on every section.

Accepted as they are: the testing timings stay while testing; the 48–160px cell limits are targets, so real cells reach about 163px, and about 47px wide on a phone held sideways (as in the §1 table).

### 15.3 Changes after the plan (2026-10-11)

| Change | What it does now | Replaces in the plan |
|---|---|---|
| Responsive header | Island text scales with the island: `clamp(14px, 0.25 × island height, 24px)`. The hero logo is 760px up to about 1900px wide screens, then 40vw at most 85svh; never wider than 86vw or taller than half the screen. | §6 hero size `min(86vw, 760px)`; fixed 14px titles |
| Theme toggle | Last item of the island (moon in light mode, sun in dark mode, `aria-pressed` = dark). Follows the system until a pick; the pick is kept in `localStorage` and applied before the first paint by an inline script in `index.html`. Every token is one `light-dark()` pair, and `data-theme` on `<html>` only switches `color-scheme` (`theme.js`). | §6 island contents; D-001's `prefers-color-scheme` block |
| Ink transition | A theme change is a view transition: the new theme is revealed through an animated SVG mask made per click (`ink.js`). It spreads from the click like ink in water: a lobed core, a mottled haze, curling tendrils, and a final fill so no speck stays. 1800 ms. Instant with reduced motion or without view transitions. | new |
| Tablet profile | `tablet`, 12 × 8, for landscape screens of 8:5 or narrower (tablets held sideways, 4:3 and 5:4 screens). Order: portrait, tablet, landscape. Every mock item has a tablet layout (15.4). | §1 profiles (two); §14 "a tablet profile" |
| Scroll peek | At the top after loading, the page dips 12% of a screen and back, then once more at 40%: first after 1.2 s, then every 5 s, at most 3 times. The first input stops it for good, and the hint holds still while it peeks. It previews the header formation and starts About's top line. | §5 hint, which was only a fading label |
| Vertical lines | Drawn like the loading grid: each starts at a seeded point between 0.05 and 0.6 of the section's progress, with a seeded ease-in (power 1 to 1.8), and all finish at p = 1. The tip still never passes the visible bottom. Horizontal lines are unchanged. | §3 "lagging p" and §11 vertical lag 0.15 |
| Decisions | D-006: the scroll hint may sit above the grid (amends D-004). D-007: theme toggle with the ink transition (replaces D-001's `prefers-color-scheme` rule, extends the island in D-004). D-008: tablet profile (extends D-002). | — |

New or changed settings in `src/config.js`: `PROFILES` (tablet), `V_START` [0.05, 0.6] and `V_EASE` 1.8 (replace `V_LAG`), `PEEK_DISTANCE` 0.12, `PEEK_DURATION` 1600, `PEEK_FIRST` 1200, `PEEK_EVERY` 5000, `PEEK_TIMES` 3, `THEME_INK` 1800.

Side effect: with the theme button, the island needs about 385px, so it goes compact on screens of 375px or narrower.

### 15.4 Tablet mock layouts

Positions are `col, row, cols × rows` on the 12 × 8 design grid.

| Section | Box | Tablet |
|---|---|---|
| About | intro | 1, 2, 6 × 4 |
| About | photo | 7, 1, 6 × 3 |
| About | stat | 7, 5, 3 × 3 |
| About | note | 10, 6, 3 × 2 |
| Work | a / b / c / d | 1 / 4 / 7 / 10, 1, 3 × 3 |
| Work | wide | 1, 5, 12 × 4 |
| Contact | big | 1, 2, 8 × 5 |
| Contact | small-1 | 10, 2, 3 × 2 |
| Contact | small-2 | 10, 5, 3 × 2 |
