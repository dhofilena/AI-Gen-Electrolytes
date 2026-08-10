/* ============================================================
   CONTENT MODEL — single source of truth for all copy + data.
   Sourced from bioptimizers.com/shop/products/electrolyte-breakthrough-packet
   Sections import from here. Never hardcode product copy in a section.
   ============================================================ */

export const product = {
  brand: 'BIOptimizers',
  name: 'Electrolyte Breakthrough',
  tagline: 'Full-Spectrum Hydration & Electrolyte Support',
  priceRegular: 40.0,
  priceSale: 32.0,
  discountPct: 20,
  subscribeSavePct: 12,
  guaranteeDays: 365,
  freeShipOver: 99,
  servingSize: '1 scoop in 16 oz water',
  disclaimer:
    'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
};

export const flavors = [
  {
    id: 'lemonade',
    name: 'Thrive Lemonade',
    short: 'Lemonade',
    note: 'Bright. Clean. Electric.',
    desc: 'Real lemon botanicals with a crisp finish — the one that wakes the whole system up.',
    hex: '#F9ED7F',
    accentVar: '--lemonade',
    img: '/img/lemon-macro.png',
    video: '/media/flavor-lemonade.mp4',
    poster: '/media/flavor-lemonade.jpg',
    /* Real BIOptimizers packaging, supplied by the client. `packet` is the
       transparent cut-out; `shot` is the composed hero render built from it. */
    packet: '/img/packet-lemonade.png',
    shot: '/media/shot-lemonade.jpg',
  },
  {
    id: 'tropical',
    name: 'Tropical Bliss',
    short: 'Tropical',
    note: 'Warm. Round. Sun-soaked.',
    desc: 'Stone fruit and citrus, softened — the easy daily pour you never get tired of.',
    hex: '#F89D72',
    accentVar: '--tropical',
    img: '/img/peach-macro.png',
    video: '/media/flavor-tropical.mp4',
    poster: '/media/flavor-tropical.jpg',
    packet: '/img/packet-tropical.png',
    shot: '/media/shot-tropical.jpg',
  },
  {
    id: 'berry',
    name: 'Balanced Berry',
    short: 'Berry',
    note: 'Deep. Tart. Grounded.',
    desc: 'Dark berries with real acidity — structured, never candied, never cloying.',
    hex: '#921A4A',
    accentVar: '--berry',
    img: '/img/berry-macro.png',
    video: '/media/flavor-berry.mp4',
    poster: '/media/flavor-berry.jpg',
    packet: '/img/packet-berry.png',
    shot: '/media/shot-berry.jpg',
  },
];

/* PDP GALLERY — the shared brand slides that follow the flavour pack shot in
   the #offer carousel. These are real BIOptimizers marketing assets supplied
   by the client, not generated.

   Any file that is not on disk is dropped at runtime rather than rendered as a
   broken slide, so the gallery degrades to whatever is actually present. Drop
   the artwork into public/img/ under these names to light each one up. */
export const gallery = [
  {
    src: '/img/pdp-missing.webp',
    alt: "What your hydration has been missing: a 3:1 potassium-to-sodium ratio, 5 essential electrolytes, 4 forms of bioavailable magnesium, and 9+ trace minerals, zinc and MSM.",
    label: "What's inside",
  },
  {
    src: '/img/pdp-facts.webp',
    alt: 'Supplement Facts panel for Thrive Lemonade, Balanced Berry and Tropical Bliss. Serving size 1 stick packet (6.72 g), 4 servings per container. Potassium 610 mg, chloride 690 mg, sodium 210 mg, magnesium 50 mg, calcium 40 mg, plus niacin, vitamins B6 and B12, zinc, copper, manganese, chromium, molybdenum, ionic trace minerals and OptiMSM.',
    label: 'Supplement Facts',
  },
  {
    src: '/img/pdp-natural.webp',
    alt: 'Nothing artificial, nothing unnecessary: clean natural sweetness, no added sugar, sugar alcohols, stevia or maltodextrin, sweetened with plant-derived proteins, heavy metal tested.',
    label: 'Nothing artificial',
  },
  {
    src: '/img/pdp-dissolves.webp',
    alt: 'Dissolves quickly — mixes clear in seconds.',
    label: 'Dissolves fast',
  },
  {
    src: '/img/pdp-daypart.webp',
    alt: 'Hydration for every part of your day: morning to start refreshed, afternoon to stay steady, evening to rest replenished, anytime to feel amazing.',
    label: 'Any time of day',
  },
];

/* The narrative spine of the page. */
export const thesis = {
  eyebrow: 'The Big Sodium Myth',
  headline: 'Most hydration drinks are solving the wrong problem.',
  body:
    'The category loaded up on sodium — some deliver nearly half your daily value in a single glass. But Americans are not short on sodium. About 98% do not get enough potassium, the electrolyte that actually pulls water inside the cell.',
  stat: { value: 98, unit: '%', label: 'of Americans do not get enough potassium' },
};

