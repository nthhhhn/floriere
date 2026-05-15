// Curated detail — NativeWind migration target. Tailwind classNames cover
// layout / spacing / typography on plain <View> + RN <Text>. Our shared
// component primitives (<Card>, <Pill>, <Button>, <Screen>, <AppHeader>,
// <Stars>) still consume the StyleSheet theme.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { PlaceholderImage, toneFromColor } from '../../../components/PlaceholderImage';

import { AppHeader } from '../../../components/AppHeader';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Pill } from '../../../components/Pill';
import { Screen } from '../../../components/Screen';
import { Stars } from '../../../components/Stars';
import { apiDelete, apiGet, apiPost, ApiError } from '../../../lib/api';
import { useBreakpoint } from '../../../lib/responsive';
import type { Cart, CuratedBouquet } from '../../../lib/types';
import { occasionLabel, prettyDate, stars as starString, thb } from '../../../lib/format';
import { colors } from '../../../theme';

const EYEBROW_CLASS =
  'font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-champagne';

export default function CuratedDetail() {
  const router = useRouter();
  const bp = useBreakpoint();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [bouquet, setBouquet] = useState<CuratedBouquet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState<boolean>(false);
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [b, favs] = await Promise.all([
          apiGet<CuratedBouquet>(`/catalog/curated/${id}`, { auth: false }),
          apiGet<CuratedBouquet[]>('/account/favorites').catch(() => []),
        ]);
        if (cancelled) return;
        setBouquet(b);
        setFavorite(favs.some((f) => f.id === b.id));
      } catch (err) {
        if (cancelled) return;
        setBouquet(null);
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this bouquet.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function addToCart() {
    if (!bouquet) return;
    setError(null);
    setAdding(true);
    try {
      await apiPost<Cart>('/cart/items', {
        item_type: 'curated',
        curated_bouquet_id: bouquet.id,
        quantity: 1,
      });
      router.push('/(purchaser)/cart');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add to cart.');
    } finally {
      setAdding(false);
    }
  }

  async function toggleFavorite() {
    if (!bouquet) return;
    try {
      if (favorite) {
        await apiDelete(`/account/favorites/${bouquet.id}`);
      } else {
        await apiPost(`/account/favorites/${bouquet.id}`, {});
      }
      setFavorite((v) => !v);
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <Screen background="cream" maxFrame="tablet">
        <AppHeader eyebrow="CURATED" title="Loading" back />
        <ActivityIndicator color={colors.champagne} />
      </Screen>
    );
  }

  if (!bouquet) {
    return (
      <Screen background="cream" maxFrame="tablet">
        <AppHeader eyebrow="CURATED" title="Not found" back />
        <View className="w-full items-center py-huge">
          <Text className="font-serif text-h2 text-ink text-center">This bouquet isn't available</Text>
          <Text className="font-sans text-body text-muted text-center mt-sm" style={{ maxWidth: 320 }}>
            {loadError ?? 'It may have been removed or the link is wrong.'}
          </Text>
          <View style={{ height: 24 }} />
          <Button label="Browse all bouquets" onPress={() => router.replace('/(purchaser)/curated' as any)} />
        </View>
      </Screen>
    );
  }

  const wideLead = bp !== 'phone';

  return (
    <Screen background="cream" maxFrame="tablet">
      <AppHeader
        eyebrow={occasionLabel(bouquet.occasion).toUpperCase()}
        title={bouquet.name}
        back
        rightSlot={
          <Pressable onPress={toggleFavorite}>
            <Pill label={favorite ? '♥ SAVED' : 'SAVE'} tone={favorite ? 'champagne' : 'muted'} />
          </Pressable>
        }
      />

      <View className={`w-full ${wideLead ? 'flex-row gap-xl items-start' : ''}`}>
        <View
          style={{
            width: wideLead ? '50%' : '100%',
            aspectRatio: 1,
            borderRadius: 12,
            marginBottom: wideLead ? 0 : 16,
            overflow: 'hidden',
          }}
        >
          <PlaceholderImage
            label={bouquet.name}
            subLabel={occasionLabel(bouquet.occasion)}
            tone="blush"
            size="lg"
            fill
          />
        </View>

        <View className={wideLead ? 'w-[46%]' : 'w-full'}>
          <Pill label={occasionLabel(bouquet.occasion).toUpperCase()} />
          <Text className="font-serif text-h1 text-ink mt-md tracking-tight">{bouquet.name}</Text>
          <Text className="font-serif text-quote italic text-muted mt-sm">
            {bouquet.description}
          </Text>
          {bouquet.review_count ? (
            <View className="mt-md">
              <Stars value={Math.round(bouquet.avg_stars ?? 0)} size={18} />
              <Text className="font-sans text-caption text-muted mt-1">
                {(bouquet.avg_stars ?? 0).toFixed(1)} · {bouquet.review_count} reviews
              </Text>
            </View>
          ) : null}
          <Text className="font-serif text-h2 text-champagne mt-lg">
            {thb(bouquet.base_price_thb)}
          </Text>

          {error ? (
            <Text className="font-sans text-caption text-danger mt-sm">{error}</Text>
          ) : null}

          <View style={{ height: 16 }} />
          <Button label={adding ? 'Adding to cart…' : 'Add to cart'} onPress={addToCart} loading={adding} full />
        </View>
      </View>

      <View className="w-full mt-xxl">
        <Text className={EYEBROW_CLASS}>THE COMPOSITION</Text>
        <View style={{ height: 12 }} />
        {(bouquet.flowers ?? []).map((f) => (
          <View
            key={`${f.flower_id}`}
            className="flex-row items-center py-md border-b border-creamRule"
          >
            <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden' }}>
              <PlaceholderImage label={f.name} tone={toneFromColor(f.color)} size="sm" fill />
            </View>
            <View className="flex-1 ml-md">
              <Text className="font-sans text-body text-ink">{f.name} · {f.color}</Text>
              <Text className="font-sans text-caption text-muted">{f.quantity} stems</Text>
            </View>
            <Text className="font-sans text-bodySm text-muted">{thb(f.price_thb)} each</Text>
          </View>
        ))}
      </View>

      <Card tone="creamSoft" style={{ width: '100%', marginTop: 24 }}>
        <Text className={EYEBROW_CLASS}>FLORIÈRE PRESENTATION</Text>
        <Text className="font-sans text-body text-ink mt-sm">
          Hand-tied at the studio, wrapped in cream paper with a champagne ribbon,
          and delivered with a handwritten card from the Florière box.
        </Text>
      </Card>

      {bouquet.reviews && bouquet.reviews.length > 0 ? (
        <Card tone="white" style={{ width: '100%', marginTop: 24 }}>
          <Text className={EYEBROW_CLASS}>REVIEWS</Text>
          {bouquet.reviews.map((r, idx) => (
            <View
              key={idx}
              className="py-md border-t border-creamRule"
              style={idx === 0 ? { marginTop: 12 } : undefined}
            >
              <View className="flex-row items-center gap-sm">
                <Text className="font-sans text-bodySm text-champagne">{starString(r.stars)}</Text>
                <Text className="font-sans text-caption text-muted">
                  {r.reviewer_name}{r.created_at ? ` · ${prettyDate(r.created_at)}` : ''}
                </Text>
              </View>
              {r.comment ? (
                <Text className="font-sans text-bodySm text-ink mt-1">"{r.comment}"</Text>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
