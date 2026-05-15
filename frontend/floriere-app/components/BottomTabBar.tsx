import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { Text } from './Text';
import { colors, space, usePressScale } from '../theme';

type TabKey = 'home' | 'curated' | 'compose' | 'orders' | 'account';

const TABS: Array<{ key: TabKey; label: string; route: string }> = [
  { key: 'home',    label: 'Home',    route: 'home' },
  { key: 'curated', label: 'Shop',    route: 'curated' },
  { key: 'compose', label: 'Concierge', route: 'compose' },
  { key: 'orders',  label: 'Orders',  route: 'orders' },
  { key: 'account', label: 'Me',      route: 'account' },
];

function Icon({ name, active }: { name: TabKey; active: boolean }) {
  const stroke = active ? colors.champagne : colors.muted;
  const fill   = active ? colors.champagne : 'none';
  const sw = 1.7;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {name === 'home' ? (
        <Path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
              stroke={stroke} strokeWidth={sw} strokeLinejoin="round" fill={active ? 'rgba(184,148,93,0.12)' : 'none'} />
      ) : null}
      {name === 'curated' ? (
        <>
          <Path d="M4 8h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 8z"
                stroke={stroke} strokeWidth={sw} strokeLinejoin="round" fill={active ? 'rgba(184,148,93,0.12)' : 'none'} />
          <Path d="M8 8a4 4 0 1 1 8 0" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      ) : null}
      {name === 'compose' ? (
        <>
          <Circle cx={12} cy={8.5} r={3.2}  stroke={stroke} strokeWidth={sw} fill={active ? 'rgba(184,148,93,0.18)' : 'none'} />
          <Circle cx={7}  cy={12.5} r={2.6} stroke={stroke} strokeWidth={sw} fill={active ? 'rgba(184,148,93,0.10)' : 'none'} />
          <Circle cx={17} cy={12.5} r={2.6} stroke={stroke} strokeWidth={sw} fill={active ? 'rgba(184,148,93,0.10)' : 'none'} />
          <Path d="M12 14v6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      ) : null}
      {name === 'orders' ? (
        <>
          <Path d="M4 6h16M4 12h16M4 18h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      ) : null}
      {name === 'account' ? (
        <>
          <Circle cx={12} cy={8} r={3.6} stroke={stroke} strokeWidth={sw} fill={fill === 'none' ? 'none' : 'rgba(184,148,93,0.18)'} />
          <Path d="M4.5 20c.8-3.6 4-5.5 7.5-5.5s6.7 1.9 7.5 5.5"
                stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      ) : null}
    </Svg>
  );
}

function TabItem({
  tab, isFocused, onPress,
}: {
  tab: typeof TABS[number];
  isFocused: boolean;
  onPress: () => void;
}) {
  const press = usePressScale(0.92);
  return (
    <Animated.View style={[styles.tabWrap, { transform: [{ scale: press.scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.tab}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
      >
        <Icon name={tab.key} active={isFocused} />
        <Text
          variant="caption"
          color={isFocused ? 'champagne' : 'muted'}
          style={[styles.label, isFocused && styles.labelActive]}
        >
          {tab.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const visible = state.routes.filter((r) => TABS.find((t) => t.route === r.name));

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const route = visible.find((r) => r.name === tab.route);
        if (!route) return null;
        const isFocused = state.routes[state.index].name === tab.route;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };
        return <TabItem key={tab.key} tab={tab} isFocused={isFocused} onPress={onPress} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
    paddingTop: space.sm,
    paddingBottom: space.md,
    paddingHorizontal: space.sm,
  },
  tabWrap: { flex: 1 },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  labelActive: { fontWeight: '600' },
});
