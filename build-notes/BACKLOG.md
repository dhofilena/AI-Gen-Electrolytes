# Round-2 backlog

Issues surfaced by round-1 builders that were out of their file ownership.
Owner column says who fixes it. Do not fix something you do not own.

## Fixed already (shared files, by the orchestrator)

- `base.css` `.line-mask` sheared descenders (g/y/p/Q) on every masked headline —
  now pads the mask 0.18em and pulls it back with negative margin.
  **`reveal.js` `yPercent` moved 108 → 128 to clear that padding.** Change one, change both.
- `reveal.js` leaked one `resize` listener per `revealLines()` call (15+ sections) —
  now a single shared resize bus (`onResize`).
- `reveal.js` re-split on resize destroyed the `.line-mask` shells — now re-wraps and
  restores the resolved state.
- `revealRise` / `revealMedia` / `countUp` gained `trigger: false` and `delay`, so
  above-the-fold load sequences and staggered stat groups are expressible.
- `--fs-mega` mobile floor 15.5vw → 20vw (was bottoming out at 64px on a 390px screen).
- `tools/shoot.mjs` settle raised 900ms → 2800ms; it was photographing counters
  mid-flight ("604mg" instead of 610mg) and would have sent critics chasing ghosts.

## Open

| # | Issue | Owner |
|---|---|---|
| 1 | **Nav overflows horizontally at 390px** — right edge ~585px against a 390px viewport, pushing `document.scrollWidth` to 1425. `body { overflow-x: hidden }` hides it but it is real. | nav |
| 2 | **`#myth` mega stat "98" is clipped** — only the top ~60% of the digits renders; the `%` sits outside the mask and is fine. Its own mask is too short. Confirmed in `build-notes/shots/desktop/myth-mid.png`. | myth |
| 3 | `compare.js` fires ~14 `GSAP target [object NodeList] not found` warnings — raw `querySelectorAll` results resolving empty around lines 260–263. | compare |
| 4 | **`/media/still-texture-salt.png` HAS now rendered.** `formula` fell back to `/img/lemon-macro.png` (only 579×325). Swap the src — a monochrome salt macro suits the spec-sheet section far better and is full resolution. | formula |
| 5 | `compare.js` holds its own eyebrow/headline/lead/caption/legend/footnote strings inline, against brief rule 2. Move them into a `comparison.copy` block in `content.js` and consume from there. | compare |
| 6 | Hero does not listen for the preloader handoff. The preloader emits `preloader:lift` (curtain starts moving) and `preloader:done` (scroll released) on `document`, and mirrors state to `<html data-preloader>`. Hooking the hero reveal to `preloader:lift` turns two animations into one continuous gesture. | hero |
| 7 | `science` fires `countUp` from a pin trigger's `onUpdate` at progress 0.44, so the numbers run on their own clock instead of tracking scroll. A `countScrub()` helper in `reveal.js` would let them resolve exactly in step with the bars. | orchestrator → science |
| 8 | `START` (`top 82%`) can never fire for content at the very bottom of the document — the footer had to hand-roll offsets. Consider a lib helper for end-of-document reveals. | orchestrator |

## Environment note for every agent

The in-app Browser pane does **not** composite frames here: screenshots time out, `rAF`
is frozen, and non-scrubbed GSAP appears stuck at its from-state. That is the harness,
not your bug. Use `node tools/shoot.mjs --section <id> [--mobile]` and Read the PNGs.
