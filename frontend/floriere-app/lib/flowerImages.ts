// Real flower photographs keyed by `flowers.illustration` + color.
// Replaces the SVG FlowerArt for product imagery — the SVG stays as a
// final fallback when neither kind nor color matches.

const BASE = 'https://images.unsplash.com/';
const SMALL = '?auto=format&fit=crop&w=400&q=70';
const LARGE = '?auto=format&fit=crop&w=900&q=80';

type ColorMap = Record<string, { id: string }>;

// Each entry: kind -> color -> photo ID (Unsplash CDN photo-<id>).
// IDs picked from stable Unsplash CDN photos (single-stem or close-up).
const PHOTOS: Record<string, ColorMap> = {
  rose: {
    red:    { id: '1518895949257-7621c3c786d7' },
    white:  { id: '1494972308805-463bc619d34e' },
    pink:   { id: '1496062031456-07b8f162a322' },
  },
  tulip: {
    pink:   { id: '1525310072745-f49212b5ac6d' },
    yellow: { id: '1606170033648-5d55a3edf314' },
    red:    { id: '1520763185298-1b434c919102' },
  },
  lily:        { white:  { id: '1565011523534-747a8601f10a' } },
  sunflower:   { yellow: { id: '1597848212624-a19eb35e2651' } },
  peony:       { blush:  { id: '1565181917578-7180a32f8a7d' },
                 pink:   { id: '1565181917578-7180a32f8a7d' } },
  eucalyptus:  { green:  { id: '1610847499832-918a1c3c6811' } },
  babys_breath:{ white:  { id: '1487530811176-3780de880c2d' } },
  generic:     { default:{ id: '1561181286-d3fee7d55364' } },
};

function urlFor(id: string, large = false): string {
  return `${BASE}photo-${id}${large ? LARGE : SMALL}`;
}

function lookup(kind?: string, color?: string): string | null {
  if (!kind) return null;
  const k = kind.toLowerCase().replace(/[^a-z_]/g, '_');
  const byKind = PHOTOS[k];
  if (!byKind) return null;
  const c = (color ?? '').toLowerCase();
  if (c && byKind[c]) return byKind[c].id;
  const firstKey = Object.keys(byKind)[0];
  return byKind[firstKey]?.id ?? null;
}

export function flowerImage(kind?: string, color?: string): string {
  const id = lookup(kind, color) ?? PHOTOS.generic.default.id;
  return urlFor(id, false);
}

export function flowerImageLarge(kind?: string, color?: string): string {
  const id = lookup(kind, color) ?? PHOTOS.generic.default.id;
  return urlFor(id, true);
}
