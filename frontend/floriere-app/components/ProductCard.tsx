import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { PlaceholderImage } from './PlaceholderImage';
import { Text } from './Text';
import { colors, radii, space, shadow, usePressScale, useScaleIn } from '../theme';
import { thb } from '../lib/format';

type Props = {
  imageUrl: string | null;
  title: string;
  subtitle?: string | null;
  priceThb?: number;
  ratingLabel?: string | null;
  occasion?: string | null;
  onPress?: () => void;
  width?: number | `${number}%`;
  rightAccessory?: React.ReactNode;
  /** Index in the parent list. Used to stagger mount-in (capped at 8 * 40ms). */
  index?: number;
};

export function ProductCard({
  imageUrl, title, subtitle, priceThb, ratingLabel,
  occasion, onPress, width, rightAccessory, index,
}: Props) {
  const press = usePressScale();
  const mount = useScaleIn(280, Math.min(index ?? 0, 8) * 40);
  return (
    <Animated.View
      style={{
        opacity: mount.opacity,
        transform: [{ scale: Animated.multiply(mount.scale, press.scale) }],
        width: width as any,
      }}
    >
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        <PlaceholderImage
          label={title}
          subLabel={occasion ?? subtitle ?? null}
          tone={
            occasion?.toLowerCase().includes('sympathy') ? 'cream' :
            occasion?.toLowerCase().includes('apology')  ? 'lilac' :
            occasion?.toLowerCase().includes('celebra')  ? 'yellow' :
            occasion?.toLowerCase().includes('anniv')    ? 'blush' :
            'blush'
          }
          fill
        />
        {imageUrl ? null /* placeholder mode — no remote image */ : null}
        {occasion ? (
          <View style={styles.occasionTag}>
            <Text variant="caption" color="white" style={styles.occasionText}>
              {occasion.toUpperCase()}
            </Text>
          </View>
        ) : null}
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      <View style={styles.body}>
        <Text variant="body" color="ink" numberOfLines={1} style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="muted" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {priceThb !== undefined ? (
            <Text variant="body" color="champagne" style={styles.price}>{thb(priceThb)}</Text>
          ) : <View />}
          {ratingLabel ? (
            <Text variant="caption" color="muted">{ratingLabel}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderHair,
    ...shadow.card,
  },
  imageWrap: { position: 'relative', width: '100%', aspectRatio: 1, backgroundColor: colors.creamSoft },
  img:       { width: '100%', height: '100%' },
  placeholder: { borderBottomWidth: 1, borderColor: colors.creamRule },
  occasionTag: {
    position: 'absolute', top: space.sm, left: space.sm,
    backgroundColor: 'rgba(28,26,23,0.78)',
    paddingHorizontal: space.sm, paddingVertical: 4,
    borderRadius: radii.xs,
  },
  occasionText: { letterSpacing: 1, fontSize: 9, fontWeight: '600' },
  accessory:   { position: 'absolute', top: space.sm, right: space.sm },
  body:        { padding: space.md, gap: 2 },
  title:       { fontWeight: '600' },
  subtitle:    { marginTop: 2 },
  metaRow:     {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: space.xs,
  },
  price:       { fontWeight: '600', fontVariant: ['tabular-nums'] },
});
