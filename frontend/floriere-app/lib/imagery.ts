// Concierge imagery bank + tag system.
//
// Goal: local florist-shop feel (hand-tied, kraft paper, market vibe) — not
// glossy catalog studio shots. Mood references each carry tags (palette, vibe,
// shape) used for Spotify-style similarity matching: user picks the 3 they
// like, we aggregate the tags, then suggest the closest match from the rest.

const BASE   = 'https://images.unsplash.com/photo-';
const SMALL  = '?auto=format&fit=crop&w=400&q=72';
const MEDIUM = '?auto=format&fit=crop&w=600&q=75';
const LARGE  = '?auto=format&fit=crop&w=900&q=80';

export const small  = (id: string) => `${BASE}${id}${SMALL}`;
export const medium = (id: string) => `${BASE}${id}${MEDIUM}`;
export const large  = (id: string) => `${BASE}${id}${LARGE}`;


// ─── Mood references — Spotify-style pick-3 ──────────────────────────────
export type MoodPalette = 'pastel' | 'vivid' | 'white' | 'monochrome' | 'warm' | 'cool' | 'earth';
export type MoodVibe    = 'rustic' | 'minimal' | 'luxe' | 'garden' | 'romantic' | 'wild' | 'modern';
export type MoodShape   = 'tight'  | 'airy'    | 'cascading' | 'compact';

export type MoodTags = {
  palette: MoodPalette[];
  vibe:    MoodVibe[];
  shape:   MoodShape[];
};

export type MoodRef = {
  id: string;
  name: string;
  blurb: string;
  image_id: string;
  tags: MoodTags;
};

