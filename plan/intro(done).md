# Plan: Intro section (معرفی)

Date: 2026-10-12 · Status: ready for review · Builds on: `grid-and-header(done).md` · Decisions: D-002, D-003, D-007, D-009, D-010; proposed D-011 to D-014 (§19)

## Goal

- The first section after loading becomes the intro: the claim, its supporting line and three receipts. It replaces the mock About section.
- The site becomes Persian and right to left, and the grid is mirrored to match.
- Animation carries the section. The claim lands in two beats, then three receipts draw themselves, each a moment of a design being made. Everything plays once, then the section is still.
- It must look right everywhere from a 360px phone to a 3440px monitor, held either way, in light and dark.

Out of scope: ribbons (not part of this site), the Sharif credential (it may go on a personal card in the Team section later), and other sections' content.

## 0. Content (final)

| Item | Text |
|---|---|
| Menu title | معرفی |
| Section id and hash | `intro`, `#intro` |
| Claim, beat 1 | ایده از شما، |
| Claim, beat 2 | طراحی و ساخت از ما. |
| Supporting line | یک تیم، از ایده تا تحویل. |
| Receipt 1 | figure «۴» · caption «سامانهٔ دولتی ساخته‌ایم» |
| Receipt 2 | figure «۱ سال» · caption «توسعه و نگهداری سامانه‌های در حال اجرا» |
| Receipt 3 | figure «۲ نفر» · caption «طراحی و برنامه‌نویسی، بی‌واسطه» |
| `<title>` | may/ez · طراحی و ساخت وب‌اپلیکیشن سفارشی |
| Meta and Open Graph description | طراحی و ساخت وب‌اپلیکیشن سفارشی، از ایده تا تحویل، با یک تیم. |

Rules:

- A figure and its caption read as one sentence («۴ سامانهٔ دولتی ساخته‌ایم»). The caption never repeats the figure.
- Persian digits (۰–۹) are written in the source text; nothing converts them.
- Words keep their real zero-width non-joiner (U+200C): ساخته‌ایم, سامانه‌های, برنامه‌نویسی, بی‌واسطه, وب‌اپلیکیشن. «سامانهٔ» uses U+0654. Never a plain space or a joined form in their place.
- The text lives in the container files.
- The intro does not say «وب»; the title and descriptions carry it for search results and link previews.

## 1. Persian and right to left (site-wide, step 0)

### Document

- `<html lang="fa" dir="rtl">`.
- `<title>`, `<meta name="description">`, `og:title`, `og:description` and `og:locale` = `fa_IR` from §0. An Open Graph image comes later.
- Persian interface strings:

| Where | Now | Persian |
|---|---|---|
| Island nav `aria-label` | Sections | بخش‌ها |
| Compact toggle | Menu | منو |
| Theme button `aria-label` | Dark mode | حالت تاریک |
| Loading section `aria-label` | Loading | در حال بارگذاری |
| Scroll hint | scroll | اسکرول |
| Work, Contact titles (mock) | Work, Contact | کارها، تماس (placeholders until their own plans) |

- The logo stays Latin; it is an SVG and its label stays `may/ez`.

### Font

- Vazirmatn 33.0.3 (OFL), variable, all weights in one file: `Vazirmatn[wght].woff2` from the `vazirmatn` npm package, 111KB, Persian and Latin. Copy it once to `public/fonts/vazirmatn-wght.woff2` (renamed: brackets in a URL invite encoding trouble), with `OFL.txt` beside it. It is not kept as a dependency.
- `@font-face` in `src/style.css`: `font-weight: 100 900; font-display: swap`. Preload it in `index.html` (`<link rel="preload" as="font" type="font/woff2" crossorigin>`).
- `body { font-family: Vazirmatn, system-ui, sans-serif }`. The island and the hint inherit it instead of `system-ui` and `monospace`.
- The loading screen's readiness also waits for `document.fonts.load('1em Vazirmatn')`. `document.fonts.ready` alone can resolve before any text has asked for the font.
- Persian typography rules:
  - No `letter-spacing` and no `text-transform` on Persian text; spacing pulls the joined letters apart. The hint loses both.
  - Line height at least 1.3 for display text and 1.7 for running text, so dots and marks above and below have room.
  - Text is start-aligned. Never `text-align: justify`.
