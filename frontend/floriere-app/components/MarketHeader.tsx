import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from './Text';
import { NotifBell } from './NotifBell';
import { colors, radii, space } from '../theme';
import { useAuth } from '../lib/auth-context';

type Props = {
  search?: string;
  onSearch?: (q: string) => void;
  placeholder?: string;
  showSearch?: boolean;
  showCart?: boolean;
  cartCount?: number;
  rightAccessory?: React.ReactNode;
  brandLabel?: string;
};

function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={colors.muted} strokeWidth={1.7} />
      <Path d="m20 20-4-4" stroke={colors.muted} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

function CartIcon({ count }: { count: number }) {
  return (
    <View>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 4h2l2.5 12.5A2 2 0 0 0 9.45 18h8.6a2 2 0 0 0 1.97-1.63L21.5 8H6"
          stroke={colors.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
        />
        <Circle cx={10} cy={20.5} r={1.3} fill={colors.ink} />
        <Circle cx={17} cy={20.5} r={1.3} fill={colors.ink} />
      </Svg>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text variant="caption" color="white" style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function MarketHeader({
  search, onSearch, placeholder = 'Search bouquets, flowers, occasions…',
  showSearch = true, showCart = true, cartCount = 0, rightAccessory,
  brandLabel = 'Florière',
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [local, setLocal] = useState(search ?? '');

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text variant="h2" color="ink" style={styles.brand}>{brandLabel}</Text>
        <View style={styles.right}>
          {rightAccessory}
          {user ? <NotifBell /> : null}
          {showCart ? (
            <Pressable onPress={() => router.push('/(purchaser)/cart' as any)} hitSlop={8}>
              <CartIcon count={cartCount} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showSearch ? (
        <Pressable
          onPress={() => router.push('/(purchaser)/curated' as any)}
          style={styles.searchBox}
        >
          <View style={styles.searchInner}>
            <SearchIcon />
            <TextInput
              value={onSearch ? (search ?? local) : local}
              onChangeText={(v) => { setLocal(v); onSearch?.(v); }}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              style={styles.input}
              returnKeyType="search"
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingTop: space.md,
    paddingBottom: space.md,
    marginBottom: space.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  brand: {
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  searchBox: {
    width: '100%',
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.creamRule,
    borderRadius: radii.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 2,
  },
  badge: {
    position: 'absolute',
    top: -6, right: -8,
    backgroundColor: colors.champagne,
    borderRadius: 11,
    minWidth: 20, height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.cream,
  },
  badgeText: {
    fontSize: 11, lineHeight: 14, fontWeight: '700',
  },
});
