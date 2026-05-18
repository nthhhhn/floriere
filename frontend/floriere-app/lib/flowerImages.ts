// Real flower photographs keyed by `flowers.illustration` + color.
// Replaces the SVG FlowerArt for product imagery — the SVG stays as a
// final fallback when neither kind nor color matches.

import { MOOD_REFS } from './imagery';

// Map your individual stem photos here
// Note: Metro Bundler requires static strings for require(). Invalid strings like 'image path' will crash the app!
const LOCAL_PHOTOS: Record<string, Record<string, any>> = {
  rose: {
    red: require("../assets/flowers/demo_flower.png"),
    white: require("../assets/flowers/demo_flower.png"),
    pink: require("../assets/flowers/demo_flower.png"),
  },
  tulip: {
    pink: require("../assets/flowers/demo_flower.png"),
    yellow: require("../assets/flowers/demo_flower.png"),
    red: require("../assets/flowers/demo_flower.png"),
  },
  lily: {
    white:require("../assets/flowers/demo_flower.png"),
  },
  sunflower: {
    yellow: require("../assets/flowers/demo_flower.png"),
  },
  peony: {
    blush: require("../assets/flowers/demo_flower.png"),
    pink: require("../assets/flowers/demo_flower.png"),
  },
  eucalyptus: {
    green: require("../assets/flowers/demo_flower.png"),
  },
  babys_breath: {
    // CORRECT: Use a relative path from this file's location (lib/flowerImages.ts) to the assets folder.
    white: require("../assets/flowers/demo_flower.png"),
  },
  generic: {
    default: require("../assets/flowers/demo_flower.png"),
  }
};

// Map your curated bouquets here (using the IDs from imagery.ts)
const LOCAL_BOUQUETS: Record<string, any> = {
  'm-cottage': require("../assets/flowers/demo_flower.png"),
  'm-ivory': require("../assets/flowers/demo_flower.png"),
  'm-blush': require("../assets/flowers/demo_flower.png"),
  'm-tulip': require("../assets/flowers/demo_flower.png"),
  'm-rusty': require("../assets/flowers/demo_flower.png"),
  'm-red': require("../assets/flowers/demo_flower.png"),
  'm-sun': require("../assets/flowers/demo_flower.png"),
  'm-cloud': require("../assets/flowers/demo_flower.png"),
  'm-line': require("../assets/flowers/demo_flower.png"),
  'm-stem': require("../assets/flowers/demo_flower.png"),
  'm-leaf': require("../assets/flowers/demo_flower.png"),
  'm-petal': require("../assets/flowers/demo_flower.png"),
  'm-jasmine': require("../assets/flowers/demo_flower.png"),
  'm-marigold': require("../assets/flowers/demo_flower.png"),
  'm-lotus': require("../assets/flowers/demo_flower.png"),
  'm-orchid': require("../assets/flowers/demo_flower.png"),
  'm-monsoon': require("../assets/flowers/demo_flower.png"),
  'm-bridal': require("../assets/flowers/demo_flower.png"),
  'm-night': require("../assets/flowers/demo_flower.png"),
  'm-pastel': require("../assets/flowers/demo_flower.png"),
};

export function flowerImage(kind?: string, color?: string): any {
  if (!kind) return LOCAL_PHOTOS.generic.default;
  const cleanKind = kind.trim().toLowerCase();

  // 1. Check curated bouquets first
  const mood = MOOD_REFS.find(m => m.name.toLowerCase() === cleanKind || m.id.toLowerCase() === cleanKind);
  if (mood && LOCAL_BOUQUETS[mood.id]) return LOCAL_BOUQUETS[mood.id];

  // 2. Check individual stems
  const k = cleanKind.replace(/[^a-z_]/g, '_');
  let byKind = LOCAL_PHOTOS[k];
  
  if (!byKind) {
    const fallbackKey = Object.keys(LOCAL_PHOTOS).find(key => k.includes(key));
    if (fallbackKey) byKind = LOCAL_PHOTOS[fallbackKey];
  }

  if (byKind) {
    const c = (color ?? '').toLowerCase();
    if (c && byKind[c]) return byKind[c];
    
    // Fallback to the first available color if exact color isn't mapped
    const firstKey = Object.keys(byKind)[0];
    return byKind[firstKey] ?? LOCAL_PHOTOS.generic.default;
  }
  
  return LOCAL_PHOTOS.generic.default;
}

export function flowerImageLarge(kind?: string, color?: string): any {
  return flowerImage(kind, color);
}