// `tone` is a placeholder-tile hint (one of PlaceholderImage's tone keys).
// Replaces image_id while real Pak Khlong Talat-style photos are sourced.
export const MOOD_REFS: MoodRef[] = [
  { id: 'm-cottage',  name: 'Cottage rose',     blurb: 'Soft pinks, garden roses, a little wild.',
    image_id: '1561181286-d3fee7d55364',
    tags: { palette: ['warm', 'pastel'],    vibe: ['rustic', 'romantic', 'garden'], shape: ['airy'] }},
  { id: 'm-ivory',    name: 'Ivory linen',      blurb: 'All-white, sculptural, modern minimal.',
    image_id: '1494972308805-463bc619d34e',
    tags: { palette: ['white', 'monochrome'], vibe: ['minimal', 'luxe', 'modern'], shape: ['tight'] }},
  { id: 'm-blush',    name: 'Blush peony',      blurb: 'Pink peonies, romantic dinner energy.',
    image_id: '1565181917578-7180a32f8a7d',
    tags: { palette: ['pastel', 'warm'],     vibe: ['romantic', 'luxe'], shape: ['tight'] }},
  { id: 'm-tulip',    name: 'Tulip market',     blurb: 'Stacked tulips, fresh-from-the-market.',
    image_id: '1525310072745-f49212b5ac6d',
    tags: { palette: ['pastel', 'vivid'],    vibe: ['modern', 'minimal'], shape: ['tight'] }},
  { id: 'm-rusty',    name: 'Rusted garden',    blurb: 'Burnt orange + earth tones, autumnal.',
    image_id: '1606170033648-5d55a3edf314',
    tags: { palette: ['warm', 'earth'],      vibe: ['rustic', 'garden', 'wild'], shape: ['airy'] }},
  { id: 'm-red',      name: 'Red ribbon',       blurb: 'Classic red roses, bold and direct.',
    image_id: '1518895949257-7621c3c786d7',
    tags: { palette: ['vivid', 'warm'],      vibe: ['romantic', 'luxe'], shape: ['tight'] }},
  { id: 'm-sun',      name: 'Sunfield',         blurb: 'Sunflowers and bright daisies, friendly.',
    image_id: '1597848212624-a19eb35e2651',
    tags: { palette: ['vivid', 'warm'],      vibe: ['garden', 'rustic'], shape: ['airy'] }},
  { id: 'm-cloud',    name: 'Cloud bouquet',    blurb: "Baby's breath and whites, a soft cloud.",
    image_id: '1487530811176-3780de880c2d',
    tags: { palette: ['white', 'pastel'],    vibe: ['minimal', 'romantic'], shape: ['airy'] }},
  { id: 'm-line',     name: 'Tropic line',      blurb: 'Lilies + eucalyptus, sculptural greens.',
    image_id: '1565011523534-747a8601f10a',
    tags: { palette: ['cool', 'white'],      vibe: ['minimal', 'modern', 'wild'], shape: ['cascading'] }},
  { id: 'm-stem',     name: 'Single stem',      blurb: 'One statement bloom, monochrome.',
    image_id: '1520763185298-1b434c919102',
    tags: { palette: ['monochrome', 'vivid'], vibe: ['minimal', 'modern'], shape: ['tight'] }},
  { id: 'm-leaf',     name: 'Leaf & pepper',    blurb: 'Eucalyptus-heavy, green-led foliage.',
    image_id: '1610847499832-918a1c3c6811',
    tags: { palette: ['cool', 'earth'],      vibe: ['rustic', 'minimal', 'garden'], shape: ['airy'] }},
  { id: 'm-petal',    name: 'Petal pink',       blurb: 'Pink roses on cream paper, soft cool.',
    image_id: '1496062031456-07b8f162a322',
    tags: { palette: ['pastel', 'cool'],     vibe: ['romantic', 'minimal'], shape: ['compact'] }},

  // ── Pak Khlong Talat / Thai-market additions ──────────────────────────
  { id: 'm-jasmine',  name: 'Jasmine garland',  blurb: 'Thai jasmine strands, ceremonial and clean.',
    image_id: '1487530811176-3780de880c2d',
    tags: { palette: ['white', 'cool'],      vibe: ['minimal', 'rustic'], shape: ['cascading'] }},
  { id: 'm-marigold', name: 'Marigold offering', blurb: 'Hot orange marigolds — temple energy.',
    image_id: '1606170033648-5d55a3edf314',
    tags: { palette: ['vivid', 'warm'],      vibe: ['rustic', 'wild'], shape: ['tight'] }},
  { id: 'm-lotus',    name: 'Lotus river',      blurb: 'Pink lotus stems, quiet and ceremonial.',
    image_id: '1565181917578-7180a32f8a7d',
    tags: { palette: ['pastel', 'cool'],     vibe: ['minimal', 'luxe'], shape: ['tight'] }},
  { id: 'm-orchid',   name: 'Orchid hush',      blurb: 'Purple orchids — long-stem, dramatic.',
    image_id: '1565011523534-747a8601f10a',
    tags: { palette: ['cool', 'monochrome'], vibe: ['luxe', 'modern'], shape: ['cascading'] }},
  { id: 'm-monsoon',  name: 'Monsoon greens',   blurb: 'Heavy green, palm, soaked-leaf moodiness.',
    image_id: '1610847499832-918a1c3c6811',
    tags: { palette: ['cool', 'earth'],      vibe: ['wild', 'garden'], shape: ['cascading'] }},
  { id: 'm-bridal',   name: 'Bridal hand-tied', blurb: 'Compact white roses, calla, ribbon-wrapped.',
    image_id: '1494972308805-463bc619d34e',
    tags: { palette: ['white', 'pastel'],    vibe: ['luxe', 'romantic', 'minimal'], shape: ['compact'] }},
  { id: 'm-night',    name: 'Midnight velvet',  blurb: 'Deep burgundy, plum, almost-black blooms.',
    image_id: '1518895949257-7621c3c786d7',
    tags: { palette: ['monochrome', 'cool'], vibe: ['luxe', 'modern'], shape: ['tight'] }},
  { id: 'm-pastel',   name: 'Pastel meadow',    blurb: 'Mixed pastels — peach, lilac, butter yellow.',
    image_id: '1525310072745-f49212b5ac6d',
    tags: { palette: ['pastel', 'vivid'],    vibe: ['garden', 'romantic'], shape: ['airy'] }},
];