export const cellScience = {
  eyebrow: 'Inside the cell',
  headline: 'Potassium is where hydration actually happens.',
  body:
    'Potassium is the number one electrolyte found inside your cells. When there is enough of it, your cells hold the water they need — like a sponge. Sodium manages fluid outside the cell. You need both, in the right proportion.',
  ratio: { potassium: 610, sodium: 200, label: '3:1 potassium-to-sodium' },
};

export const pillars = [
  { n: '5', label: 'Electrolytes', sub: 'Potassium, sodium, magnesium, calcium, chloride' },
  { n: '4', label: 'Forms of magnesium', sub: 'Citrate, glycinate, malate, taurate' },
  { n: '12', label: 'Vitamins & minerals', sub: 'Bioactive B vitamins, zinc, manganese and more' },
  { n: '9', label: 'Trace minerals', sub: 'Full-spectrum ionic trace complex' },
];

export const zeroes = [
  { k: '0g', v: 'added sugar' },
  { k: '0g', v: 'stevia' },
  { k: '0g', v: 'maltodextrin' },
  { k: '0mg', v: 'caffeine or stimulants' },
];

export const benefits = [
  {
    id: 'hydration',
    title: 'Whole-body hydration',
    body:
      'A 3:1 potassium-to-sodium ratio designed to support balanced hydration, and replenish what sweat takes out.',
  },
  {
    id: 'performance',
    title: 'Physical performance',
    body:
      'Supports normal muscle function and recovery after activity, and normal nerve-to-muscle communication.',
  },
  {
    id: 'cellular',
    title: 'Cellular balance',
    body: 'Supports healthy electrolyte balance and proper fluid balance inside and outside your cells.',
  },
  {
    id: 'energy',
    title: 'Energy metabolism',
    body: 'Bioactive B vitamins that contribute to cellular energy metabolism — without stimulants.',
  },
  {
    id: 'heart',
    title: 'Cardiovascular support',
    body: 'Supports healthy heart muscle function and normal electrical activity in the heart.',
  },
  {
    id: 'nervous',
    title: 'Nervous system',
    body: 'Electrolytes contribute to normal nerve signaling and normal nervous system function.',
  },
  {
    id: 'bone',
    title: 'Bone health',
    body: 'Calcium, zinc and manganese contribute to normal bone structure and development.',
  },
  {
    id: 'immune',
    title: 'Immune support',
    body: 'Provides zinc and vitamin B6 to support normal immune system function.',
  },
];

/* Competitor comparison — verbatim figures from the source page.
   `copy` holds every string the compare section renders, so the section
   file hardcodes no product copy. `{token}` placeholders are filled from
   the data itself (row/brand counts) — never hand-typed. */
export const comparison = {
  copy: {
    eyebrow: 'Label vs. label',
    headline: 'Every number, in the open.',
    /* Do NOT reinstate "sodium, where the whole category runs high" here.
       Ultima lists 55mg — a quarter of ours — in the table directly below,
       so that phrasing softened the one line where a competitor beats us
       while the table itself stayed honest. The framing has to match the data. */
    lead:
      '{metrics} metrics across {labels} labels, taken from what each brand prints on its own package. More is better on every line but one — sodium, where less is better and the field runs from 55mg to 1,000mg.',
    caption: 'Amounts per serving, as listed on each label',
    corner: 'Per serving',
    dirHigh: 'More is better',
    dirLow: 'Less is better',
    dirBool: '{yes} of {total}',
    legendScale: 'Bar length is the listed amount, scaled to the highest figure on that line.',
    legendTicked: 'Ticked bars run right to left: on sodium, less is better.',
    note:
      'Figures are the amounts each brand lists on its own published label for a single serving. Formulations and label claims change over time — check the current package. Brand names are the property of their respective owners; this comparison is for information only.',
  },
  rows: [
    { key: 'electrolytes', label: 'Electrolytes listed', unit: '', better: 'high' },
    { key: 'kForms', label: 'Potassium forms', unit: '', better: 'high' },
    { key: 'potassium', label: 'Potassium', unit: 'mg', better: 'high' },
    { key: 'ratio', label: '3:1 K:Na ratio', unit: '', better: 'bool' },
    { key: 'sodium', label: 'Sodium', unit: 'mg', better: 'low' },
    { key: 'mgForms', label: 'Magnesium forms', unit: '', better: 'high' },
    { key: 'trace', label: 'Trace minerals', unit: '', better: 'high' },
  ],
  brands: [
    {
      name: 'Electrolyte Breakthrough',
      us: true,
      electrolytes: 5, kForms: 3, potassium: 610, ratio: true, sodium: 200, mgForms: 4, trace: 9,
    },
    { name: 'LMNT', electrolytes: 3, kForms: 1, potassium: 200, ratio: false, sodium: 1000, mgForms: 1, trace: 0 },
    { name: 'Liquid I.V.', electrolytes: 2, kForms: 1, potassium: 370, ratio: false, sodium: 530, mgForms: 0, trace: 0 },
    { name: 'Ultima', electrolytes: 6, kForms: 2, potassium: 250, ratio: false, sodium: 55, mgForms: 1, trace: 2 },
    { name: 'Re-Lyte', electrolytes: 4, kForms: 1, potassium: 400, ratio: false, sodium: 810, mgForms: 1, trace: 1 },
    { name: 'Pedialyte', electrolytes: 3, kForms: 1, potassium: 280, ratio: false, sodium: 390, mgForms: 0, trace: 1 },
  ],
};

