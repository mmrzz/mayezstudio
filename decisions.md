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

## D-011 · Persian and right to left · 2026-10-12 · Active
Decision: The site is Persian (`lang="fa" dir="rtl"`), set in self-hosted Vazirmatn (variable). The grid mirrors: design column 1 is the inline-start (right) edge, and everything that runs along x starts from the right (horizontal lines, the loading shimmer, the island).
Why: The audience and the copy are Persian; a grid that draws and reads from the left would work against the text.
Rules: Layouts are written start first. Never letter-space, uppercase or justify Persian text, and never split it into characters. Persian digits are written in the source. Compound words keep their real zero-width non-joiner.
Supersedes: none (extends D-002)

## D-012 · Intro section content · 2026-10-12 · Active
Decision: Section 1 is «معرفی» (`#intro`): the claim «ایده از شما، طراحی و ساخت از ما.», the line «یک تیم، از ایده تا تحویل.», and three receipts: ۴ سامانهٔ دولتی ساخته‌ایم · ۱ سال توسعه و نگهداری سامانه‌های در حال اجرا · ۲ نفر طراحی و برنامه‌نویسی، بی‌واسطه.
Why: The claim names both parties and who does what; the receipts are team facts that lower the risk of hiring a small team. «وب» is carried by the page title and descriptions.
Rules: A figure and its caption read as one sentence. Receipts state team facts in the "we" voice; one person's credentials do not go there. No ribbons from the old project; adding them needs a new decision.
Supersedes: none

## D-013 · Content animation with GSAP · 2026-10-12 · Superseded by D-016
Decision: Content animations use GSAP (core, DrawSVG, SplitText, CustomEase), loaded with section content behind the loading screen. An animated container renders its finished state and animates into it once, when its box is revealed; strokes draw with the grid's tip and settle to ink.
Why: The animations carry the page and need precise timelines that can jump to their end (reduced motion, jumps, resizes). GSAP and its plugins are free for commercial use.
Rules: Plays once per page load; shows finished at once with reduced motion or an instant reveal. Never tween colours. Violet appears only while something moves; at rest everything is ink. No ScrollTrigger or smooth-scroll libraries; scrolling stays our own engine (D-003, D-005). Timings and eases live in `src/config.js`.
Supersedes: none