export function moodRefById(id: string): MoodRef | undefined {
  return MOOD_REFS.find((m) => m.id === id);
}


// ─── Palettes ───────────────────────────────────────────────────────────
export type PaletteId =
  | 'blush' | 'ivory' | 'ember' | 'sage' | 'midnight' | 'spring'
  | 'rosegold' | 'sunset' | 'noir' | 'jade' | 'lilac' | 'terracotta'
  | 'peach' | 'lavender' | 'ocean' | 'butter' | 'monsoon' | 'temple';

export type Palette = {
  id: PaletteId;
  label: string;
  blurb: string;
  swatches: string[];
  tags: MoodPalette[];
};

export const PALETTES: Palette[] = [
  { id: 'blush',      label: 'Blush',       blurb: 'Soft pinks, warm cream',         swatches: ['#F5D7D2', '#E8B6B2', '#C58F87'], tags: ['pastel', 'warm'] },
  { id: 'ivory',      label: 'Ivory',       blurb: 'Cream, ecru, oat',               swatches: ['#F8F2E6', '#EADFC8', '#C9B998'], tags: ['white', 'warm'] },
  { id: 'ember',      label: 'Ember',       blurb: 'Burnt red, ochre, terracotta',   swatches: ['#E76F51', '#C73838', '#7A1F1F'], tags: ['vivid', 'warm'] },
  { id: 'sage',       label: 'Sage',        blurb: 'Sage green, moss, forest',       swatches: ['#C8D5BB', '#7A8B6C', '#3F5742'], tags: ['cool', 'earth'] },
  { id: 'midnight',   label: 'Midnight',    blurb: 'Deep purple, navy, plum',        swatches: ['#5C3D7A', '#2C2333', '#A78AC9'], tags: ['cool', 'monochrome'] },
  { id: 'spring',     label: 'Spring',      blurb: 'Butter yellow, hot pink, sky',   swatches: ['#FFF2A8', '#FFBADD', '#9CD3E4'], tags: ['pastel', 'vivid'] },

  // ── extended set ──
  { id: 'rosegold',   label: 'Rose gold',   blurb: 'Champagne pink, dusted gold',    swatches: ['#F5D5C8', '#D9A48A', '#B8945D'], tags: ['warm', 'pastel'] },
  { id: 'sunset',     label: 'Sunset',      blurb: 'Hot pink, mango, ember',         swatches: ['#FFB07A', '#F26A6A', '#9C3A50'], tags: ['vivid', 'warm'] },
  { id: 'noir',       label: 'Noir',        blurb: 'Black, charcoal, oxblood',       swatches: ['#1C1A17', '#3A2A2A', '#7A1F1F'], tags: ['monochrome', 'cool'] },
  { id: 'jade',       label: 'Jade',        blurb: 'Deep emerald, jade, gold',       swatches: ['#1E5F4D', '#62A48B', '#D5B65A'], tags: ['cool', 'earth'] },
  { id: 'lilac',      label: 'Lilac',       blurb: 'Soft purples, dusty rose',       swatches: ['#D7C7E0', '#B89DCA', '#7E5E96'], tags: ['pastel', 'cool'] },
  { id: 'terracotta', label: 'Terracotta',  blurb: 'Clay, brick, ochre',             swatches: ['#D89B7A', '#B05E3C', '#6F2E1A'], tags: ['warm', 'earth'] },
  { id: 'peach',      label: 'Peach',       blurb: 'Peach, coral, melon',            swatches: ['#FFD9C0', '#FFAE8E', '#E08660'], tags: ['pastel', 'warm'] },
  { id: 'lavender',   label: 'Lavender',    blurb: 'Lavender, mist, cool grey',      swatches: ['#E0DAEC', '#B7A8D3', '#6F608F'], tags: ['pastel', 'cool'] },
  { id: 'ocean',      label: 'Ocean',       blurb: 'Teal, navy, salt-pale',          swatches: ['#CFE0E5', '#5C8C99', '#234A5B'], tags: ['cool', 'monochrome'] },
  { id: 'butter',     label: 'Butter',      blurb: 'Butter, lemon, cream',           swatches: ['#FCEFC1', '#F4D77A', '#C99E3A'], tags: ['pastel', 'warm'] },
  { id: 'monsoon',    label: 'Monsoon',     blurb: 'Heavy greens, slate, palm',      swatches: ['#7A8B6C', '#3F5742', '#222B26'], tags: ['cool', 'earth'] },
  { id: 'temple',     label: 'Temple',      blurb: 'Marigold orange, saffron, gold', swatches: ['#FFC857', '#E08020', '#8C4A12'], tags: ['vivid', 'warm'] },
];


