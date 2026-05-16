import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, space, usePressScale } from '../theme';
import { Text } from './Text';
import { Button } from './Button';
import { NotifBell } from './NotifBell';
import { useAuth } from '../lib/auth-context';

type Props = {
  eyebrow?: string;
  title?: string;
  showLogout?: boolean;
  showBell?: boolean;
  rightSlot?: React.ReactNode;
};

export function AppHeader({
  eyebrow,
  title,
  showLogout = true,
  showBell   = true,
  rightSlot,
}: Props) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const backPress = usePressScale();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {eyebrow ? <Text variant="eyebrow" color="champagne">{eyebrow}</Text> : null}
        {title ? <Text variant="h2" color="ink" style={{ marginTop: 4 }}>{title}</Text> : null}
        {user ? (
          <Text variant="caption" color="muted" style={{ marginTop: space.xs }}>
            Signed in as {user.name} · {user.email}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {rightSlot}
        {showBell && user ? <NotifBell /> : null}
        {showLogout && user ? (
          <Button label="Sign out" variant="ghost" size="sm" onPress={signOut} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: space.lg,
    paddingBottom: space.lg,
    // Refined hairline divider — softer than full creamRule.
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHair,
    marginBottom: space.xl,
    gap: space.lg,
  },
  left:  { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  back:  {
    marginBottom: space.sm,
    paddingVertical: space.xs,
    paddingRight: space.sm,
    minHeight: 32,
    justifyContent: 'center',
  },
});
