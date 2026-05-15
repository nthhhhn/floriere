import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, space, usePressScale } from '../theme';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { Text } from './Text';

/** Inbox indicator. Pulls /notifications/unread_count every 8s while the screen is mounted. */
export function NotifBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const r = await apiGet<{ count: number }>('/notifications/unread_count');
        if (!cancelled) setCount(r.count);
      } catch { /* network blip — keep last value */ }
    };

    tick();
    const handle = setInterval(tick, 8000);
    return () => { cancelled = true; clearInterval(handle); };
  }, [user]);

  const press = usePressScale();

  if (!user) return null;
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        onPress={() => router.push('/notifications' as any)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.wrap}
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `Inbox, ${count} unread` : 'Inbox'}
      >
        <Text variant="eyebrow" color="champagne">INBOX</Text>
        {count > 0 ? (
          <View style={styles.dot}>
            <Text style={styles.dotLabel}>{count > 9 ? '9+' : count}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
    gap: 6,
  },
  dot: {
    minWidth: 18, height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.champagne,
    alignItems: 'center', justifyContent: 'center',
  },
  dotLabel: {
    color: colors.cream,
    fontSize: 10,
    fontWeight: '700',
  },
});