// ─── Wrap / message formats ─────────────────────────────────────────────
export type FormatId = 'card' | 'wrap_stamp' | 'ribbon' | 'none';

export type FormatOption = {
  id: FormatId;
  label: string;
  blurb: string;
  image_id: string;
  maxChars: number;
  priceAddThb: number;
};

export const FORMATS: FormatOption[] = [
  {
    id: 'card', label: 'Folded gift card',
    blurb: 'Handwritten on cream stock, tied to the wrap.',
    image_id: '1565181917578-7180a32f8a7d', maxChars: 140, priceAddThb: 60,
  },
  {
    id: 'wrap_stamp', label: 'Stamp on kraft paper',
    blurb: 'A short word or two pressed into the wrap.',
    image_id: '1610847499832-918a1c3c6811', maxChars: 18, priceAddThb: 40,
  },
  {
    id: 'ribbon', label: 'Printed silk ribbon',
    blurb: 'A line printed on silk, tied around the wrap.',
    image_id: '1487530811176-3780de880c2d', maxChars: 36, priceAddThb: 90,
  },
  {
    id: 'none', label: 'No message',
    blurb: 'Send the flowers alone. Sometimes that says the most.',
    image_id: '1494972308805-463bc619d34e', maxChars: 0, priceAddThb: 0,
  },
];


// ─── Occasions & preset phrases ─────────────────────────────────────────
export const OCCASIONS = [
  'anniversary', 'apology', 'celebration', 'sympathy',
  'birthday', 'thank_you', 'just_because',
  'graduation', 'wedding', 'newborn', 'housewarming',
  'get_well', 'farewell',
  'other',
] as const;
export type Occasion = typeof OCCASIONS[number];

export const OCCASION_LABEL: Record<Occasion, string> = {
  anniversary:  'Anniversary',
  apology:      'Apology',
  celebration:  'Celebration',
  sympathy:     'Sympathy',
  birthday:     'Birthday',
  thank_you:    'Thank you',
  just_because: 'Just because',
  graduation:   'Graduation',
  wedding:      'Wedding',
  newborn:      'Newborn',
  housewarming: 'Housewarming',
  get_well:     'Get well',
  farewell:     'Farewell',
  other:        'Other',
};

