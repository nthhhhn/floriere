// Curated index ("Shop" tab) — marketplace listing.
// Search bar + occasion chips + sort chips + ProductCard grid.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MarketHeader } from '../../../components/MarketHeader';
import { ProductCard } from '../../../components/ProductCard';
import { ProductCardSkeleton } from '../../../components/Skeleton';
import { Screen } from '../../../components/Screen';
import { Text } from '../../../components/Text';
import { apiGet } from '../../../lib/api';
import { useBreakpoint } from '../../../lib/responsive';
import type { Cart, CuratedBouquet } from '../../../lib/types';
import { occasionLabel } from '../../../lib/format';
import { colors, radii, space } from '../../../theme';

const OCCASIONS = ['all', 'anniversary', 'apology', 'celebration', 'sympathy'] as const;
type Sort = 'default' | 'price_asc' | 'price_desc' | 'rating' | 'newest';

const SORTS: Array<{ key: Sort; label: string }> = [
  { key: 'default',    label: 'Featured' },
  { key: 'price_asc',  label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
  { key: 'rating',     label: 'Top rated' },
  { key: 'newest',     label: 'Newest' },
];

export default function CuratedList() {
  const router = useRouter();
  const bp = useBreakpoint();
  const params = useLocalSearchParams<{ occasion?: string }>();
  const initialOccasion = (OCCASIONS as readonly string[]).includes(params.occasion ?? '')
    ? (params.occasion as typeof OCCASIONS[number])
    : 'all';
  const [bouquets, setBouquets] = useState<CuratedBouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);
  const [occasion, setOccasion] = useState<typeof OCCASIONS[number]>(initialOccasion);
  const [sort, setSort] = useState<Sort>('default');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGet<Cart>('/cart').then(setCart).catch(() => setCart(null));
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (occasion !== 'all') params.set('occasion', occasion);
    if (sort !== 'default') params.set('sort', sort);
    if (search.trim())      params.set('q', search.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';
    setLoading(true);
    try {
      const rows = await apiGet<CuratedBouquet[]>(`/catalog/curated${qs}`, { auth: false });
      setBouquets(rows);
    } catch {
      setBouquets([]);
    } finally {
      setLoading(false);
    }
  }, [occasion, sort, search]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => bouquets, [bouquets]);
  const cardWidth = bp === 'phone' ? '48%' : '31%';

  return (
    <Screen background="cream" maxFrame="tablet">
      <MarketHeader
        search={search}
        onSearch={setSearch}
        cartCount={cart?.items.length ?? 0}
      />

      {/* Occasion chips */}
      <View style={styles.chipRow}>
        {OCCASIONS.map((o) => {
          const active = o === occasion;
          return (
            <Pressable
              key={o}
              onPress={() => setOccasion(o)}
              style={active ? [styles.chip, styles.chipActive] : styles.chip}
            >
              <Text
                variant="bodySm"
                color={active ? 'champagne' : 'ink'}
                style={active ? [styles.chipText, styles.chipTextActive] : styles.chipText}
              >
                {o === 'all' ? 'All' : occasionLabel(o)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {SORTS.map((s) => {
          const active = s.key === sort;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSort(s.key)}
              style={active ? [styles.sortChip, styles.sortChipActive] : styles.sortChip}
            >
              <Text
                variant="caption"
                color={active ? 'white' : 'muted'}
                style={active ? [styles.sortText, styles.sortTextActive] : styles.sortText}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Result count */}
      <View style={styles.resultRow}>
        <Text variant="caption" color="muted">
          {filtered.length} {filtered.length === 1 ? 'bouquet' : 'bouquets'}
        </Text>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={styles.grid}>
          {Array.from({ length: bp === 'phone' ? 4 : 6 }).map((_, i) => (
            <View key={i} style={{ width: cardWidth as any }}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {filtered.map((b, i) => (
            <View key={b.id} style={{ width: cardWidth as any }}>
              <ProductCard
                imageUrl={b.image_url}
                title={b.name}
                subtitle={b.description}
                priceThb={b.base_price_thb}
                occasion={occasionLabel(b.occasion)}
                ratingLabel={b.review_count ? `★ ${(b.avg_stars ?? 0).toFixed(1)} · ${b.review_count}` : null}
                onPress={() => router.push(`/(purchaser)/curated/${b.id}` as any)}
                index={i}
              />
            </View>
          ))}
        </View>
      )}

      {!loading && filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="h2" color="ink" align="center">No bouquets fit those filters</Text>
          <Text variant="body" color="muted" align="center" style={{ marginTop: space.sm, maxWidth: 320 }}>
            Clear the occasion or sort to see the full catalog of 12 arrangements.
          </Text>
          <Pressable
            onPress={() => { setOccasion('all'); setSort('default'); setSearch(''); }}
            style={styles.emptyAction}
          >
            <Text variant="button" color="champagne">Clear filters</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.md,
  },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
  chipActive: {
    backgroundColor: colors.champagneTint,
    borderColor: colors.champagne,
  },
  chipText:       { fontWeight: '500' },
  chipTextActive: { fontWeight: '700' },

  sortRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginBottom: space.md,
  },
  sortChip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.creamSoft,
  },
  sortChipActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  sortText:       { fontSize: 11, letterSpacing: 0.3 },
  sortTextActive: { fontWeight: '700' },

  resultRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: space.sm,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.md,
  },
  empty: {
    width: '100%',
    alignItems: 'center',
    paddingTop: space.xxxl,
  },
  emptyAction: {
    marginTop: space.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.champagne,
  },
});
