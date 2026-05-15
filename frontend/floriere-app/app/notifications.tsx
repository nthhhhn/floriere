// Notifications inbox — marketplace list rows (Shopee inbox pattern).
// Round icon by kind, title + body, unread dot on the right, relative time.

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { apiGet, apiPost } from '../lib/api';
import type { Notification } from '../lib/types';
import { relativeTime } from '../lib/format';
import { colors, radii, space } from '../theme';

type KindStyle = { bg: string; fg: string; label: string; icon: 'truck' | 'chat' | 'star' | 'x' | 'bell' };

const KIND_STYLES: Record<string, KindStyle> = {
  'order.status':  { bg: colors.champagneBg, fg: colors.champagne, label: 'STATUS',  icon: 'truck' },
  'order.message': { bg: colors.plumBg,      fg: colors.plum,      label: 'MESSAGE', icon: 'chat' },
  'order.rating':  { bg: colors.successBg,   fg: colors.success,   label: 'RATING',  icon: 'star' },
  'order.cancel':  { bg: colors.dangerBg,    fg: colors.danger,    label: 'CANCEL',  icon: 'x' },
};
const DEFAULT_KIND: KindStyle = { bg: colors.creamRule, fg: colors.muted, label: 'INFO', icon: 'bell' };

function KindIcon({ icon, fg }: { icon: KindStyle['icon']; fg: string }) {
  const sw = 1.7;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {icon === 'truck' ? (
        <>
          <Path d="M3 7h11v9H3z" stroke={fg} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M14 11h4l3 3v2h-7" stroke={fg} strokeWidth={sw} strokeLinejoin="round" />
          <Circle cx={7} cy={18} r={1.6} stroke={fg} strokeWidth={sw} />
          <Circle cx={17} cy={18} r={1.6} stroke={fg} strokeWidth={sw} />
        </>
      ) : null}
      {icon === 'chat' ? (
        <Path d="M4 5h16v11H8l-4 4z" stroke={fg} strokeWidth={sw} strokeLinejoin="round" />
      ) : null}
      {icon === 'star' ? (
        <Path d="m12 3 2.5 5.5L20 9.5l-4 4 1 5.5-5-2.7-5 2.7 1-5.5-4-4 5.5-1z" stroke={fg} strokeWidth={sw} strokeLinejoin="round" />
      ) : null}
      {icon === 'x' ? (
        <>
          <Circle cx={12} cy={12} r={9} stroke={fg} strokeWidth={sw} />
          <Path d="m8 8 8 8M16 8l-8 8" stroke={fg} strokeWidth={sw} strokeLinecap="round" />
        </>
      ) : null}
      {icon === 'bell' ? (
        <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16zm4 4h4" stroke={fg} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </Svg>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Notification[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await apiGet<Notification[]>('/notifications');
      setList(rows);
    } catch {
      setList([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    setBusy(true);
    try {
      await apiPost('/notifications/read', {});
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function open(n: Notification) {
    if (!n.read_at) {
      try { await apiPost('/notifications/read', { ids: [n.id] }); } catch { /* ignore */ }
    }
    if (n.href) router.push(n.href as any);
    else if (n.order_id) router.push(`/(purchaser)/orders/${n.order_id}` as any);
  }

  const unreadCount = list?.filter((n) => !n.read_at).length ?? 0;

  return (
    <Screen background="cream" maxFrame="tablet">
      <AppHeader
        eyebrow="ACTIVITY"
        title="Your order updates"
        back
        showBell={false}
        rightSlot={
          unreadCount > 0 ? (
            <Button label="Mark all read" variant="secondary" size="sm" onPress={markAllRead} loading={busy} />
          ) : null
        }
      />

      {unreadCount > 0 ? (
        <View style={styles.summaryRow}>
          <Text variant="bodySm" color="muted">
            {unreadCount} new {unreadCount === 1 ? 'update' : 'updates'}
          </Text>
        </View>
      ) : null}

      {list === null ? (
        <ActivityIndicator color={colors.champagne} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyArt}>
            <KindIcon icon="bell" fg={colors.champagne} />
          </View>
          <Text variant="h3" color="ink" align="center" style={{ marginTop: space.lg }}>
            All caught up
          </Text>
          <Text variant="body" color="muted" align="center" style={{ marginTop: space.xs, paddingHorizontal: space.xl }}>
            Status changes, studio messages, and rating prompts for your orders show up here.
          </Text>
        </View>
      ) : (
        <View style={{ width: '100%' }}>
          {list.map((n) => {
            const unread = !n.read_at;
            const kind = KIND_STYLES[n.kind] ?? DEFAULT_KIND;
            return (
              <Pressable key={n.id} onPress={() => open(n)} style={[styles.row, unread && styles.rowUnread]}>
                <View style={[styles.iconWrap, { backgroundColor: kind.bg }]}>
                  <KindIcon icon={kind.icon} fg={kind.fg} />
                </View>
                <View style={styles.body}>
                  <View style={styles.head}>
                    <Text variant="caption" color="muted" style={styles.kindLabel}>{kind.label}</Text>
                    <Text variant="caption" color="muted">{relativeTime(n.created_at)}</Text>
                  </View>
                  <Text
                    variant="body"
                    color="ink"
                    numberOfLines={1}
                    style={[{ marginTop: 2 }, unread && { fontWeight: '700' }]}
                  >
                    {n.title}
                  </Text>
                  {n.body ? (
                    <Text variant="caption" color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                      {n.body}
                    </Text>
                  ) : null}
                </View>
                {unread ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    width: '100%',
    paddingBottom: space.sm,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    padding: space.md,
    marginBottom: space.sm,
  },
  rowUnread: {
    borderColor: colors.champagne,
    backgroundColor: colors.champagneTint,
  },
  iconWrap: {
    width: 38, height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kindLabel: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    fontSize: 10,
  },
  unreadDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.champagne,
    marginTop: 6,
  },
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
});