export const SUGGESTED_PHRASES: Record<Occasion, string[]> = {
  anniversary: [
    'For another year of you.',
    'Twelve months. One you. Still.',
    'Same vow — new flowers.',
  ],
  apology: [
    "I'm sorry — I meant to do better.",
    'Forgive the wrong wording.',
    'For the day I should have shown up.',
  ],
  celebration: [
    'Cheers — to this moment.',
    'You did it. (Of course you did.)',
    'A small bloom for a big day.',
  ],
  sympathy: [
    'Holding you in mind.',
    'No words — just flowers.',
    'Thinking of you, gently.',
  ],
  birthday: [
    'Many happy returns.',
    'For the day you became.',
    'One year fuller. One year you-er.',
  ],
  thank_you: [
    'Thank you — truly.',
    "Some flowers, since words wouldn't.",
    "For what you did, and what you didn't need to.",
  ],
  just_because: [
    'No reason. Just you.',
    'A Tuesday bouquet.',
    'These reminded me of you.',
  ],
  graduation: [
    'You did the thing.',
    'Doctor / Master / Bachelor — all yours now.',
    'The first of many flowers, the last of many books.',
  ],
  wedding: [
    'To the start of forever.',
    'A bouquet for the day that becomes a memory.',
    'May the wedding be sweeter than the cake.',
  ],
  newborn: [
    'Welcome, small one.',
    'Tiny human, big bouquet.',
    "Hello, world's newest love.",
  ],
  housewarming: [
    'A bloom for the new walls.',
    "May the kitchen always smell of dinner.",
    "Make it home — flowers help.",
  ],
  get_well: [
    'A small bouquet, a big hope.',
    'Heal in your own time.',
    'Sending soft thoughts.',
  ],
  farewell: [
    'Until the next chapter.',
    "Wherever you're going — flowers say what we can't.",
    'See you on the other side.',
  ],
  other: [
    'For you, on this day.',
    'A bloom that means what you mean.',
    'Some flowers — because.',
  ],
};


// ─── Hero + generic fallbacks ───────────────────────────────────────────
export const HERO_IMAGE_ID     = '1561181286-d3fee7d55364';
export const GENERIC_BOUQUET_ID = '1561181286-d3fee7d55364';

export const heroImage      = () => large(HERO_IMAGE_ID);
export const genericBouquet = () => medium(GENERIC_BOUQUET_ID);


// ─── Tag bag + similarity ───────────────────────────────────────────────
export type TagBag = {
  palette: Record<string, number>;
  vibe:    Record<string, number>;
  shape:   Record<string, number>;
};

function bumpBag(bag: TagBag, tags: MoodTags, weight = 1): void {
  for (const t of tags.palette) bag.palette[t] = (bag.palette[t] ?? 0) + weight;
  for (const t of tags.vibe)    bag.vibe[t]    = (bag.vibe[t]    ?? 0) + weight;
  for (const t of tags.shape)   bag.shape[t]   = (bag.shape[t]   ?? 0) + weight;
}

export function aggregateMoodTags(refIds: string[]): TagBag {
  const bag: TagBag = { palette: {}, vibe: {}, shape: {} };
  for (const id of refIds) {
    const ref = moodRefById(id);
    if (!ref) continue;
    bumpBag(bag, ref.tags);
  }
  return bag;
}

export function addPaletteToBag(bag: TagBag, paletteId: PaletteId, weight = 1): TagBag {
  const p = PALETTES.find((x) => x.id === paletteId);
  if (!p) return bag;
  for (const t of p.tags) bag.palette[t] = (bag.palette[t] ?? 0) + weight;
  return bag;
}

// Score a candidate MoodRef against the user's tag bag — sum of bag weights
// for each matching tag (palette weighted 2, vibe 3, shape 1).
export function scoreRef(ref: MoodRef, bag: TagBag): number {
  let score = 0;
  for (const t of ref.tags.palette) score += 2 * (bag.palette[t] ?? 0);
  for (const t of ref.tags.vibe)    score += 3 * (bag.vibe[t]    ?? 0);
  for (const t of ref.tags.shape)   score += 1 * (bag.shape[t]   ?? 0);
  return score;
}

// Pick the highest-scoring MoodRef NOT in `excludeIds`.
export function bestMatch(bag: TagBag, excludeIds: string[] = []): MoodRef {
  const candidates = MOOD_REFS.filter((r) => !excludeIds.includes(r.id));
  let best = candidates[0];
  let bestScore = -1;
  for (const r of candidates) {
    const s = scoreRef(r, bag);
    if (s > bestScore) { best = r; bestScore = s; }
  }
  return best;
}