- Later: subset the font to the characters in use (§18).

### Mirrored grid

Rules:

- Design column 1 is the inline-start edge, which is the right edge in RTL. Layouts are written start first, so they stay valid if a page ever runs LTR.
- Everything that runs along x starts from the right:
  - horizontal grid lines draw right to left, both on the loading clock and on scroll;
  - the loading shimmer sweeps from the top right;
  - the island reads right to left: logo, titles, then the theme toggle on the far left.
- Spare cells mirror too: the start side gets `floor(spare / 2)`, as the left side does now.

Changes:

| File | Change |
|---|---|
| `src/core/layout.js` | `computeGeometry` takes `dir` (from `document.documentElement.dir`). Pixel edges `x[]` stay physical, left to right. New `physCol(geo, designCol, span)` returns the physical start column: in RTL `colStart + C − col − span + 1`, where `colStart = cols − C − floor((cols − C) / 2)`. `itemRect` uses it. |
| `src/core/section.js` | Box columns `c0` and `c1` come from `physCol`. A box's top and bottom edges count as drawn when the line reaches its far edge from the start side: LTR `len ≥ x[c1]`, RTL `len ≥ width − x[c0]`. |
| `src/core/grid.js` | In RTL, a vertical line's shimmer offset is `width − x`. Lengths still count from where the line starts. |
| `src/style.css` | Under `:root[dir='rtl']`: horizontal lines use `--dir: to left`, and their tip sits at `left: calc(100% − var(--p))`. In the island: the logo slot's `margin-right` becomes `margin-inline-end`; the theme toggle's `margin-left` becomes `margin-inline-start`; its divider's `left: 0` becomes `inset-inline-start: 0`. |
| `src/dev/debug.js` | Numbers design columns from the start edge. |

- Unchanged:
  - The ready blast is centred.
  - `ink.js` spreads from the click.
  - The header measures the logo slot with `offsetLeft`, which stays correct in RTL.
  - `checks.js` works in design cells, so direction doesn't affect it.

## 2. Layout

Section file `src/content/sections/intro/section.js`: id `intro`, title «معرفی». It takes About's place in `src/content/sections.js`. The mock `about` folder is deleted.

Containers (D-010; ids are unique across the site): `intro-claim`, `intro-systems`, `intro-year`, `intro-team`.

Positions are `col, row, cols × rows` on the design grid, with column 1 at the right.

| Container | Landscape 32×14 | Tablet 24×16 | Portrait 12×18 |
|---|---|---|---|
| `intro-claim` | 5, 2, 24 × 6 | 2, 3, 21 × 6 | 1, 2, 12 × 6 |
| `intro-systems` | 5, 9, 8 × 5 | 2, 10, 7 × 5 | 1, 9, 12 × 3 |
| `intro-year` | 13, 9, 8 × 5 | 9, 10, 7 × 5 | 1, 12, 12 × 3 |
| `intro-team` | 21, 9, 8 × 5 | 16, 10, 7 × 5 | 1, 15, 12 × 3 |

- **Composition.** The claim, a one-row gap and the receipt strip are centred as a block. The strip is exactly as wide as the claim, so both edges line up. The empty cells around them are plain grid.
- **Receipts form one strip.** They share edges, so one grid line divides neighbours. They sit in a row on landscape and tablet, and stack on portrait.
- **On phones everything runs full width** (12 of 12 columns). Width is too scarce for side margins, and the box padding gives the inner margin. Row 1 stays empty under the island.
- **The whole section fits one screen in every profile** (D-003).
- These are starting positions, tuned by eye in step 3. Each change gets re-checked against §16.

## 3. Type and arrangement

All sizes come from the box (container query units) and are clamped, so content sizes itself to its box (plan `grid-and-header(done).md` §1). The numbers are starting values, checked at every size in §16.

### Claim

