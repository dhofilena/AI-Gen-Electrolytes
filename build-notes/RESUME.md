# Electrolyte Breakthrough lander — PASSED (round 9)

Final blind review ranked it **1st against both Polestar 3 and Oura Ring 4** — whole page
and opening viewport. 15 pieces, 9 rounds, ~30 agents.

```bash
npm run dev          # http://localhost:5273
```
Live build board: http://localhost:5273/progress.html

## Verification toolkit

Each of these exists because a real defect got past a screenshot. Run them before
believing any section is finished.

```bash
node tools/shoot.mjs [--mobile] [--section id] [--sweep]   # headless Chromium captures
node tools/shoot-at.mjs <section> 0.2 0.5 0.8 [--mobile]   # pinned sections at chosen progress
node tools/shoot-ref.mjs                                    # re-capture Oura / Polestar
node tools/check-reveals.mjs [--mobile]                     # does every section actually reveal
node tools/check-loop.mjs                                   # video loops frozen on a still frame
node tools/find-overflow.mjs [--mobile]                     # names overflow offenders by section
node tools/check-seams.mjs [--mobile]                       # >90px voids, attributed to a boundary
node tools/check-triggers.mjs                               # ScrollTrigger geometry (heuristic)
node tools/crit-wheel2.mjs                                  # pins under REAL wheel input
node tools/crit-contrast.mjs                                # composited text-on-film contrast
```

**The in-app Browser pane does not composite frames in this environment** — screenshots
time out and rAF is frozen. Everything visual goes through the headless harness.

**Pins must be tested with real `page.mouse.wheel`.** `lenis.scrollTo({immediate:true})`
masks an entire bug class — one section was engaging while its own top was still 1261px
below the fold and programmatic scroll never showed it.

## Media pipeline

```bash
node tools/media.mjs status | submit | poll | recover
node tools/optimize-media.mjs          # poster JPGs + web-weight re-encode (~70% smaller)
node tools/reset-asset.mjs <name> "new prompt" [--fast]
```
`submit` and `poll` are deliberately separate: `higgsfield --wait` dies on a transient 503
while the render continues server-side, orphaning paid jobs. `recover` re-attaches orphans
by prompt match — it already saved 9 jobs (~291 credits).

12 assets on disk: hero-dissolve, 3 flavour plumes, cellular, ritual-pour, athlete-breath,
3 stills, and 3 product shots. Credits: 1378 of 1812 used at pass.

## Traps that cost a round each — do not re-spring

1. **`.line-mask` padding and `reveal.js` yPercent are one system.** Padding rescues
   descenders from the clip; yPercent must clear it (128, not 100). Tune only via
   `--mask-rescue`; setting `padding-bottom` or `margin-bottom` alone shears glyphs.
2. **`--*-faint` (alpha 0.34) is ornament-only.** It measures 2.0–2.8:1. No `color:`
   declaration anywhere may use it. It leaked onto the FDA disclaimer, 7 of 8 claim
   bodies, chart axis labels and the comparison table's direction legend across
   three separate rounds.
3. **Stacking contexts.** A parent with `z-index: 0` traps children's z-index. This bit
   twice — the nav scrim painted over the CTA (2.28:1 on the primary action), and
   `.flv__col--film` trapped the inset below its scrim.
4. **Contrast harnesses lie in three ways**: regex-scraping `getComputedStyle().color`
   (returns `oklab()`), toggling glyphs transparent (re-triggers 620ms colour
   transitions, catching text mid-fade), and counting antialiased edge pixels. Resolve
   colours through a canvas, suppress transitions, and confirm findings two ways.
5. **`window.gsap` is not exposed** (only `__lenis` and `ScrollTrigger`), so
   `gsap.ticker.sleep()` silently no-ops and the vloop timer keeps calling `play()`.
6. **Capture settle must outlast the longest entrance** (countUp is 1.9s). A 900ms wait
   photographed "604mg" instead of 610mg.

## Integrity constraints — permanent, verified by four independent audits

- **No fabricated social proof.** No verifiable reviews exist for this product. The
  review slot in `proof.js` is explicitly empty and commented. Never fill it with
  placeholder people.
- **Prices**: only $40 regular, $32 sale, 20% off, subscribe-save 12%, free shipping
  over $99. Bundle tiers scraped inconsistently and are excluded.
- **Per-ingredient amounts**: only potassium 610mg and sodium 200mg are verified. No
  %DV anywhere — `formula` defers honestly to the printed Supplement Facts panel.
- **Claim wording frozen.** The 8 benefit titles/bodies must match `content.js`
  character-for-character; "supports" never becomes "boosts"/"improves".
- **Comparison encoding must stay honest.** Sodium is lower-is-better; Ultima genuinely
  beats us on electrolytes-listed (6 vs 5) and sodium (55mg) and is marked best on both.
  All 42 figures verbatim.
- **FDA disclaimer** near the claims at ≥4.5:1 (currently 4.60–4.94).
- The `#offer` product image is **unbranded** — we do not have the real packaging and a
  plausible fake label would put invented branding on screen.

## Known, judged non-blocking

- Worst-pixel-over-moving-film contrast on `.hero__tag` (4.48 worst / 5.00–6.87 median),
  `.myth__claim` (1.56 worst / 5.18 median), `.myth__eyebrow`, mobile `.flv__eyebrow`.
  Medians pass; these are transient single frames as bright plume crosses behind text.
- Science counter steps 596 → 610 during its scrub; settles exactly on 610/200.
