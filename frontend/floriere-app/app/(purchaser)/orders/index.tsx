// Orders — marketplace-style list (Shopee "My purchases" pattern).
// Status filter tab strip at top; each row is a card with photo, recipient,
// status pill, total, and quick action (Track / Rate / Reorder).

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../../components/AppHeader';
import { Button } from '../../../components/Button';
import { Pill } from '../../../components/Pill';
import { PlaceholderImage, toneFromColor } from '../../../components/PlaceholderImage';
import { Screen } from '../../../components/Screen';
import { Stars } from '../../../components/Stars';
import { StatusBadge } from '../../../components/StatusBadge';
import { Text } from '../../../components/Text';
import { apiGet, apiPost, ApiError } from '../../../lib/api';
import type { Cart, Order, OrderStatus } from '../../../lib/types';
import { prettyDate, thb } from '../../../lib/format';
import { colors, radii, space } from '../../../theme';

type Filter = 'all' | 'review' | 'pending' | 'preparing' | 'out' | 'delivered' | 'cancelled';

const FILTERS: Array<{ key: Filter; label: string; matches: (s: OrderStatus) => boolean }> = [
  { key: 'all',        label: 'All',         matches: () => true },
  { key: 'review',     label: 'In review',   matches: (s) => s === 'pending_review' || s === 'awaiting_customer' },
  { key: 'pending',    label: 'To pay',      matches: (s) => s === 'pending' },
  { key: 'preparing',  label: 'Preparing',   matches: (s) => s === 'accepted' || s === 'preparing' },
  { key: 'out',        label: 'On the way',  matches: (s) => s === 'out_for_delivery' },
  { key: 'delivered',  label: 'Delivered',   matches: (s) => s === 'delivered' },
  { key: 'cancelled',  label: 'Cancelled',   matches: (s) => s === 'cancelled' },
];

function previewTone(o: Order): Parameters<typeof PlaceholderImage>[0]['tone'] {
  const first = o.items?.[0];
  const flower = first?.flowers?.[0];
  if (flower) return toneFromColor(flower.color);
  if (o.concierge_brief) return 'blush';
  return 'neutral';
}

export default function OrdersIndex() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter,  setFilter] = useState<Filter>('all');
  const [error,   setError]  = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  useEffect(() => {
    apiGet<Order[]>('/orders').then(setOrders).catch(() => setOrders([]));
  }, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const f = FILTERS.find((x) => x.key === filter)!;
    return orders.filter((o) => f.matches(o.status));
  }, [orders, filter]);

  async function reorder(o: Order) {
    if (reorderingId !== null) return;  // guard against double-tap
    setError(null);
    setReorderingId(o.id);
    try {
      await apiPost<Cart>(`/orders/${o.id}/reorder`, {});
      router.push('/(purchaser)/cart');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reorder.');
    } finally {
      setReorderingId(null);
    }
  }

  return (
    <Screen background="cream" maxFrame="tablet">
      <AppHeader eyebrow="YOUR ORDERS" title="Your purchases" back />

      <View style={styles.tabStrip}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={active ? [styles.tab, styles.tabActive] : styles.tab}>
              <Text variant="bodySm" color={active ? 'champagne' : 'muted'} style={active ? [styles.tabText, styles.tabTextActive] : styles.tabText}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text variant="caption" color="danger" style={{ marginBottom: space.md }}>{error}</Text> : null}

      {!orders ? (
        <ActivityIndicator color={colors.champagne} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="h2" color="ink" align="center">
            {filter === 'all'
              ? 'No orders yet'
              : `No orders in "${FILTERS.find((f) => f.key === filter)?.label}"`}
          </Text>
          <Text variant="body" color="muted" align="center" style={{ marginTop: space.sm, maxWidth: 340 }}>
            {filter === 'all'
              ? 'Send your first bouquet — it shows up here with live status.'
              : (orders?.length ?? 0) > 0
                ? `You have ${orders?.length} order${orders?.length === 1 ? '' : 's'} in other statuses.`
                : 'Send your first bouquet — it shows up here with live status.'}
          </Text>
          <View style={{ marginTop: space.xl }}>
            {filter === 'all' ? (
              <Button label="Browse curated →" onPress={() => router.push('/(purchaser)/curated' as any)} />
            ) : (
              <Button label="Show all orders" variant="secondary" onPress={() => setFilter('all')} />
            )}
          </View>
        </View>
      ) : (
        <View style={{ width: '100%' }}>
          {filtered.map((o) => {
            const tone = previewTone(o);
            const firstItem = o.items?.[0];
            const itemName =
              firstItem?.curated_name ??
              firstItem?.custom_label ??
              (firstItem?.item_type === 'intent' ? `Intent · ${firstItem.intent_occasion ?? ''}` : 'Bouquet');
            const moreCount = (o.items?.length ?? 1) - 1;
            const canReorder = o.status === 'delivered' || o.status === 'cancelled';
            const canRate    = o.status === 'delivered' && !o.rating_stars;

            return (
              <Pressable
                key={o.id}
                onPress={() => router.push(`/(purchaser)/orders/${o.id}` as any)}
                style={styles.row}
              >
                <View style={styles.thumbWrap}>
                  <PlaceholderImage label={itemName} subLabel={`#${o.id}`} tone={tone} size="sm" fill />
                </View>

                <View style={styles.body}>
                  <View style={styles.head}>
                    <Text variant="caption" color="muted" style={{ letterSpacing: 1 }}>
                      ORDER #{o.id}
                    </Text>
                    <StatusBadge status={o.status} />
                  </View>

                  <Text variant="body" color="ink" style={{ fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                    {itemName}{moreCount > 0 ? ` +${moreCount} more` : ''}
                  </Text>
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    For {o.recipient_name} · {prettyDate(o.delivery_date)}
                    {o.delivery_window ? ` · ${o.delivery_window}` : ''}
                  </Text>

                  <View style={styles.foot}>
                    <Text variant="body" color="champagne" style={{ fontWeight: '600' }}>{thb(o.total_thb)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      {o.cancel_request === 'requested' ? <Pill label="CANCEL REQ" tone="danger" /> : null}
                      {o.rating_stars ? (
                        <Stars value={o.rating_stars} size={12} />
                      ) : canRate ? (
                        <Pressable onPress={() => router.push(`/(purchaser)/orders/${o.id}` as any)} style={styles.miniBtn}>
                          <Text variant="caption" color="champagne" style={styles.miniBtnText}>Rate</Text>
                        </Pressable>
                      ) : null}
                      {canReorder ? (
                        <Pressable
                          onPress={() => reorder(o)}
                          disabled={reorderingId !== null}
                          style={[styles.miniBtnFilled, reorderingId !== null && { opacity: 0.5 }]}
                        >
                          <Text variant="caption" color="white" style={styles.miniBtnText}>
                            {reorderingId === o.id ? 'Adding…' : 'Buy again'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabStrip: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginBottom: space.lg,
  },
  tab: {
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
  tabActive: {
    borderColor: colors.champagne,
    backgroundColor: colors.champagneTint,
  },
  tabText: { fontWeight: '500' },
  tabTextActive: { fontWeight: '700' },

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
  thumbWrap: {
    width: 88, height: 88,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.creamSoft,
  },
  thumb: { width: '100%', height: '100%' },

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
    flexWrap: 'wrap',
    gap: space.xs,
  },
  miniBtn: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  miniBtnFilled: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.charcoal,
  },
  miniBtnText: { fontSize: 11, fontWeight: '600' },
});