- Markup: `<h1>` with two block spans, one per beat, so the claim is always two lines. Then `<p>` for the supporting line. It is the page's only `h1`.
- `--claim: clamp(26px, min(22cqh, 10cqw), 104px)`. The height share fits two lines plus the supporting line; the width share keeps the longer beat («طراحی و ساخت از ما.») on one line. Each beat is `white-space: nowrap`, so a misfit shows up as the dev overflow warning instead of a third line.
- Claim weight 800, line height 1.35.
- Supporting line `clamp(14px, calc(var(--claim) * 0.34), 28px)`, weight 400, line height 1.8.
- Padding `clamp(10px, min(8cqh, 4cqw), 40px)`. Start-aligned and vertically centred.

### Receipts

- Markup, so it reads as one sentence:

  ```html
  <p class="receipt"><span class="receipt-mark" aria-hidden="true">…</span><strong class="receipt-figure">۴</strong> <span class="receipt-caption">سامانهٔ دولتی ساخته‌ایم</span></p>
  ```

  The space between figure and caption is a real text node, so screen readers don't run the two together.
- **Arrangement** is chosen by the box's shape (container queries), never by the profile:

| Arrangement | When | Layout |
|---|---|---|
| Card | `aspect-ratio ≤ 2.6` (landscape, tablet, sideways phones; boxes 1.4 to 1.65) | Line 1: mark and figure at the start. Caption below. |
| Strip | `aspect-ratio > 2.6` (portrait phones and tablets; boxes about 4) | Mark and figure at the start; caption beside them toward the end, vertically centred. |
| Compact card | card and `height < 130px` (sideways phones) | Card with the minimum sizes below. |

- Sizes:

| | Card | Strip | Compact |
|---|---|---|---|
| Padding | `clamp(10px, min(10cqh, 6cqw), 28px)` | same | 8px |
| Figure | `clamp(26px, min(28cqh, 17cqw), 96px)`, weight 800, line height 1.1, `nowrap` | `clamp(26px, 40cqh, 72px)` | same as card |
| Caption | `clamp(12px, min(7cqh, 4.4cqw), 18px)`, weight 400, line height 1.75, `text-wrap: balance` | `clamp(13px, 15cqh, 17px)` | 12px |
| Ruler band (`intro-year`) | `clamp(10px, 8cqh, 22px)` above the bottom padding | same | 8px |

- **The three figures share one baseline across the strip.** The tally and the frame are positioned so they never move the figure: the frame's crop marks sit outside the figure's line box, and the tally is centred on its line. The figure line has the same height in all three.
- **Colour:** all text is `--text`. Never `--text-muted` on `--surface`: it measures 4.3:1 in light mode, below the 4.5:1 that small text needs.

## 4. Motion foundation

### Library

- `gsap@3.15.0`, pinned exactly, as a dependency. All of GSAP, plugins included, has been free for commercial use since 3.13 (GSAP standard license). Its one restriction is on building a competing visual site builder, which doesn't apply here.
- Used now:
  - **core:** timelines;
  - **DrawSVGPlugin:** the slash outlines;
  - **SplitText:** words, with line masks for the claim;
  - **CustomEase:** the house eases.
- Not used: ScrollTrigger and any smooth-scroll library. Scrolling, drawing and snapping stay our own engine (D-003, D-005); a second scroll driver would fight it.
- `src/core/motion.js` does the shared setup:
  - imports GSAP and the three plugins and registers them once;
  - registers the house eases from `config.js` by name (`draw`, `settle`, `land`);
  - in dev, applies `?speed=` to `gsap.globalTimeline.timeScale`;
  - exports `gsap`, `SplitText`, `reduced()` and the shared beats (below).
- The intro containers import `motion.js` dynamically from their `load()`. The chunk therefore downloads with section 1's content behind the loading screen (`site.js` already waits for `built[1].preload()`), never in the first paint.
- Budget: about 40KB gzipped for GSAP plus the three plugins, at most 50KB. Measured in step 1.

### The `reveal` event (engine change)

- `section.js` dispatches `reveal` on a box element the first time it becomes `ready` in a mount. `detail.instant` is true when the box has the `instant` class: it was shown without animation (a jump, an already drawn section, the rebuild of a drawn section).
- Containers that animate listen for it; static containers ignore it. The container shape from D-010 is unchanged.
- It is dispatched synchronously when the state flips, so a listener can set the starting state before the next paint.

### Animate into a finished state

