/* ============================================================
   ENTRY — mounts every section module against its <section>.
   Adding a section: create src/sections/<name>.js exporting
   `export default function mount(root) {}`, add its CSS import
   below, and add a <section data-module="<name>"> in index.html.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';

import './styles/sections/preloader.css';
import './styles/sections/nav.css';
import './styles/sections/hero.css';
import './styles/sections/myth.css';
import './styles/sections/science.css';
import './styles/sections/pillars.css';
import './styles/sections/formula.css';
import './styles/sections/flavors.css';
import './styles/sections/ritual.css';
import './styles/sections/compare.css';
import './styles/sections/benefits.css';
import './styles/sections/proof.css';
import './styles/sections/offer.css';
import './styles/sections/faq.css';
import './styles/sections/footer.css';

import { initScroll, refreshWhenReady, ScrollTrigger } from './lib/scroll.js';

const modules = import.meta.glob('./sections/*.js');

async function boot() {
  initScroll();

  const nodes = [...document.querySelectorAll('[data-module]')];

  await Promise.all(
    nodes.map(async (node) => {
      const name = node.dataset.module;
      const loader = modules[`./sections/${name}.js`];
      if (!loader) {
        console.warn(`[boot] no module for "${name}"`);
        return;
      }
      try {
        const mod = await loader();
        if (typeof mod.default === 'function') mod.default(node);
      } catch (err) {
        console.error(`[boot] "${name}" failed to mount`, err);
      }
    })
  );

  /* Pin geometry is order-dependent and fragile with MULTIPLE pinned sections
     (#myth and #science both pin). If section A's trigger caches its start
     before section B inserts its pin-spacer above it, A's start is stale by
     the height of B's spacer — which showed up as science slamming over myth
     ~2 runs in 3, or parking after two viewports of void.
     ScrollTrigger.sort() re-orders by document position, and refreshing across
     several frames lets every spacer exist before positions are finalised. */
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  requestAnimationFrame(() => {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    document.documentElement.classList.add('is-ready');
  });

  refreshWhenReady();
}

boot();
