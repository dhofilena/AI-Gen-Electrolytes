# THE BRIEF — read this fully before writing a line

You are building one section of a premium scroll-animated product lander for
**BIOptimizers Electrolyte Breakthrough**. The bar is the **Oura Ring 4 store page**
and the **Polestar 3 site**. Not "nice startup landing page" — that bar. Anything that
would look ordinary next to those two is a failure.

---

## 1. NON-NEGOTIABLE RULES

1. **Never hardcode a colour, font-size, easing, or duration.** Everything comes from
   `src/styles/tokens.css` via `var(--…)`. If you need a value that does not exist,
   it belongs in tokens, not in your file. Hardcoded hex = automatic rejection.
2. **Never hardcode product copy.** Import from `src/data/content.js`. Numbers like
   610mg / 200mg / 3:1 / 98% / 365 are factual claims from the real product page —
   never invent, round, or embellish them.
3. **You own exactly two files**: `src/sections/<piece>.js` and
   `src/styles/sections/<piece>.css`. Do not edit other sections, tokens.css,
   base.css, main.js, index.html, or the lib/. If you genuinely need a shared change,
   write it in your report instead of doing it.
4. **Use the shared motion vocabulary** from `src/lib/reveal.js`
   (`revealLines`, `revealRise`, `revealMedia`, `parallax`, `countUp`, `autoplayInView`).
   Do not invent new easings or durations. Coherence across sections comes from
   everyone using the same curves.
5. **Respect `prefers-reduced-motion`.** The helpers already do; if you write raw GSAP,
   guard it with the exported `prefersReducedMotion`.
6. Your module exports `export default function mount(root) { … }` and renders its own
   markup into `root`. `root` is the `<section>` already in `index.html`.

---

## 2. THE AESTHETIC — what "Oura / Polestar level" actually means

**Space.** The single biggest difference between premium and ordinary is emptiness.
Sections breathe. Big type sits in a lot of nothing. Never fill a viewport just
because it is there. If in doubt, remove an element and add space.

**Type.** Neue Haas Unica, two weights only (400/700).
- Display type is **huge, tight, and negatively tracked** — `--fs-display` / `--fs-mega`
  with `--lh-display` and `--ls-display`. A 120px headline at 0.88 line-height reads
  expensive; the same words at 48px/1.4 read like a template.
- Body copy is **small, quiet, and narrow** (`--fs-body`, max ~62ch, `--fg-mute`).
  The contrast between enormous display and small quiet body *is* the luxury signal.
- Eyebrows are 11px, uppercase, `.16em` tracked, faint.
- Numbers use `.num` (tabular figures). Always.

**Colour.** The page is mostly deep ink and bone. Brand colour is used like light —
sparingly, as accent, never as large flat fills except where a flavour owns the frame.
Dark sections dominate; light sections are palate cleansers. Never put more than one
saturated brand colour in the same viewport unless the section is explicitly the
flavour section.

**Media.** Full-bleed, cinematic, dark. Video is the hero of a section, not decoration.
Everything is `object-fit: cover`, never letterboxed. Media reveals via curtain-wipe
(`revealMedia`) with a subtle inner scale-down — never a fade-in from nothing.

**Motion.** Slow, weighted, expensive. Nothing bounces. Nothing springs. Nothing
"pops in". The house curve is `expo.out`. Entrances are 0.95–1.35s, staggered
0.07–0.09s. Scrubbed scroll animations are `ease: 'none'` and tied to real scroll
distance. Parallax is subtle — 10% maximum, ever.

**Restraint.** No drop shadows on text. No glassmorphism. No gradient text. No emoji.
No rounded-everything. No generic SaaS cards with 16px radius and a border. If it
looks like Tailwind defaults, it is wrong.

---

## 3. THE SCROLL FEEL

Lenis is already running (duration 1.15, expo easing). Your section should feel like it
is *revealed by* scrolling, not merely scrolled past. Techniques, in rough order of value:

- **Pinned progression** — pin the section, drive a multi-state narrative with a scrubbed
  timeline. Best for science / comparison / flavour. Use `ScrollTrigger` `pin: true` with
  `scrub: true` and a generous `end` (e.g. `'+=' + window.innerHeight * 2`).
- **Masked line reveals** on every headline — `revealLines()`.
- **Scrubbed media** — video `currentTime` or transform tied to scroll progress.
- **Counters** that resolve as the stat enters — `countUp()`.
- **Layered parallax** between background media and foreground type.

Pinning is powerful and expensive. Not every section should pin — if all 15 pin, the page
becomes exhausting. Pin only if your section genuinely has a sequence to tell.

---

## 4. THE ASSETS

Live in `public/`. Reference with absolute paths (`/media/…`, `/img/…`).

