// Admin orders — operator view of every order with status override.
// Marketplace-leaning row layout: thumbnail + actors + status + override menu.

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { Pill } from '../../components/Pill';
import { PlaceholderImage, toneFromColor } from '../../components/PlaceholderImage';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Text } from '../../components/Text';
import { apiGet, apiPatch, ApiError } from '../../lib/api';
import type { Order, OrderStatus } from '../../lib/types';
import { prettyDate, statusLabel, thb } from '../../lib/format';
import { colors, radii, space } from '../../theme';

const ALL: OrderStatus[] = [
  'pending', 'pending_review', 'awaiting_customer',
  'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled',
];

function orderTone(o: Order): Parameters<typeof PlaceholderImage>[0]['tone'] {
  const first = o.items?.[0];
  const flower = first?.flowers?.[0];
  if (flower) return toneFromColor(flower.color);
  if (o.concierge_brief) return 'blush';
  return 'neutral';
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'cancel_req' | OrderStatus>('all');
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await apiGet<Order[]>('/orders/all');
      setOrders(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load orders.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function override(id: number, s: OrderStatus) {
    try {
      await apiPatch(`/orders/${id}/status`, { status: s });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    }
  }

  const filtered = (orders ?? []).filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'cancel_req') return o.cancel_request === 'requested';
    return o.status === filter;
  });

  return (
    <Screen background="cream" maxFrame="desktop">
      <AppHeader eyebrow="ADMIN" title="All orders" back />

      {error ? <Text variant="caption" color="danger" style={{ marginBottom: space.md }}>{error}</Text> : null}

      <View style={styles.filterRow}>
        <Pressable onPress={() => setFilter('all')} style={filter === 'all' ? [styles.chip, styles.chipActive] : styles.chip}>
          <Text variant="bodySm" color={filter === 'all' ? 'champagne' : 'ink'} style={filter === 'all' ? [styles.chipText, styles.chipTextActive] : styles.chipText}>All</Text>
        </Pressable>
        <Pressable onPress={() => setFilter('cancel_req')} style={filter === 'cancel_req' ? [styles.chip, styles.chipDanger] : styles.chip}>
          <Text variant="bodySm" color={filter === 'cancel_req' ? 'danger' : 'ink'} style={filter === 'cancel_req' ? [styles.chipText, styles.chipTextActive] : styles.chipText}>Cancel req</Text>
        </Pressable>
        {ALL.map((s) => {
          const active = filter === s;
          return (
            <Pressable key={s} onPress={() => setFilter(s)} style={active ? [styles.chip, styles.chipActive] : styles.chip}>
              <Text variant="bodySm" color={active ? 'champagne' : 'ink'} style={active ? [styles.chipText, styles.chipTextActive] : styles.chipText}>
                {statusLabel(s)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {orders === null ? null : filtered.length === 0 ? (
        <Text variant="body" color="muted">No orders match this filter.</Text>
      ) : (
        <View style={{ width: '100%' }}>
          {filtered.map((o) => (
            <View key={o.id} style={styles.row}>
              <View style={styles.thumb}>
                <PlaceholderImage label={`#${o.id}`} subLabel={o.recipient_name} tone={orderTone(o)} size="sm" fill />
              </View>
              <View style={styles.body}>
                <View style={styles.head}>
                  <Text variant="caption" color="muted" style={{ letterSpacing: 1 }}>ORDER #{o.id}</Text>
                  <StatusBadge status={o.status} />
                </View>
                <Text variant="body" color="ink" style={{ fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                  {o.purchaser_name ?? '—'} → {o.recipient_name}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {o.shop_name ?? '—'} · {prettyDate(o.delivery_date)}
                  {o.delivery_window ? ` · ${o.delivery_window}` : ''} · {thb(o.total_thb)}
                </Text>
                <View style={styles.foot}>
                  {o.cancel_request === 'requested' ? <Pill label="CANCEL REQ" tone="danger" /> : <View />}
                </View>
                <Text variant="caption" color="muted" style={styles.overrideLabel}>OVERRIDE</Text>
                <View style={styles.overrideRow}>
                  {ALL.filter((s) => s !== o.status).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => override(o.id, s)}
                      style={s === 'cancelled' ? [styles.overrideChip, styles.overrideChipDanger] : styles.overrideChip}
                    >
                      <Text
                        variant="caption"
                        color={s === 'cancelled' ? 'danger' : 'champagne'}
                        style={s === 'cancelled' ? [styles.overrideText, styles.overrideTextDanger] : styles.overrideText}
                      >
                        → {statusLabel(s)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginBottom: space.lg,
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
  chipDanger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
  },
  chipText: { fontWeight: '500' },

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
    width: 80, height: 80,
    borderRadius: radii.sm,
    backgroundColor: colors.creamSoft,
  },
  body: { flex: 1 },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foot: {
    flexDirection: 'row',
    marginTop: space.xs,
  },
  overrideLabel: {
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: space.sm,
    marginBottom: 4,
    fontSize: 10,
  },
  overrideRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chipTextActive:    { fontWeight: '700' },
  overrideTextDanger:{ fontWeight: '700' },
  overrideChip: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.champagne,
    backgroundColor: colors.white,
  },
  overrideChipDanger: { borderColor: colors.danger },
  overrideText: { fontSize: 11 },
});