export const formula = {
  eyebrow: 'The formula',
  headline: 'Three years. Hundreds of formulas.',
  body:
    'Our BIO Lab team spent three years testing hundreds of formulations to build a drink designed to support balanced, whole-body hydration — not just a salt hit.',
  sweeteners: {
    title: 'Sweetened with monk fruit and thaumatin',
    body: 'Two plant proteins instead of stevia. No bitterness, no chemical aftertaste, no maltodextrin bulking agent.',
  },
  ingredients: [
    'Niacin (as niacinamide)',
    'Vitamin B6 (as pyridoxal-5-phosphate)',
    'Vitamin B12 (as methylcobalamin)',
    'Calcium (as calcium bisglycinate)',
    'Magnesium (citrate, glycinate, malate, taurate)',
    'Zinc (as zinc picolinate)',
    'Copper (as copper bisglycinate chelate)',
    'Manganese (as manganese citrate)',
    'Chromium (as chromium picolinate)',
    'Molybdenum (as molybdenum glycinate)',
    'Chloride (from potassium chloride, sea salt)',
    'Sodium (from sea salt)',
    'Potassium (aspartate, chloride, gluconate)',
    'Ionic Trace Minerals',
    'OptiMSM® (methylsulfonylmethane)',
  ],
  certs: ['GMP Certified', 'COA Certified', 'Heavy-metal tested', 'Vegan', 'Keto friendly', 'Non-GMO'],
};

export const faqs = [
  {
    q: 'When should I drink Electrolyte Breakthrough?',
    a: 'Anytime through your day — morning, afternoon or evening. One serving daily is the standard recommendation.',
  },
  {
    q: 'Why does it have more potassium than other hydration drinks?',
    a: 'Potassium maintains fluid inside your cells; sodium maintains fluid outside them. Together they regulate hydration and fluid balance. Most people in America already consume too much sodium and not enough potassium, so we built the ratio around the deficit rather than the excess.',
  },
  {
    q: 'Will it break my fast?',
    a: 'It contains no added sugar and provides electrolytes without significant calories. Many people use it while fasting, though individual fasting practices vary.',
  },
  {
    q: 'Is it good for low carb and keto diets?',
    a: 'Yes. There is no added sugar, and it suits low carb and keto lifestyles — where maintaining electrolyte balance matters even more.',
  },
  {
    q: 'Does it contain caffeine or stimulants?',
    a: 'No. There is no caffeine and no stimulant ingredients. It does include B vitamins, which play a role in normal energy metabolism.',
  },
  {
    q: 'How does it taste?',
    a: 'Sweetened with monk fruit and thaumatin rather than stevia, so there is no bitter finish. It dissolves quickly with no gritty residue.',
  },
];

/* Both figures are stated on the source product page: the BIO Lab team spent
   three years testing hundreds of formulations, and the page cites 18
   peer-reviewed studies. Kept here so no section hardcodes them.

   `referencesNote` exists because asserting a citation count without surfacing
   the citations is worse than not claiming it — this build does not reproduce
   the 18 studies, so the claim must say where they actually live. */
export const research = {
  years: 3,
  references: 18,
  formulations: 'Hundreds',
  referencesNote: 'Cited on the product page at bioptimizers.com',
};

/* Attribution for the page's single largest statistic. A 98% figure set at
   400px with no source, on a page that is otherwise scrupulous about
   sourcing, is the one place a reader would reasonably ask "says who?". */
export const sources = {
  potassiumShortfall: 'Figure as stated by BIOptimizers on the Electrolyte Breakthrough product page.',
};

export const guarantee = {
  days: 365,
  title: '365-day money-back guarantee',
  body:
    'Try it risk-free for a full year. If you are not completely satisfied for any reason, send back your remaining unopened product within 365 days and we will refund your purchase price, minus shipping and handling.',
};

export const nav = [
  { label: 'The myth', href: '#myth' },
  { label: 'Science', href: '#science' },
  { label: 'Formula', href: '#formula' },
  { label: 'Flavors', href: '#flavors' },
  { label: 'Compare', href: '#compare' },
  { label: 'FAQ', href: '#faq' },
];
