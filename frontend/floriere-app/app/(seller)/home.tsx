import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { PlaceholderImage, toneFromColor } from '../../components/PlaceholderImage';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Stars } from '../../components/Stars';
import { Text } from '../../components/Text';
import { apiGet, apiPatch } from '../../lib/api';
import { useBreakpoint } from '../../lib/responsive';
import type { Flower, MerchantPublic, Order, SellerRating, SellerTipStats } from '../../lib/types';
import { prettyDate, relativeTime, thb } from '../../lib/format';
import { colors, radii, space } from '../../theme';

function orderTone(o: Order): Parameters<typeof PlaceholderImage>[0]['tone'] {
  const first = o.items?.[0];
  const flower = first?.flowers?.[0];
  if (flower) return toneFromColor(flower.color);
  if (o.concierge_brief) return 'blush';
  return 'neutral';
}

type Merchant = MerchantPublic;

export default function SellerHome() {
  const router = useRouter();
  const bp = useBreakpoint();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [orders, setOrders]     = useState<Order[] | null>(null);
  const [lowStock, setLowStock] = useState<Flower[]>([]);
  const [ratings, setRatings]   = useState<SellerRating[]>([]);
  const [tips, setTips]         = useState<SellerTipStats | null>(null);
  const [busy, setBusy]         = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, list, lows, revs, ts] = await Promise.all([
        apiGet<{ merchant: Merchant | null }>('/seller/me'),
        apiGet<Order[]>('/orders/incoming'),
        apiGet<Flower[]>('/seller/low_stock').catch(() => [] as Flower[]),
        apiGet<SellerRating[]>('/seller/ratings').catch(() => [] as SellerRating[]),
        apiGet<SellerTipStats>('/seller/tips').catch(() => null),
      ]);
      setMerchant(m.merchant);
      setOrders(list);
      setLowStock(lows);
      setRatings(revs);
      setTips(ts);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleOpen() {
    if (!merchant) return;
    setBusy(true);
    try {
      await apiPatch('/seller/me', { is_open: !merchant.is_open });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const counts = (orders ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    if (o.cancel_request === 'requested') {
      acc.cancel_req = (acc.cancel_req ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <Screen background="cream" maxFrame="tablet">
      <AppHeader
        eyebrow="MERCHANT"
        title={merchant?.shop_name ?? 'Your shop'}
        rightSlot={
          <Pressable onPress={() => router.push('/(seller)/catalog')}>
            <Pill label="Manage stems →" tone="champagne" />
          </Pressable>
        }
      />

      {merchant ? (
        <Card tone="creamSoft" style={{ width: '100%', marginBottom: space.lg }}>
          <View style={styles.shopRow}>
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow" color={merchant.is_open ? 'champagne' : 'danger'}>
                {merchant.is_open ? 'OPEN — ACCEPTING ORDERS' : 'CLOSED — SCHEDULED ONLY'}
              </Text>
              <Text variant="body" color="ink" style={{ marginTop: 4 }}>
                Hours {merchant.open_hour}:00–{merchant.close_hour}:00
              </Text>
              {merchant.review_count ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 }}>
                  <Stars value={Math.round(merchant.avg_stars ?? 0)} size={16} />
                  <Text variant="caption" color="muted">
                    {(merchant.avg_stars ?? 0).toFixed(1)} · {merchant.review_count} ratings
                  </Text>
                </View>
              ) : null}
            </View>
            <Button
              label={merchant.is_open ? 'Close shop' : 'Open shop'}
              variant={merchant.is_open ? 'secondary' : 'primary'}
              size="sm"
              onPress={toggleOpen}
              loading={busy}
            />
          </View>
        </Card>
      ) : null}

      {/* KPI row */}
      <View style={[styles.kpis, bp !== 'phone' && styles.kpisWide]}>
        {(['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'] as const).map((s) => (
          <Card key={s} tone="white" style={[styles.kpi, bp !== 'phone' && styles.kpiWide]}>
            <Text variant="eyebrow" color="champagne">{s.replace(/_/g, ' ').toUpperCase()}</Text>
            <Text variant="h1" color="ink" style={{ marginTop: 4 }}>{counts[s] ?? 0}</Text>
          </Card>
        ))}
      </View>

      {counts.cancel_req ? (
        <Card tone="creamSoft" style={{ width: '100%', marginTop: space.md, borderColor: colors.danger }}>
          <Text variant="eyebrow" color="danger">
            {counts.cancel_req} CANCELLATION REQUEST{counts.cancel_req > 1 ? 'S' : ''} PENDING
          </Text>
          <Text variant="bodySm" color="ink" style={{ marginTop: 4 }}>
            Open the affected orders below to approve or deny.
          </Text>
        </Card>
      ) : null}

      {lowStock.length > 0 ? (
        <Card tone="creamSoft" style={{ width: '100%', marginTop: space.md }}>
          <Text variant="eyebrow" color="danger">LOW STOCK</Text>
          <Text variant="bodySm" color="ink" style={{ marginTop: 4 }}>
            {lowStock.map((f) => `${f.name} (${f.color}) · ${f.stock} left`).join('  ·  ')}
          </Text>
        </Card>
      ) : null}

      {tips ? (
        <Card tone="creamSoft" style={{ width: '100%', marginTop: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow" color="champagne">TIPS THIS WEEK</Text>
              <Text variant="h1" color="ink" style={{ marginTop: 4 }}>
                ฿{tips.week_thb.toLocaleString('en-US')}
              </Text>
              <Text variant="caption" color="muted">
                across {tips.week_count} order{tips.week_count === 1 ? '' : 's'} · all-time {`฿${tips.total_thb.toLocaleString('en-US')}`}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Text variant="eyebrow" color="champagne" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        INCOMING ORDERS
      </Text>

      {!orders ? (
        <ActivityIndicator color={colors.champagne} />
      ) : orders.length === 0 ? (
        <Card tone="creamSoft" style={{ width: '100%' }}>
          <Text variant="quote" color="muted">No orders yet — your first will appear here.</Text>
        </Card>
      ) : (
        <View style={{ width: '100%' }}>
          {orders.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => router.push(`/(seller)/orders/${o.id}` as any)}
              style={styles.orderRow}
            >
              <View style={styles.orderThumb}>
                <PlaceholderImage label={`#${o.id}`} subLabel={o.recipient_name} tone={orderTone(o)} size="sm" fill />
              </View>
              <View style={styles.orderBody}>
                <View style={styles.orderHead}>
                  <Text variant="caption" color="muted" style={{ letterSpacing: 1 }}>ORDER #{o.id}</Text>
                  <StatusBadge status={o.status} />
                </View>
                <Text variant="body" color="ink" style={{ fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                  For {o.recipient_name}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  From {o.purchaser_name ?? '—'} · {prettyDate(o.delivery_date)}
                  {o.delivery_window ? ` · ${o.delivery_window}` : ''}
                </Text>
                <View style={styles.orderFoot}>
                  <Text variant="body" color="champagne" style={{ fontWeight: '600' }}>{thb(o.total_thb)}</Text>
                  {o.cancel_request === 'requested' ? <Pill label="CANCEL REQ" tone="danger" /> : null}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {ratings.length > 0 ? (
        <>
          <Text variant="eyebrow" color="champagne" style={{ marginTop: space.xl, marginBottom: space.sm }}>
            RECENT RATINGS
          </Text>
          {ratings.slice(0, 5).map((r) => (
            <Card key={r.order_id} tone="white" style={{ width: '100%', marginBottom: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Stars value={r.stars} size={16} />
                <Text variant="caption" color="muted">
                  Order #{r.order_id} · {r.reviewer_name} · {r.created_at ? relativeTime(r.created_at) : ''}
                </Text>
              </View>
              {r.comment ? (
                <Text variant="bodySm" color="ink" style={{ marginTop: 4 }}>"{r.comment}"</Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shopRow:  { flexDirection: 'row', alignItems: 'center', gap: space.md },
  kpis:     { width: '100%', gap: space.sm },
  kpisWide: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
  kpi:      { width: '100%', paddingVertical: space.md },
  kpiWide:  { width: '18%' },
  row:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderRow: {
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
  orderThumb: {
    width: 80, height: 80,
    borderRadius: radii.sm,
    backgroundColor: colors.creamSoft,
  },
  orderBody: { flex: 1, justifyContent: 'space-between' },
  orderHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
    flexWrap: 'wrap',
    gap: space.xs,
  },
});