**Provided brand photography** (`/img/`):
| file | what |
|---|---|
| `athlete-heather.png` | fit blonde woman, navy activewear, holding bottle, **transparent bg** |
| `drinking-closeup.png` | woman drinking from orange bottle, sunlit, **transparent bg** |
| `berry-macro.png` | raspberry in soda, deep red, extreme macro |
| `lemon-macro.png` | lemon slice + bubbles, yellow, wide macro |
| `peach-macro.png` | peach/orange slices + bubbles, warm |

The two transparent PNGs are cut-outs — compose them over colour or video, never on a
plain white box.

**Higgsfield-generated film** (`/media/`) — check `tools/media.manifest.json` for what has
landed; assets appear as they finish rendering:
| file | what |
|---|---|
| `hero-dissolve.mp4` | golden powder plume dissolving in water on black, 16:9 — the hero |
| `flavor-lemonade.mp4` / `flavor-tropical.mp4` / `flavor-berry.mp4` | same language, per-flavour colour, **9:16 vertical** |
| `cellular.mp4` | abstract ions entering a glowing cell membrane, 16:9 |
| `ritual-pour.mp4` | pour into a glass, morning light, 16:9 |
| `athlete-breath.mp4` | woman drinking after training, 16:9 |
| `still-hero-glass.png`, `still-texture-salt.png`, `still-athlete-calm.png` | stills |

**If your asset has not rendered yet**, build against it anyway with the correct path and a
`poster`/background-colour fallback so the layout is final. Do not redesign around a
missing file, and do not substitute a placeholder image service.

Video hygiene, every time:
```html
<video class="fill" src="/media/x.mp4" muted playsinline loop preload="metadata" poster="…"></video>
```
and drive playback with `autoplayInView(el)` so offscreen video does not burn GPU.

---

## 5. CODE SHAPE

```js
import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/scroll.js';
import { revealLines, revealRise, revealMedia, autoplayInView, START, EASE } from '../lib/reveal.js';
import { science } from '../data/content.js';

export default function mount(root) {
  root.innerHTML = `
    <div class="wrap">…</div>
  `;

  const q = (s) => root.querySelector(s);

  revealLines(q('.sci__head'));
  revealRise(root.querySelectorAll('.sci__item'));

  // section-specific scroll choreography …
}
```

CSS is plain, scoped by a section prefix (`.sci__…`). No preprocessor, no utility classes.
Mobile matters: every section must be genuinely designed at 390px wide, not just "not
broken". Pinned sequences usually need to degrade to a simple stacked reveal under 860px —
do that deliberately with `ScrollTrigger.matchMedia()` or a width guard.

---

## 6. REPORTING

When done, write `build-notes/status/<piece>.json`:

```json
{ "phase": "review", "round": 1, "note": "one line on what you built" }
```

Then reply with: what you built, the scroll choreography in 2–3 sentences, anything you
had to leave undone, and any shared-file change you wanted but did not make.

**Verify before you report.** The dev server runs at `http://localhost:5273`.

**The in-app Browser pane does NOT composite frames in this environment — its
screenshots time out and `requestAnimationFrame` is paused. Do not rely on it to see
anything.** Use the headless capture harness instead, which drives a real Chromium:

```bash
node tools/shoot.mjs --section <yourPiece>     # desktop 1440x900
node tools/shoot.mjs --section <yourPiece> --mobile   # 390x844
```

Images land in `build-notes/shots/<desktop|mobile>/<piece>.png` — **open them with the
Read tool and actually look at your work.** The harness also writes `_report.json` with
every console error and a horizontal-overflow check, and prints both to stdout.

**The rest of the verification toolkit.** Each exists because a real defect shipped past
a screenshot:

| command | catches |
|---|---|
| `node tools/find-overflow.mjs [--mobile]` | names the elements causing horizontal overflow, by section (`body{overflow-x:hidden}` hides the symptom) |
| `node tools/check-loop.mjs` | a `seamlessLoop` video frozen on a still frame — scrolls each host into view and samples the visible layer over time |
| `node tools/check-reveals.mjs [--mobile]` | content that never becomes visible: parks in each section and counts hidden elements, excluding things meant to be hidden (crossfade back-layers, closed accordion panels, inactive tab panels) |
| `node tools/check-triggers.mjs` | ScrollTrigger start positions vs real element positions. **Heuristic — expect false positives** for legitimate start strings; use `check-reveals` for ground truth |
| `tools/crit-scrub.mjs`, `crit-wheel2.mjs`, `crit-swap.mjs`, `crit-contrast.mjs` | left by critics: walk a pinned range, real-wheel pin test with early-pin/gap/overlap assertions, catch a configurator crossover mid-flight, composited text-on-film contrast |

**Pinned sections must be tested with real `page.mouse.wheel` input.** `lenis.scrollTo({immediate:true})`
masks an entire class of pin bug — one section was engaging while its own top was still
1261px below the fold, and programmatic scroll never showed it.

A section that throws is worse than a section that is plain. A section nobody has looked
at is not finished.
