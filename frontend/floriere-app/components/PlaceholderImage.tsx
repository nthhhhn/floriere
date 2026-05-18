// Dynamic flower and bouquet image loader using local assets.
//
// Automatically falls back to the stable catalog or generic bouquet image if
// specific illustration kind/color pairs are not found.
//
// Props are preserved for full API compatibility across the codebase.

import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { radii } from '../theme';
import { flowerImage } from '../lib/flowerImages';

export type Tone =
  | 'blush' | 'rose' | 'red' | 'pink' | 'yellow' | 'orange'
  | 'white' | 'cream' | 'green' | 'sage' | 'blue' | 'purple'
  | 'lilac' | 'earth' | 'warm' | 'cool' | 'neutral';

// Returns a valid Tone hint from standard color strings to aid in photo lookup.
export function toneFromColor(color?: string | null): Tone {
  if (!color) return 'neutral';
  const c = color.toLowerCase();
  if (c.includes('red')) return 'red';
  if (c.includes('pink') || c.includes('blush')) return 'pink';
  if (c.includes('yellow')) return 'yellow';
  if (c.includes('orange')) return 'orange';
  if (c.includes('white')) return 'white';
  if (c.includes('green') || c.includes('sage')) return 'green';
  if (c.includes('blue')) return 'blue';
  if (c.includes('purple') || c.includes('lilac')) return 'purple';
  return 'neutral';
}

type Props = {
  label?: string | null;
  subLabel?: string | null;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
};

export function PlaceholderImage({ label, subLabel, tone, style, fill }: Props) {
  // Use subLabel (which has the color name e.g. "red" or "pink") or tone as color hints.
  const colorStr = subLabel || tone || '';
  const imageSource = flowerImage(label || undefined, colorStr || undefined);

  return (
    <Image
      source={imageSource}
      style={[fill ? styles.fill : styles.base, style]}
      contentFit="cover"
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