- Every container renders its finished state as plain HTML and CSS: readable, correct and complete with no script running after `render`.
- An animation only does three things:
  1. On a non-instant reveal, sets its starting state in the same frame.
  2. Plays a timeline into the finished state.
  3. At the end, clears every inline style it set, reverts SplitText and removes its temporary elements. What remains is exactly what `render` made.
- Reduced motion, an instant reveal, a rebuild and the test route's `?end` therefore all show the same finished state, and nothing is measured at rest.
- Animated containers mark their root `data-motion`. `.box > [data-motion]` skips the box's own content fade, because the timeline controls appearance. The box's 300ms surface fill still plays; timelines start `MOTION_DELAY` (300ms) after the reveal, once the fill is done.
- Timelines never tween colours. Colours stay CSS tokens, so a theme change mid-animation stays correct (D-007).
- Each render runs inside a `gsap.context()`. Its cleanup reverts the context, killing timelines and splits.

### Stage: play once, in order

`src/content/sections/intro/stage.js`: a small coordinator the intro's containers share. It lives outside `containers/`, so it isn't a container.

- **Module state for the page's life:** which members have played.
- **Membership:** `render` joins the stage and the cleanup leaves it. A member that has already played renders its finished state on any later render, so a resize rebuild never replays it.
- **Claim:** plays on its reveal. `landed` resolves `STRIP_OVERLAP` (300ms) before its timeline ends, so the strip starts as the last word settles. It resolves at once if the claim's reveal is instant or motion is reduced.
- **Receipts:** the strip starts once every receipt that has joined has been revealed and `landed` has resolved. If no claim has joined, as on the test route, there is nothing to wait for. Receipt `i` then starts `i × STRIP_STAGGER` (150ms) later; `order` comes from props, with 0 at the start side.
- **A receipt waiting for the strip shows its starting state:** an empty filled box, never its finished state followed by a rewind.
- **An instant reveal** sends that member straight to its finished state and counts it as played. The other members keep their own rules.
- **Reduced motion:** everything finished, no timers.

### Shared beats

The grammar is a design being made: a pen tool, a text tool, a ruler, a selection, a paste.

- **Ink and violet.** Every stroke and fill at rest is `--text`. Violet (`--accent`) appears only while something moves: drawing tips, the paste selection, the caret, the contact flash. When the intro is still it holds no violet. The island's current title is the island's own business.
- **Tip.** The grid line's tip: a 5px `--accent` dot with an `--accent-border` glow, riding the end of a stroke. Its opacity follows `glowAt` from `grid.js` (rises over the first 15%, fades over the last 25%), so the receipts draw with the same pen as the grid. The stroke behind it is ink.
- **Strokes** are 1px, like the grid lines, at any size. The slashes are filled shapes.
- **Paste:**
  1. The element appears at full opacity at scale `PASTE_SCALE` (1.04), inside a selection: a 1px `--accent` outline with four 5px square handles (`--surface` fill, `--accent` border) at its corners.
  2. It settles to scale 1 with the `settle` ease (`PASTE_SETTLE`, 300ms).
  3. After `PASTE_HOLD` (350ms) the selection fades (`PASTE_FADE`, 200ms) and is removed.
- **Words.** SplitText by words. Each word rises 0.3em from transparent (`WORD_RISE`, 350ms, `land` ease), `WORD_STAGGER` (35ms) apart. Persian is split by words only. Splitting by characters breaks the joins between letters. SplitText runs with `aria: 'auto'`, so screen readers get the whole sentence while it is split.

## 5. Claim (`intro-claim`)

**Idea:** the text tool. A caret appears and the claim is set in two beats, one per party.

| t (ms) | What happens |
|---|---|
| 0 | A caret (2px × 1.05em, `--accent`, 1px radius) appears at the start of line 1 and blinks once: on 0 to 180, off 180 to 330. |
| 330 | Beat 1 «ایده از شما،»: words rise from behind their line mask (SplitText `type: 'lines,words'`, `mask: 'lines'`), `CLAIM_WORD` 500ms, `CLAIM_WORD_STAGGER` 50ms. The caret travels ahead of them to the end of the beat. |
| 930 | Hold `CLAIM_BEAT_HOLD` (200ms): the pause between the two parties. |
| 1130 | The caret drops to the start of line 2. Beat 2 «طراحی و ساخت از ما.» rises the same way, with the caret travelling ahead. |
| ~1530 | `landed` (300ms before the end): the receipt strip may start. |
| ~1830 | The caret fades (150ms). The supporting line rises as one piece (0.3em, `CLAIM_LINE` 400ms, `land`). |
| ~2230 | Done; SplitText reverted, inline styles cleared. |

