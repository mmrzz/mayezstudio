# Decisions

History of design and development decisions for Mayez. Read before starting work; do not break an Active decision without asking.

## Format

- Append-only, numbered `D-NNN`. Add new entries at the bottom.
- Status is `Active`, `Superseded by D-NNN` or `Reverted`. Never delete an entry; add a new one that supersedes it.
- `Rules` is the part that matters in later sessions: what must not be broken.
- Keep entries short. Record the final result and the factors that led to it, not the conversation or code structure.
- Entries are added only when the user asks. Claude may suggest one but does not write it unprompted.

```md
## D-NNN · Title · YYYY-MM-DD · Active
Decision: what was chosen.
Why: the reason.
Rules: constraints for future work.
Supersedes: D-NNN or none
```

---

## D-001 · Brand palette from logo and avatar · 2026-10-06 · Active
Decision: Palette is derived from the logo (charcoal `#302B2B`, purple `#BC7BF9`) and the avatar (warm cream).
Why: The raw brand purple has too little contrast on cream, so light mode uses a deeper violet of the same hue and dark mode uses the exact logo purple. Light surface is deliberately a noticeably darker cream than bg so cards stand out. Dark bg and surface are warm charcoal to match the brand.
Rules: Tokens are defined on `:root` in `src/style.css`, with a `prefers-color-scheme: dark` override. Components use `var(--token)` only. Do not add an `accent-text` token; the light accent already passes contrast for text (about 5.9:1 on bg). Use `--on-accent` for text on filled accent backgrounds.
Supersedes: none

## D-002 · Grid geometry and layout profiles · 2026-10-10 · Active
Decision: Each layout profile has a fixed design grid (landscape 16×7, portrait 6×9) under one reserved header row. The screen is filled with whole, near-square cells around it. Items store `{ col, row, cols, rows }` per profile in design-grid cells, and a profile can swap an item's content or hide it.
Why: Column and row counts derived from the screen vary too much (6–29 columns, 7–13 rows) to store positions in; a fixed grid per profile keeps every position exact on any screen.
Rules: Profiles, cell limits and timings live in one config file (`src/config.js`) so they are easy to change. Never store positions in pixels or screen cells. The first row of every section is reserved for the header.
Supersedes: none

## D-003 · Scroll-linked section drawing · 2026-10-10 · Active
Decision: Sections are one screen tall. A section's grid draws as it scrolls in and is complete when the section fills the screen; an item's box fills when its edges are drawn, then its content shows. Each section draws once. The loading section draws on a timer. Snapping is gentle but finishes a deliberate scroll.
Why: One screen of scrolling per section keeps the page natural to scroll; drawing once avoids flicker and keeps jumps simple.
Rules: Track drawn state per section in code; never redraw or undraw a drawn section, whichever direction the user comes from. The loading section is never scroll-linked. Snapping never pulls the user back against their scroll direction; no CSS scroll-snap.
Supersedes: none

## D-004 · Header island and section jumps · 2026-10-10 · Active
Decision: A floating island (logo + section titles) is the only element above the grid. It forms from the loading logo during the first screen of scrolling, sticks to the top, auto-hides, and returns on scroll up or when the pointer is in the screen's top row band. Back at the top the formation reverses. Jumping to an undrawn section slides it in as if it were the next one and marks every section between as drawn; a drawn section is smooth-scrolled to. The URL follows the current section, and opening the site on a section link plays loading, then jumps there.
Why: Navigation stays out of the content grid; jumps keep the next-section animation without scrolling past unseen sections; the top screen always shows the full logo.
Rules: Nothing but the island sits above the grid. The hover band is the screen's top row, not tied to the grid. The formation follows scroll position and reverses; draw-once applies to section grids only. URL updates never add history entries.
Supersedes: none

## D-005 · Snapping only finishes a draw, gently · 2026-10-10 · Active
Decision: Snapping is applied only during the drawing phase: it glides to the next section only while that section is not drawn yet, and drawn sections scroll freely in both directions. The snap is more subtle near the end of a section (at least once past its half point), and automatic scrolling over an undrawn section is slow enough that the drawing animation is not missed.
Why: Snapping exists to finish the draw animation; once a section is drawn there is nothing left to finish, and a hard or fast snap near the end skips the animation it is meant to complete.
Rules: Never snap toward a drawn section. Glide duration scales with the distance left, so a late snap is short and soft. Jumps (island links, logo) are not snaps and have their own motion (D-004). Never pulls the user back (D-003).
Supersedes: none (narrows the snapping part of D-003)

## D-006 · Scroll hint above the loading grid · 2026-10-11 · Active
Decision: Besides the island, the scroll hint sits above the grid: a small fixed label at the bottom of the loading screen that appears when loading ends and fades over the first part of the first scroll. Until the visitor scrolls, the page also peeks now and then, dipping a little and back, to preview the scroll.
Why: The loading screen needs a clear cue that the page scrolls. The hint lives only on the first screen and never covers content.
Rules: Only the island and the scroll hint sit above the grid. The hint takes no pointer events and is gone once the first screen is scrolled. The peek runs only at the top, never during loading or a jump, and stops for good at the first input; it is not a snap.
Supersedes: none (amends the "nothing but the island" rule of D-004)

## D-007 · Theme toggle with an ink transition · 2026-10-11 · Active
Decision: The island ends with a light/dark toggle. The site follows the system theme until the visitor picks one; the pick is saved and applied before the first paint. A change spreads from the click like ink in water.
Why: Visitors can override the system theme; keeping the toggle in the island keeps the island the only navigation above the grid.
Rules: Each token is one `light-dark(light, dark)` value on `:root` in `src/style.css`; the theme changes only `color-scheme` (`data-theme` on `<html>`), never a second copy of the dark values. The island holds the logo, the section titles and the theme toggle. Reduced motion or no view-transition support switches at once.
Supersedes: none (replaces D-001's prefers-color-scheme rule; extends the island contents of D-004)

## D-008 · Tablet profile for near-square landscape screens · 2026-10-11 · Active
Decision: A third layout profile, tablet (12×8 design grid), is used for landscape screens of 8:5 or narrower; portrait 6×9 and landscape 16×7 stay.
Why: On 16×7, 4:3 and 5:4 screens and tablets held sideways got 2–5 empty rows and small cells.
Rules: Every item needs a tablet layout (or null). Profiles are matched in order in `src/config.js`: portrait, tablet, landscape.
Supersedes: none (extends D-002's profiles)

## D-009 · Finer design grids · 2026-10-11 · Active
Decision: Design grids are twice as fine: landscape 32×14, tablet 24×16, portrait 12×18. Cells are about 40 to 60px (limits 24–80px).
Why: At 16×7 a cell was around 120px, too coarse to place containers accurately.
Rules: Item positions are in the finer cells. The island stays within the header row (about 44px). The rest of D-002 stands: fixed grid per profile, whole near-square cells, tunables in `src/config.js`.
Supersedes: none (changes the grid sizes of D-002 and D-008)

## D-010 · One file per container, and a test route · 2026-10-11 · Active
Decision: Each container is its own file in `src/containers/`, named after its unique id, exporting `{ id, props, load, render }` and optionally a per-profile content swap. Sections only place containers by id, with positions per profile. `/test/<container id>` shows one container full screen, with `?profile=` to force a profile.
Why: Containers are designed one at a time and need a large, isolated view to judge them accurately.
Rules: A container's id equals its filename and is unique across the site. Positions stay in sections, never in container files. The test route uses the same props and grid size as the page and shows nothing else.
Supersedes: none
