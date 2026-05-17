import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { Stars } from '../../components/Stars';
import { Text } from '../../components/Text';
import { apiGet, ApiError } from '../../lib/api';
import { useBreakpoint } from '../../lib/responsive';
import { thb } from '../../lib/format';
import { colors, space } from '../../theme';

type Metrics = {
  total_users: number;
  total_purchasers: number;
  total_sellers: number;
  total_orders: number;
  revenue_thb: number;
  orders_by_status: Record<string, number>;
  avg_rating: number;
  total_ratings: number;
  pending_cancel_requests: number;
  tips_total_thb?: number;
  tips_count?: number;
};

export default function AdminHome() {
  const router = useRouter();
  const bp = useBreakpoint();
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const r = await apiGet<Metrics>('/admin/metrics');
      setM(r);
    } catch (err) {
      setM(null);
      setLoadErr(err instanceof ApiError ? err.message : 'Could not load metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen background="cream" maxFrame="desktop">
      <AppHeader
        eyebrow="ADMIN"
        title="Florière operations"
        rightSlot={
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Pressable onPress={() => router.push('/(admin)/users')}>
              <Pill label="Users →" tone="muted" />
            </Pressable>
            <Pressable onPress={() => router.push('/(admin)/orders')}>
              <Pill label="Orders →" tone="champagne" />
            </Pressable>
            <Pressable onPress={() => router.push('/(admin)/vouchers' as any)}>
              <Pill label="Vouchers →" tone="plum" />
            </Pressable>
          </View>
        }
      />

      {loading ? (
        <ActivityIndicator color={colors.champagne} />
      ) : !m ? (
        <View style={{ width: '100%', alignItems: 'center', paddingTop: space.huge }}>
          <Text variant="h3" color="ink" align="center">Couldn't load metrics</Text>
          <Text variant="body" color="muted" align="center" style={{ marginTop: space.xs, maxWidth: 320 }}>
            {loadErr ?? 'The metrics endpoint returned an error.'}
          </Text>
          <View style={{ height: space.lg }} />
          <Button label="Try again" onPress={load} />
        </View>
      ) : (
        <>
          <View style={[styles.kpis, bp !== 'phone' && styles.kpisWide]}>
            <Card tone="white" style={[styles.kpi, bp !== 'phone' && styles.kpiWide]}>
              <Text variant="eyebrow" color="champagne">TOTAL USERS</Text>
              <Text variant="hero" color="ink" style={{ marginTop: 4 }}>{m.total_users}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                {m.total_purchasers} purchasers · {m.total_sellers} sellers
              </Text>
            </Card>
            <Card tone="white" style={[styles.kpi, bp !== 'phone' && styles.kpiWide]}>
              <Text variant="eyebrow" color="champagne">TOTAL ORDERS</Text>
              <Text variant="hero" color="ink" style={{ marginTop: 4 }}>{m.total_orders}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 4 }}>lifetime</Text>
            </Card>
            <Card tone="white" style={[styles.kpi, bp !== 'phone' && styles.kpiWide]}>
              <Text variant="eyebrow" color="champagne">GROSS REVENUE</Text>
              <Text variant="hero" color="ink" style={{ marginTop: 4 }}>{thb(m.revenue_thb)}</Text>
              <Text variant="caption" color="muted" style={{ marginTop: 4 }}>excludes cancellations</Text>
            </Card>
            <Card tone="white" style={[styles.kpi, bp !== 'phone' && styles.kpiWide]}>
              <Text variant="eyebrow" color="champagne">AVG RATING</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4, flexWrap: 'wrap' }}>
                <Stars value={Math.round(m.avg_rating)} size={16} />
                <Text variant="h2" color="ink">{m.avg_rating.toFixed(1)}</Text>
              </View>
              <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                {m.total_ratings} ratings
              </Text>
            </Card>
            <Card tone="white" style={[styles.kpi, bp !== 'phone' && styles.kpiWide]}>
              <Text variant="eyebrow" color="champagne">COURIER TIPS</Text>
              <Text variant="hero" color="ink" style={{ marginTop: 4 }}>
                {thb(m.tips_total_thb ?? 0)}
              </Text>
              <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                across {m.tips_count ?? 0} tipped order{(m.tips_count ?? 0) === 1 ? '' : 's'}
              </Text>
            </Card>
          </View>

          {m.pending_cancel_requests > 0 ? (
            <Card tone="creamSoft" style={{ width: '100%', marginTop: space.lg, borderColor: colors.danger }}>
              <Text variant="eyebrow" color="danger">
                {m.pending_cancel_requests} CANCELLATION REQUEST{m.pending_cancel_requests > 1 ? 'S' : ''} OPEN
              </Text>
              <Text variant="bodySm" color="ink" style={{ marginTop: space.xs }}>
                Open the affected orders to review or force-cancel.
              </Text>
              <Pressable onPress={() => router.push('/(admin)/orders')} style={{ marginTop: space.sm }}>
                <Pill label="OPEN ORDERS →" tone="danger" />
              </Pressable>
            </Card>
          ) : null}

          <Text variant="eyebrow" color="champagne" style={{ marginTop: space.xxl, marginBottom: space.sm }}>
            ORDER PIPELINE
          </Text>

          <View style={styles.pipeline}>
            {(['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'] as const).map((s) => (
              <Card key={s} tone="white" style={styles.pipeCard}>
                <Text variant="eyebrow" color="champagne">{s.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text variant="h1" color="ink" style={{ marginTop: 4 }}>
                  {m.orders_by_status[s] ?? 0}
                </Text>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kpis:     { width: '100%', gap: space.md },
  kpisWide: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  kpi:      { width: '100%' },
  kpiWide:  { flex: 1, minWidth: 160 },
  pipeline: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, width: '100%' },
  pipeCard: { minWidth: 140, flexGrow: 1, paddingVertical: space.md },
});