- Words land from the start side (right), because DOM order is reading order.
- Line masks can clip the dots and tails of Persian letters below the baseline. The mask wrappers get `padding-block: 0.2em; margin-block: -0.2em`. Checked at 0.25 speed in step 4.

## 6. Receipt 1 · `intro-systems` · «۴»

**Idea:** four systems counted with the logo's own slash, each made the way a designer makes a shape: trace the outline, then fill it.

Mark: four slashes before the figure, sized in em of the figure (height 0.8em, 0.32em apart centre to centre) and centred on the figure's line. Each slash is the logo's slash, about 20.7° from vertical. Its path is copied from `#logo-slash` in `index.html` into `src/content/sections/intro/slash.js`, with a comment pointing back. It is reordered to begin at its bottom end (same shape), never mirrored. Each slash is an SVG with a filled path (`--text`) clipped by a rect, plus an outline path (`fill: none`, 1px `--text` stroke, `vector-effect: non-scaling-stroke`). Clip ids are unique per render.

| t (ms) | What happens |
|---|---|
| 0 | Starting state: outlines undrawn, fills clipped to zero height. Each slash is offset by a seeded jitter: up to `SLASH_JITTER.x` (8% of its width) sideways and `SLASH_JITTER.deg` (3°) of rotation. |
| i × 90 | Slash i (start side first) traces its outline: DrawSVG 0 to 100%, `SLASH_TRACE` 280ms, `draw` ease, with the tip riding the end (`getPointAtLength` in `onUpdate`, as `header.js` does). |
| when each outline closes | Its fill rises bottom to top (`SLASH_FILL` 160ms, `land`), and the outline fades into it. This is the grid's own rule: a box fills when its edges are drawn. |
| ~710 | Distribute: all four snap to exact spacing and the exact angle (`SLASH_DISTRIBUTE` 260ms, `settle`). Precision is the last step. |
| ~800 | «۴» pastes. |
| ~950 | Caption words. |
| ~1370 | Done. |

At rest: four ink slashes beside «۴», then the caption.

## 7. Receipt 2 · `intro-year` · «۱ سال»

**Idea:** a ruler for one year, ruled while you watch.

Mark: a ruler in its own band at the bottom of the box, spanning the padded width. It is HTML, not SVG, so it stays crisp at any width:

- a 1px baseline;
- a zero mark at the start;
- 12 month ticks at `inset-inline-start: k / 12 × 100%`;
- tick heights as fractions of the band: months 0.4, seasons (3, 6, 9) 0.7, the 12th 1.0, the zero mark 0.7.

Everything is `--text`.

| t (ms) | What happens |
|---|---|
| 0 | The zero mark rises (160ms, `settle`). |
| 80 | The baseline draws from the start (scaleX, origin at the inline start), `RULER_DRAW` 720ms, `draw` ease, with the tip at its end. |
| as the tip passes k/12 | Tick k rises (scaleY from the baseline, `TICK_RISE` 200ms, `settle`, slight overshoot). Tick times come from the `draw` ease, inverted by sampling when the timeline is built, so each tick fires exactly as the eased tip passes it: the ruler is ruled, not counted on a separate clock. |
| ~650 | «۱ سال» pastes. |
| ~800 | Caption words. |
| ~1360 | Done. |

At rest: a ruler under the figure and caption. On a phone strip (about 340px) a month is about 28px; on a sideways phone (about 175px), about 15px.

## 8. Receipt 3 · `intro-team` · «۲ نفر»

**Idea:** two halves become one frame with no gap between them: design and build without a handoff.

At rest: «۲ نفر» inside four crop marks, in CSS on a `.frame` wrapper:

- four corner spans, each an L of two 1px `--text` arms;
- arm length `max(6px, 0.22em)`;
- the frame sits 0.18em out from the figure inline and 0.08em out in the block direction;
- it is positioned outside the figure's line box, so the figure keeps the strip's baseline.