## D-014 · Container location and the reveal event · 2026-10-12 · Active
Decision: Containers live in `src/content/sections/<section>/containers/<id>.js`; a section's shared helpers sit in its folder, outside `containers/`. `section.js` dispatches `reveal` on a box the first time it becomes ready, with `detail.instant` for boxes shown without animation.
Why: The restructure moved containers into their section's folder, and animated containers need to know when they are shown and whether to animate.
Rules: The container shape `{ id, props, load, render }` is unchanged. The test route dispatches `reveal` too.
Supersedes: none (amends D-010's file location)

## D-015 · Floating containers with their own look · 2026-10-14 · Active
Decision: Containers float inside their grid cells with a margin, rounded corners and a border. Each container sets its own fill and border colour in its file (`look: { fill, edge }`), picked from `--tone-*` palette tokens.
Why: The grid is calm and ordered; the containers are the playful part, so they should contrast with it instead of repeating the grid's surface colour.
Rules: Margin, radius and border width live in `BOX` in `src/config.js`. Colours are `var(--tone-*)` tokens only, each a `light-dark()` pair on `:root`. A container without a `look` falls back to surface and border. Use violet fills only on containers that do not animate (D-013).
Supersedes: none (extends D-010's container shape and D-001's palette)

## D-016 · Content animation with Three.js and Theatre.js · 2026-10-14 · Active
Decision: Content animations use Three.js for drawn illustrations and Theatre.js for all timelines (DOM text and Three objects alike), replacing GSAP. Timelines are authored with Theatre studio in dev; production plays exported state with @theatre/core only. Both load with section content behind the loading screen.
Why: The intro illustrations (the claim's idea-to-delivery drawing) need real 3D moves such as hinged flaps, and one timeline tool should drive both text and drawing.
Rules: Illustrations look like technical drawings: orthographic camera, 1px ink edges, faces filled with the box's tone, no lighting or shading. Colours are read from tokens, never tweened, and re-read on theme change. Violet appears only while something moves; at rest everything is ink. Plays once per page load; reduced motion or an instant reveal shows the finished state at once. The finished state is markup (an SVG of the last frame), so no WebGL context stays live at rest. Text splits by words only (D-011). No ScrollTrigger or smooth-scroll libraries (D-003, D-005). Timings and eases live in `src/config.js`.
Supersedes: D-013

## D-017 · Illustration stroke and the claim's finished drawing · 2026-10-14 · Superseded by D-018
Decision: Illustrations use a thick, round stroke (`INTRO.claim.stroke`, in design units, so it scales with the drawing) instead of 1px edges, and their shapes are simplified to suit it: few lines, rounded corners, one icon per idea. The intro claim ends on the open package with the four stage cards standing in it, each icon visible above the rim, and the slash logo on its front; the bulb and rays are erased once their work is done.
Why: Thin edges and a closed box read as generic; a bold stroke is more playful, and showing what went into the package tells the idea-to-delivery story at rest.
Rules: Where the drawing has no room beside the text (small screens), it plays first at full strength, then fades back behind the text, and only then is the text written over it. The rest of D-016 stands.
Supersedes: none (amends D-016's "1px ink edges" rule)

## D-018 · Claim as a self-building interface · 2026-10-15 · Active
Decision: The claim's illustration is an app window of real DOM that builds itself beside the text: a cursor places rough blocks, they snap into a grid, content fills in, then «تحویل شد» is delivered. It replaces the bulb-and-package line drawing.
Why: Line drawings read as cheap for a studio that sells quality. A real interface shows design and build literally, in filled surfaces with depth, and needs no WebGL (the finished state is the markup).
Rules: The timeline stays Theatre (D-016) with timings in `INTRO.claim`; the window is laid out in a fixed design space and scaled. Tokens only; violet only while something moves, ink at rest. Plays once; reduced motion or an instant reveal shows the finished markup. With no room beside the text it goes below it, else centred behind it, faded, and plays before the text is written. The sample content in the window is placeholder.
Supersedes: D-017 (amends D-016's Three.js-for-illustrations rule for the claim)

## D-019 · Test route controls bar · 2026-10-15 · Active
Decision: `/test/<id>` shows a controls bar above the zoomed box: replay, jump to the end, a scrubber, speed, light/dark theme and profile. `?bare` shows the container alone.
Why: Judging motion needs replay, scrubbing and theme and profile switching in one place.
Rules: The bar is dev-only, uses tokens only and is never inside the box. The container keeps the page's props and grid size. `?bare` keeps D-010's container-only view. The scrubber follows the shared timeline helper (`dev` in `src/core/timeline.js`), which is compiled out of production.
Supersedes: none (amends D-010's "shows nothing else")

## D-020 · Receipt 1 as a pixel-art game · 2026-10-15 · Active
Decision: «۴ سامانهٔ دولتی ساخته‌ایم» is shown as a colourful retro pixel-art scene across the card: a builder in a hard hat pushes a crate in, three more drop onto it, he startles and cheers beside the pile of four, under a sunset (dusk in the dark theme) with hills, clouds, a fruit tree and a sun. The caption is unchanged (D-012 stands): the clash with «دولتی» is wanted.
Why: The stick-figure drawing was tiny, hard to read and cheap-looking. A bigger, deliberately odd retro scene is memorable and fills the card; the retro feel depends on real colour.
Rules: Sprites are built in code (`src/core/pixel.js`) and drawn as crisp SVG at a whole-number scale; everything moves in whole game pixels. Its colours are the `--px-*` tokens in `src/style.css`, each a light/dark pair, used by this scene only, and the scene covers the card's fill. Violet (dust, sparkles) appears only while something moves. The finished state is the markup. The timeline stays Theatre with timings in `INTRO.systems`. Trees, clouds and bushes appear only where there is room. No container uses Three.js any more.
Supersedes: none (amends D-016's technical-drawing and ink-at-rest rules for this card)

## D-021 · Loading lasts only as long as the real loading · 2026-10-15 · Active
Decision: The loading screen ends as soon as fonts, the window and the first section's content are ready. If that happens before the draw is over, the rest of the draw is played out in `LOAD_FINISH` ms. There is no artificial minimum.
Why: Held-back readiness and test timings made every visit wait for nothing.
Rules: The draw keeps its production timings (`LOAD_DRAW_TOTAL`, `LOAD_SPREAD`). `?delay=ms` is an opt-in dev tool and defaults to 0. The ready burst still plays and still locks input until it ends.
Supersedes: none (narrows D-003's "draws on a timer")

## D-022 · Taller header island · 2026-10-16 · Active
Decision: The island is 1.5 rows tall, centred on the first two rows, and covers part of the second row while shown.
Why: After the finer grid (D-009) a one-row island was too small.
Rules: The hover band stays the screen's top row (D-004). Island height lives in `ISLAND_ROWS` in `src/config.js`. The reserved header row is unchanged (D-002).
Supersedes: none (amends D-009's "island stays within the header row")

## D-023 · Input unlocks when the loading draw ends · 2026-10-16 · Active
Decision: Scrolling unlocks and the hint shows as soon as the loading draw ends; the ready burst plays on without holding input.
Why: The burst kept every visit waiting 1.5 s after the page was ready.
Rules: The peek still never plays during the burst (`PEEK_FIRST` is longer than `BURST_DURATION`).
Supersedes: none (amends D-021's input-lock rule)

## D-024 · Loading screen shrinks after the first visit · 2026-10-16 · Active
Decision: Once the visitor is past the loading screen and the first section is drawn, the loading screen shrinks to half its rows (`LOAD_RETURN_ROWS`). At the top the logo sits full size in the middle of that half, and the island forms over that shorter scroll.
Why: Going back to the top showed a screen of empty grid and the logo came back late.
Rules: The shrink is whole rows, never moves what is on screen, and never happens during a jump or a lock. After it the scroll hint is gone for good.
Supersedes: none (amends D-003's "one screen tall" for the loading section and D-006's hint)
