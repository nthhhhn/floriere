// Cart — marketplace-style row list (Shopee cart pattern).
// Each row: thumbnail + title + meta + qty/price + remove.
// Sticky-feeling subtotal card at bottom with checkout CTA.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { PlaceholderImage, toneFromColor } from '../../components/PlaceholderImage';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiDelete, apiGet, ApiError } from '../../lib/api';
import type { Cart as CartType, CartItem } from '../../lib/types';
import { occasionLabel, thb } from '../../lib/format';
import { colors, radii, space, shadow } from '../../theme';

function thumbToneFor(it: CartItem): Parameters<typeof PlaceholderImage>[0]['tone'] {
  const first = it.flowers?.[0];
  if (first) return toneFromColor(first.color);
  if (it.item_type === 'concierge') return 'blush';
  return 'neutral';
}

function titleFor(it: CartItem): string {
  return it.curated_name ?? it.custom_label ?? (
    it.item_type === 'intent' ? `Intent · ${occasionLabel(it.intent_occasion ?? '')}`
    : it.item_type === 'concierge' ? 'Concierge bouquet'
    : 'Florière bouquet'
  );
}

export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<CartType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);

  const reload = useCallback(async () => {
    try {
      const c = await apiGet<CartType>('/cart');
      setCart(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load cart.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function doRemove(id: number) {
    try {
      const c = await apiDelete<CartType>(`/cart/items/${id}`);
      setCart(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove item.');
    }
  }

  function confirmRemove(it: CartItem) {
    setItemToRemove(it);
  }

  function editItem(it: CartItem) {
    if (it.item_type === 'curated' && it.curated_bouquet_id) {
      router.push(`/(purchaser)/curated/${it.curated_bouquet_id}` as any);
    } else if (it.item_type === 'intent' || it.item_type === 'custom') {
      router.push('/(purchaser)/intent' as any);
    } else if (it.item_type === 'concierge') {
      router.push('/(purchaser)/compose' as any);
    }
  }

  return (
    <Screen background="cream" maxFrame="tablet">
      <Modal
        visible={itemToRemove !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setItemToRemove(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="h3" color="ink" style={{ marginBottom: space.sm }}>Remove item?</Text>
            <Text variant="body" color="muted" style={{ marginBottom: space.lg }}>
              {itemToRemove ? (
                itemToRemove.item_type === 'concierge'
                  ? `Remove "${titleFor(itemToRemove)}"? You'll lose the brief and have to redo the concierge quiz.`
                  : `Remove "${titleFor(itemToRemove)}" from your cart?`
              ) : ''}
            </Text>
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button label="No" variant="secondary" onPress={() => setItemToRemove(null)} full />
              </View>
              <View style={{ width: space.md }} />
              <View style={{ flex: 1 }}>
                <Button 
                  label="Yes" 
                  onPress={() => {
                    if (itemToRemove) doRemove(itemToRemove.id);
                    setItemToRemove(null);
                  }} 
                  full 
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <AppHeader eyebrow="YOUR CART" title="Almost there." />

      {loading ? (
        <ActivityIndicator color={colors.champagne} />
      ) : !cart || cart.items.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="h3" color="ink" align="center">Nothing in your cart yet</Text>
          <Text variant="body" color="muted" align="center" style={{ marginTop: space.xs }}>
            Compose a bouquet, browse curated, or tell us the moment.
          </Text>
          <View style={{ marginTop: space.xl }}>
            <Button label="Back to home" onPress={() => router.push('/(purchaser)/home')} />
          </View>
        </View>
      ) : (
        <View style={{ width: '100%' }}>
          {cart.items.map((it) => (
            <View key={it.id} style={styles.row}>
              <View style={styles.thumb}>
                <PlaceholderImage label={titleFor(it)} tone={thumbToneFor(it)} size="sm" fill />
              </View>
              <View style={styles.body}>
                <View style={styles.head}>
                  <Pill
                    label={it.item_type.toUpperCase()}
                    tone={it.item_type === 'curated' ? 'champagne' : it.item_type === 'intent' ? 'plum' : 'ink'}
                  />
                  <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                    <Pressable
                      onPress={() => editItem(it)}
                      hitSlop={12}
                    >
                      <Text variant="caption" color="champagne" style={{ fontWeight: '600' }}>Edit order</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmRemove(it)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${titleFor(it)} from cart`}
                    >
                      <Text variant="caption" color="danger" style={{ fontWeight: '600' }}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
                <Text variant="body" color="ink" style={{ fontWeight: '600', marginTop: 4 }} numberOfLines={1}>
                  {titleFor(it)}
                </Text>
                {it.item_type === 'intent' && it.intent_recipient ? (
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    For {it.intent_recipient}
                  </Text>
                ) : null}
                {it.flowers.length ? (
                  <Text variant="caption" color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                    {it.flowers.map((f) => `${f.quantity}× ${f.name}`).join(' · ')}
                  </Text>
                ) : null}
                <View style={styles.foot}>
                  <Text variant="caption" color="muted">Qty {it.quantity}</Text>
                  <Text variant="body" color="champagne" style={{ fontWeight: '600' }}>{thb(it.line_total_thb)}</Text>
                </View>
              </View>
            </View>
          ))}

          <Card tone="creamSoft" style={{ marginTop: space.lg }}>
            <View style={styles.totalRow}>
              <Text variant="eyebrow" color="champagne">SUBTOTAL</Text>
              <Text variant="h2" color="ink" style={{ fontVariant: ['tabular-nums'] }}>{thb(cart.subtotal_thb)}</Text>
            </View>
            <Text variant="caption" color="muted">
              Delivery to Bangkok metro included. Card and Florière packaging included.
            </Text>
            {error ? (
              <Text variant="caption" color="danger" style={{ marginTop: space.sm }}>{error}</Text>
            ) : null}
            <View style={{ height: space.lg }} />
            <Button label="Proceed to checkout →" onPress={() => router.push('/(purchaser)/checkout')} full />
          </Card>
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
    paddingHorizontal: space.xl,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    padding: space.md,
    marginBottom: space.md,
  },
  thumb: {
    width: 88, height: 88,
    borderRadius: radii.sm,
    backgroundColor: colors.creamSoft,
  },
  body: { flex: 1, justifyContent: 'space-between' },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: space.xl,
    ...shadow.card,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