Temporary animation elements, removed at the end:

- two brackets, «[» on the start side and «]» on the end side, each a 1px vertical line with two short arms toward the figure;
- four half-edges: top and bottom, each split into start and end halves;
- four paste handles.

| t (ms) | What happens |
|---|---|
| 0 | Both brackets draw (`BRACKET_DRAW` 240ms): the upright, then the arms. Each starts one figure width out from the frame, clamped inside the box's padding. In the strip arrangement the end bracket starts over the caption's place; the caption is still hidden. |
| 200 | They slide toward each other and stop at the frame's edges (`BRACKET_SLIDE` 500ms, `settle`: a small overshoot, then rest). |
| ~650 | The four half-edges draw from the brackets toward the middle, top and bottom (`EDGE_DRAW` 220ms, `draw`), a tip on each. |
| ~870 | Contact: the two pairs of tips meet at the centre with a brief flash (glow up to 1.6×, then gone, `CONTACT_FLASH` 180ms). The frame is closed. «۲ نفر» pastes inside it. This frame is the selection, so there is no second outline, only the handles at its corners. |
| ~1050 | The frame recedes: each half-edge retracts toward its corner (`FRAME_RECEDE` 300ms, `land`), leaving the crop marks. The handles fade with it. |
| ~1100 | Caption words. |
| ~1560 | Done. |

## 9. Choreography

On the page, scrolling into the intro:

1. The grid draws on scroll (D-003). The claim's box sits higher, so it completes first, fills, and the claim plays about 300ms later.
2. The receipts' boxes complete as the scroll reaches the section. Each shows its starting state, an empty surface, until the strip starts.
3. When the claim has landed (about 1.5s into it) and all three receipt boxes are revealed, the strip plays from the start side: systems at 0, year at 150ms, team at 300ms. It is done after about 1.9s.
4. Then everything is still and stays still: no loops, no idle motion.

From the claim's reveal to the last caption is about 3.5s. Every number is in `config.js` (§14) and gets tuned on the page in step 8.

| Situation | Result |
|---|---|
| Normal scroll | As above. |
| Fast scroll or a snap glide | Same order. The stage holds the receipts until the claim lands. |
| Jump past the intro (loading → Work) | The intro is marked drawn and its boxes reveal instantly, already finished. |
| Jump to the intro from loading | Its next-section glide draws it, and it plays as on a normal scroll. |
| Resize or rotation mid-animation | The rebuild renders members that already played as finished; the rest play by the stage's rules. |
| Scrolling back up to the intro | Nothing replays (draw once, D-003). |
| Reduced motion | Finished at once: no caret, no timers. The boxes appear with no transition, as now. |
| Theme toggled mid-animation | Colours are tokens, so it keeps playing in the new theme. |

## 10. Test route

`/test/<container id>` (D-010) gets what is needed to judge motion, with no visible UI:

- After rendering, it dispatches `reveal` on the test box, so the animation plays on load. No claim joins, so a receipt plays alone at once.
- `r` replays: the stage is reset for that container, which is cleaned up and rendered again.
- `?speed=0.25` slows everything; `?end` reveals instantly, showing the finished state.
- These join the existing `?profile=landscape|tablet|portrait`.

On the full page in dev, `?delay=0` skips the 15s loading wait and `?speed=` works too.

## 11. Accessibility

- The claim is the page's only `h1`. Each receipt is one `<p>` that reads as one sentence.
- Marks and all temporary animation elements are `aria-hidden`. While text is split, SplitText's `aria: 'auto'` keeps the whole sentence readable.
- Content stays `inert` until revealed (existing). Nothing in the intro is focusable.
- Reduced motion: finished state at once (§9).
- Contrast: all text is `--text` on `--surface` (§3).

## 12. Performance

- Only these are animated: transforms, opacity, DrawSVG's stroke dashes and the slash clip rects. No layout properties, no filters, no colours. The tip's glow is a static shadow whose opacity changes.
- GSAP sets `will-change` only while a timeline runs; clearing styles at the end removes it.
- At most about 60 elements move at once, and only for a few seconds.
- One font file (111KB), preloaded and loaded behind the loading screen. The GSAP chunk loads there too.
- Check: a performance trace with 4× CPU throttling shows no long frames during the strip.

