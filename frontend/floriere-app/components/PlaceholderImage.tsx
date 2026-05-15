// Placeholder tile — uniform neutral grey with a "TODO: PHOTO" marker.
//
// Pete's friend will source Pak Khlong Talat market photos and swap these out.
// Until then, every image slot renders as the same flat grey card so the
// missing-photo regions are obvious in screenshots and easy to find.
//
// Props are kept for API compatibility with the previous tinted version but
// `label`, `subLabel`, and `tone` are intentionally ignored — the visual is
// the same everywhere.

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii } from '../theme';
import { Text } from './Text';

type Tone =
  | 'blush' | 'rose' | 'red' | 'pink' | 'yellow' | 'orange'
  | 'white' | 'cream' | 'green' | 'sage' | 'blue' | 'purple'
  | 'lilac' | 'earth' | 'warm' | 'cool' | 'neutral';

// Kept exported so existing call sites keep type-checking.
export function toneFromColor(_color?: string | null): Tone {
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

const PLACEHOLDER_BG = '#D9D9D9';
const PLACEHOLDER_FG = '#6B6B6B';

export function PlaceholderImage({ size = 'md', style, fill }: Props) {
  const fontSize = size === 'sm' ? 9 : size === 'lg' ? 12 : 10;

  return (
    <View style={[fill ? styles.fill : styles.base, { backgroundColor: PLACEHOLDER_BG }, style]}>
      <Text
        style={{
          color: PLACEHOLDER_FG,
          fontFamily: 'monospace',
          fontSize,
          letterSpacing: 1.5,
          fontWeight: '600',
        }}
      >
        TODO: PHOTO
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
