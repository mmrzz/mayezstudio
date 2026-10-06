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

