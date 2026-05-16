// Favorites — marketplace grid (Shopee saved-items style).
// Product cards with photo, name, price, and heart toggle. Empty state CTA.

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { ProductCard } from '../../components/ProductCard';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiDelete, apiGet } from '../../lib/api';
import { useBreakpoint } from '../../lib/responsive';
import type { CuratedBouquet } from '../../lib/types';
import { occasionLabel } from '../../lib/format';
import { colors, radii, space } from '../../theme';

function HeartFilled() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7-4.5-9.4-9.1C.9 8.4 2.6 5 6.1 5c2 0 3.4 1.2 4.4 2.4C11.5 6.2 12.9 5 14.9 5c3.5 0 5.2 3.4 3.5 6.9C19 16.5 12 21 12 21z"
        fill={colors.champagne}
        stroke={colors.white}
        strokeWidth={1.2}
      />
    </Svg>
  );
}

export default function Favorites() {
  const router = useRouter();
  const bp = useBreakpoint();
  const [list, setList] = useState<CuratedBouquet[] | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await apiGet<CuratedBouquet[]>('/account/favorites');
      setList(rows);
    } catch { setList([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function unfavorite(id: number) {
    try {
      await apiDelete(`/account/favorites/${id}`);
      await load();
    } catch { /* ignore */ }
  }

  const cardWidth = bp === 'phone' ? '48%' : '31%';

  return (
    <Screen background="cream" maxFrame="tablet" back="/(purchaser)/home" backLabel="Back">
      <AppHeader eyebrow="FAVORITES" title="Saved bouquets" />

      {list === null ? (
        <ActivityIndicator color={colors.champagne} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyArt}>
            <Svg width={64} height={64} viewBox="0 0 24 24">
              <Path
                d="M12 21s-7-4.5-9.4-9.1C.9 8.4 2.6 5 6.1 5c2 0 3.4 1.2 4.4 2.4C11.5 6.2 12.9 5 14.9 5c3.5 0 5.2 3.4 3.5 6.9C19 16.5 12 21 12 21z"
                fill="none"
                stroke={colors.champagne}
                strokeWidth={1.2}
              />
            </Svg>
          </View>
          <Text variant="h3" color="ink" align="center" style={{ marginTop: space.lg }}>
            Nothing saved yet
          </Text>
          <Text variant="body" color="muted" align="center" style={{ marginTop: space.xs, paddingHorizontal: space.xl }}>
            Tap the heart on any curated bouquet to keep it here.
          </Text>
          <View style={{ marginTop: space.xl }}>
            <Button label="Browse curated →" onPress={() => router.push('/(purchaser)/curated' as any)} />
          </View>
        </View>
      ) : (
        <View style={styles.grid}>
          {list.map((b) => (
            <View key={b.id} style={{ width: cardWidth as any }}>
              <ProductCard
                imageUrl={b.image_url}
                title={b.name}
                priceThb={b.base_price_thb}
                occasion={occasionLabel(b.occasion)}
                ratingLabel={b.review_count ? `★ ${(b.avg_stars ?? 0).toFixed(1)}` : null}
                onPress={() => router.push(`/(purchaser)/curated/${b.id}` as any)}
                rightAccessory={
                  <Pressable onPress={() => unfavorite(b.id)} style={styles.heartBtn} hitSlop={6}>
                    <HeartFilled />
                  </Pressable>
                }
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    width: '100%',
    alignItems: 'center',
    paddingTop: space.huge,
  },
  emptyArt: {
    width: 96, height: 96,
    borderRadius: 48,
    backgroundColor: colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.md,
  },
  heartBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
