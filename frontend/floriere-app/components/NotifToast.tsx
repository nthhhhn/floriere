/**
 * Foreground "push-like" notification toast.
 *
 * Pass 3 — push notifications are out of scope per deck Slide 9 (and we have
 * no FCM/APNs integration), so this is the closest thing: a top-of-viewport
 * banner that appears when the unread count goes up.
 *
 * Pairs with the existing `NotifBell` poll (every 8s). When this component
 * observes a *fresh* unread item, it shows a 4s sliding toast with the most
 * recent notification body. Tapping it deep-links to the underlying screen.
 */

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';

import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import type { Notification } from '../lib/types';
import { colors, radii, space } from '../theme';

import { Text } from './Text';

const POLL_MS = 8_000;
const SHOW_MS = 4_500;

export function NotifToast() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [item, setItem] = useState<Notification | null>(null);
  const slide = useRef(new Animated.Value(-120)).current;
  const lastSeen = useRef<number>(0);
  const initRef  = useRef<boolean>(false);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const list = await apiGet<Notification[]>('/notifications');
        if (cancelled || list.length === 0) return;
        const top = list[0];
        // First tick after login — capture baseline, don't toast.
        if (!initRef.current) {
          lastSeen.current = top.id;
          initRef.current = true;
          return;
        }
        if (top.id !== lastSeen.current && !top.read_at) {
          lastSeen.current = top.id;
          show(top);
        }
      } catch { /* ignore */ }
    };

    tick();
    const handle = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(handle); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready]);

  function show(n: Notification) {
    setItem(n);
    Animated.timing(slide, {
      toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    setTimeout(() => hide(), SHOW_MS);
  }

  function hide() {
    Animated.timing(slide, {
      toValue: -120, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(() => setItem(null));
  }

  function tap() {
    if (!item) return;
    if (item.href) {
      // Defensive: strip leading "/(…)/" segments that exist as filesystem
      // segments. expo-router accepts "/(purchaser)/orders/123" as-is.
      router.push(item.href as any);
    } else {
      router.push('/notifications' as any);
    }
    hide();
  }

  if (!item) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { transform: [{ translateY: slide }] }]}
    >
      <Pressable onPress={tap} style={styles.toast}>
        <Text variant="eyebrow" color="champagne">FLORIÈRE</Text>
        <Text variant="body" color="ink" style={{ marginTop: 4 }} numberOfLines={1}>
          {item.title}
        </Text>
        {item.body ? (
          <Text variant="caption" color="muted" numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 12, left: 12, right: 12,
    zIndex: 9999,
    elevation: 30,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.cream,
    borderColor: colors.champagne,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: space.md,
    // Use modern boxShadow — RN 0.81 + RN-Web both support it; the legacy
    // shadow* props are deprecated and warn on web.
    boxShadow: '0 4px 12px rgba(28, 26, 23, 0.18)',
  } as any,
});
