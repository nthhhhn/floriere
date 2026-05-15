// Purchaser home — marketplace layout (Shopee / Uniqlo / Zara style).
// Search bar header + category chips + product-card grid sections.
// Editorial palette is preserved; only the IA shifts to ecommerce.

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MarketHeader } from '../../components/MarketHeader';
import { PlaceholderImage } from '../../components/PlaceholderImage';
import { ProductCard } from '../../components/ProductCard';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiGet } from '../../lib/api';
import { useBreakpoint } from '../../lib/responsive';
import type { Cart, CuratedBouquet, MerchantPublic } from '../../lib/types';
import { stars, occasionLabel } from '../../lib/format';
import { colors, radii, space } from '../../theme';

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'all',          label: 'All' },
  { key: 'anniversary',  label: 'Anniversary' },
  { key: 'apology',      label: 'Apology' },
  { key: 'celebration',  label: 'Celebration' },
  { key: 'sympathy',     label: 'Sympathy' },
];

export default function PurchaserHome() {
  const router = useRouter();
  const bp = useBreakpoint();
  const [cart, setCart]         = useState<Cart | null>(null);
  const [curated, setCurated]   = useState<CuratedBouquet[]>([]);
  const [merchant, setMerchant] = useState<MerchantPublic | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, b, m] = await Promise.all([
          apiGet<Cart>('/cart'),
          apiGet<CuratedBouquet[]>('/catalog/curated', { auth: false }),
          apiGet<{ merchant: MerchantPublic | null }>('/seller/public', { auth: false }),
        ]);
        setCart(c);
        setCurated(b);
        setMerchant(m.merchant);
      } catch { /* ignore — empty states render */ }
    })();
  }, []);

  const featured = curated.slice(0, 4);
  const trending = curated.slice(0, 6);
  const cardWidth = bp === 'phone' ? '48%' : '31%';

  return (
    <Screen background="cream" maxFrame="tablet">
      <MarketHeader cartCount={cart?.items.length ?? 0} />

      {/* Promo banner — photo slot (friend will source). Caption lives below. */}
      <Pressable
        onPress={() => router.push('/(purchaser)/curated' as any)}
        style={styles.banner}
      >
        <PlaceholderImage size="lg" fill />
      </Pressable>
      <View style={styles.bannerCaption}>
        <Text variant="eyebrow" color="champagne">NEW · STUDIO COMPOSITIONS</Text>
        <Text variant="h2" color="ink" style={{ marginTop: 4 }}>Send something true.</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
          Hand-tied in Bangkok · same-day before 2 PM
        </Text>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => router.push(
              c.key === 'all'
                ? '/(purchaser)/curated'
                : `/(purchaser)/curated?occasion=${c.key}` as any,
            )}
            style={styles.chip}
          >
            <Text variant="bodySm" color="ink" style={styles.chipText}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Quick actions row */}
      <View style={styles.actionsRow}>
        <Pressable onPress={() => router.push('/(purchaser)/compose' as any)} style={styles.actionCard}>
          <View style={[styles.actionDot, { backgroundColor: colors.champagneBg }]}>
            <Text variant="h3" color="champagne">✿</Text>
          </View>
          <Text variant="bodySm" color="ink" style={styles.actionTitle}>Concierge quiz</Text>
          <Text variant="caption" color="muted" numberOfLines={1}>Guided · AI preview</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(purchaser)/intent' as any)} style={styles.actionCard}>
          <View style={[styles.actionDot, { backgroundColor: colors.plumBg }]}>
            <Text variant="h3" color="plum">✎</Text>
          </View>
          <Text variant="bodySm" color="ink" style={styles.actionTitle}>Tell us the moment</Text>
          <Text variant="caption" color="muted" numberOfLines={1}>Intent Mode</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(purchaser)/favorites' as any)} style={styles.actionCard}>
          <View style={[styles.actionDot, { backgroundColor: colors.successBg }]}>
            <Text variant="h3" color="champagne">♥</Text>
          </View>
          <Text variant="bodySm" color="ink" style={styles.actionTitle}>Favorites</Text>
          <Text variant="caption" color="muted" numberOfLines={1}>Saved bouquets</Text>
        </Pressable>
      </View>

      {/* Featured studio */}
      {merchant ? (
        <Pressable
          onPress={() => router.push('/(purchaser)/curated' as any)}
          style={styles.merchantCard}
        >
          <View style={styles.merchantBadge}>
            <Text variant="caption" color="white" style={styles.merchantBadgeText}>
              {merchant.is_open ? 'OPEN' : 'CLOSED'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="muted" style={{ letterSpacing: 1 }}>OFFICIAL STUDIO</Text>
            <Text variant="h3" color="ink" style={{ marginTop: 2 }}>{merchant.shop_name}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
              {merchant.open_hour}:00–{merchant.close_hour}:00 · Same-day before 2 PM
            </Text>
          </View>
          {merchant.review_count ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="bodySm" color="champagne" style={{ fontWeight: '600' }}>
                {stars(merchant.avg_stars ?? 0)}
              </Text>
              <Text variant="caption" color="muted">{merchant.review_count} reviews</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {/* Featured collections */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text variant="h3" color="ink">Featured collections</Text>
          <Pressable onPress={() => router.push('/(purchaser)/curated' as any)}>
            <Text variant="bodySm" color="champagne">See all →</Text>
          </Pressable>
        </View>
        <View style={[styles.grid, bp !== 'phone' && styles.gridWide]}>
          {featured.map((b) => (
            <View key={b.id} style={{ width: cardWidth as any }}>
              <ProductCard
                imageUrl={b.image_url}
                title={b.name}
                subtitle={b.description}
                priceThb={b.base_price_thb}
                occasion={occasionLabel(b.occasion)}
                ratingLabel={b.review_count ? `★ ${(b.avg_stars ?? 0).toFixed(1)}` : null}
                onPress={() => router.push(`/(purchaser)/curated/${b.id}` as any)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Trending strip — horizontal scroll */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text variant="h3" color="ink">Trending this week</Text>
          <Pressable onPress={() => router.push('/(purchaser)/curated' as any)}>
            <Text variant="bodySm" color="champagne">See all →</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hStrip}>
          {trending.map((b) => (
            <View key={b.id} style={styles.hItem}>
              <ProductCard
                imageUrl={b.image_url}
                title={b.name}
                priceThb={b.base_price_thb}
                ratingLabel={b.review_count ? `★ ${(b.avg_stars ?? 0).toFixed(1)}` : null}
                occasion={occasionLabel(b.occasion)}
                onPress={() => router.push(`/(purchaser)/curated/${b.id}` as any)}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    height: 180,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: space.md,
  },
  bannerCaption: {
    width: '100%',
    marginBottom: space.xl,
  },

  chipsScroll: { width: '100%', marginBottom: space.lg },
  chipsRow:    { gap: space.sm, paddingHorizontal: 0 },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
  chipText: { fontWeight: '500' },

  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.xl,
  },
  actionCard: {
    flex: 1,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    alignItems: 'center',
  },
  actionDot: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  actionTitle: { fontWeight: '600', textAlign: 'center', marginTop: 2 },

  merchantCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.creamSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    padding: space.lg,
    marginBottom: space.xl,
    position: 'relative',
  },
  merchantBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    backgroundColor: colors.champagne,
    borderRadius: radii.xs,
  },
  merchantBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  section: { width: '100%', marginBottom: space.xl },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: space.md,
  },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  gridWide: { rowGap: space.lg },
  hStrip: { gap: space.md, paddingRight: space.md },
  hItem:  { width: 200 },
});
