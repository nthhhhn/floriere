// Frontend override for curated bouquet images.
//
// The DB seed pins each curated bouquet to a stock Unsplash photo. To shift
// the brand to a more local-florist feel without reseeding, we override the
// image per curated id here. Falls back to bouquet.image_url if no override.
//
// To override more bouquets later: add an entry keyed by curated id with an
// Unsplash photo-<id> slug. The image will reflow everywhere ProductCard or
// the orders preview is used.

import { medium, large } from './imagery';

const OVERRIDES: Record<number, string> = {
  // 1 Garden Romance — anniversary, soft warm pinks
  1: '1565181917578-7180a32f8a7d',
  // 2 Apology in Bloom — quiet whites
  2: '1487530811176-3780de880c2d',
  // 3 Celebration — sunflowers, bright
  3: '1597848212624-a19eb35e2651',
  // 4 Stillness — sympathy, line greens
  4: '1565011523534-747a8601f10a',
};

type WithImage = { id?: number; image_url?: string | null };

export function curatedImage(b?: WithImage | null, size: 'medium' | 'large' = 'medium'): string {
  if (b?.id && OVERRIDES[b.id]) {
    return size === 'large' ? large(OVERRIDES[b.id]) : medium(OVERRIDES[b.id]);
  }
  return b?.image_url ?? '';
}