## 13. Files

New:

| File | What |
|---|---|
| `public/fonts/vazirmatn-wght.woff2`, `public/fonts/OFL.txt` | The font and its licence. |
| `src/core/motion.js` | GSAP setup, house eases, shared beats (tip, paste, words), `reduced()`. |
| `src/content/sections/intro/section.js` | Section definition and positions (§2). |
| `src/content/sections/intro/stage.js` | Play once, claim first, strip order (§4). |
| `src/content/sections/intro/receipt.js` | Shared receipt markup, arrangement, and the paste-then-caption tail of each timeline. |
| `src/content/sections/intro/slash.js` | The logo slash path, copied from `index.html`. |
| `src/content/sections/intro/intro.css` | The intro's styles, imported by its containers. Tokens only. |
| `src/content/sections/intro/containers/intro-claim.js`, `intro-systems.js`, `intro-year.js`, `intro-team.js` | The four containers. |

Changed:

| File | Change |
|---|---|
| `index.html` | `lang`, `dir`, title, description, Open Graph, font preload, Persian labels. |
| `src/style.css` | `@font-face`, body font, RTL grid-line and island rules, hint without spacing or uppercase, `.box > [data-motion]`. |
| `src/core/layout.js`, `src/core/grid.js`, `src/core/section.js` | Mirroring (§1); the `reveal` event (§4). |
| `src/dev/debug.js` | Column numbers from the start edge. |
| `src/dev/test.js` | `reveal` on load, `r`, `?speed`, `?end`. |
| `src/site.js` | Wait for the font. |
| `src/ui/header.js` | Persian strings. |
| `src/content/sections.js` | `intro` replaces `about`. |
| `src/content/sections/work/section.js`, `contact/section.js` | Placeholder Persian titles. |
| `src/config.js` | The `INTRO` block (§14). |
| `package.json` | `gsap` 3.15.0. |

Removed: `src/content/sections/about/` (mock).

## 14. Config defaults

All in `src/config.js` (D-002). Starting values, tuned by eye.

```js
// Intro motion (plan/intro.md). Starting values, tuned by eye. Times in ms.
export const INTRO = {
  // House eases, registered with CustomEase by name.
  eases: {
    draw: 'M0,0 C0.65,0 0.35,1 1,1', // strokes: ease in and out, like the loading grid
    settle: 'M0,0 C0.25,0.46 0.3,1.12 0.55,1.06 0.8,1 0.9,1 1,1', // a small overshoot, then rest
    land: 'M0,0 C0.16,1 0.3,1 1,1', // text and fills: quick, long soft landing
  },
  motionDelay: 300, // after a box's reveal, once its fill is done
  stripOverlap: 300, // the strip starts this long before the claim's timeline ends
  stripStagger: 150, // between receipts, from the start side

  paste: { scale: 1.04, settle: 300, hold: 350, fade: 200 },
  words: { rise: 350, stagger: 35 },

  claim: { blink: 330, word: 500, wordStagger: 50, beatHold: 200, line: 400 },
  systems: { trace: 280, stagger: 90, fill: 160, distribute: 260, jitter: { x: 0.08, deg: 3 } },
  year: { zero: 160, draw: 720, tick: 200 },
  team: { draw: 240, slide: 500, edge: 220, flash: 180, recede: 300 },
}
```

## 15. Build order

Each step ends with a check in the browser.

0. **Persian and RTL foundation:** font, `lang` and `dir`, Persian strings, mirrored grid, island rules.
   Check:
   - At 1440×790, 1180×800 and 390×664, `?grid` shows column 1 at the right.
   - Lines draw from the right on loading and on scroll.
   - The mock Work and Contact boxes still fill exactly when their four edges are drawn.
   - The island reads logo, titles, then the toggle from the right.
   - Compact mode still triggers correctly at 375px.
   - The loading screen waits for the font; no fallback glyphs flash.
1. **Motion core:** install GSAP, `motion.js`, the `reveal` event, test route controls.
   Check:
   - A placeholder timeline on `/test/intro-systems` plays, replays with `r`, slows with `?speed`, and `?end` shows the finished state.
   - Jumping from loading to Work fires `reveal` with `instant` on the intro boxes.
   - The GSAP chunk is within budget and loads only behind the loading screen.
   - DrawSVG measures the non-scaling 1px stroke correctly. If not, scale the stroke width by the SVG's scale instead.
2. **Section and finished states:** the intro section, the four containers rendering their finished state only, positions, type, the three arrangements.
   Check:
   - At every size in §16, nothing overflows (dev warning).
   - The claim is always two lines, and the three figures share a baseline.
   - The arrangement matches the table.
   - Light and dark both look right.
   - A screen reader reads each receipt as one sentence.
3. **Composition by eye:** tune positions and type with the user at desktop, tablet and phone sizes before any motion is built.
4. **Claim animation.**
   Check: at speed 1 and 0.25 the caret leads right to left, no dots are clipped by the line masks, the ending equals the static render (no jump on the last frame), and reduced motion shows the finished state.
5. **Receipt 1.**
6. **Receipt 2.**
7. **Receipt 3.**
   For each of steps 5 to 7, check on the test route with `?profile=landscape` (card) and `?profile=portrait` (strip), and at 844×340 (compact), at speed 1 and 0.25: the ending equals the static render, and nothing reaches outside the box.
8. **Choreography on the page:** the stage, claim first, strip order, play once. Tune the timings in `config.js`.
   Check: every row of the §9 situations table.
9. **Phones and final pass:**
   - real devices if possible (Android Chrome, iOS Safari), upright and sideways;
   - 360px wide;
   - a 4× CPU-throttled trace;
   - light and dark;
   - a theme toggle mid-animation.

## 16. Check sizes

Computed with `computeGeometry` and the §2 positions.

| Window | Profile | Screen grid | Cell | Claim box | Receipt box | Arrangement |
|---|---|---|---|---|---|---|
| 1920×960 | landscape | 32×16 | 60×60 | 1440×360 | 480×300 | card |
| 1440×790 | landscape | 32×18 | 45×44 | 1080×263 | 360×219 | card |
| 1366×657 | landscape | 32×15 | 43×44 | 1024×262 | 341×219 | card |
| 3440×1300 | landscape | 43×16 | 80×81 | 1920×487 | 640×407 | card |
| 1180×800 | tablet | 25×17 | 47×47 | 991×283 | 331×235 | card |
| 820×1180 | portrait | 13×19 | 63×62 | 757×373 | 757×186 | strip |
| 412×780 | portrait | 12×23 | 34×34 | 412×203 | 412×102 | strip |
| 390×664 | portrait | 12×20 | 33×33 | 390×200 | 390×99 | strip |
| 360×640 | portrait | 12×21 | 30×30 | 360×183 | 360×91 | strip |
| 844×340 | landscape | 35×15 | 24×24 | 578×144 | 192×120 | compact |
| 667×320 | landscape | 32×15 | 21×24 | 501×144 | 167×120 | compact |

The tightest cases are sideways phones: the claim at about 32px fits with a few px to spare, and the compact receipts with about 15px. If they overflow, the compact sizes shrink first; the layout positions stay.

## 17. Accepted edge cases

- A timeline that is running when the visitor scrolls away keeps running off screen. It lasts under 2s and isn't replayed.
- A resize mid-animation finishes the members that already played and lets the others play, so the strip can play with a gap. This is rare and harmless.
- If the font fails to load, the system's Persian font is used. Its metrics differ, so a claim beat may overflow; the dev warning catches this in testing.
- Sideways phones are the tightest fit (§16).

## 18. Later

- Subset the font to the characters in use (roughly halves it).
- An Open Graph image.
- The Team section, where per-person facts (such as Sharif) can live in each person's own voice.
- Later sections reuse `motion.js` and the shared beats (tip, paste, words), and the `reveal` event and stage pattern.
- Replace the placeholder titles «کارها» and «تماس» when those sections are planned.

## 19. Decisions

This plan relies on four new entries, drafted in chat and to be added before building:

- D-011 · Persian and right to left
- D-012 · Intro section content
- D-013 · Content animation with GSAP
- D-014 · Container location and the reveal event (amends D-010)
