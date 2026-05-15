// Account ("Me") — marketplace-style hub.
// Top: profile header with avatar + email + sign-out chip.
// Middle: tile grid of order shortcuts (To pay / To prepare / To receive / Review).
// Then: menu list (Orders, Favorites, Vouchers, Help) Shopee-style.
// Then: Address book + saved recipients (collapsed by default to keep page short).

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiDelete, apiGet, apiPost, ApiError } from '../../lib/api';
import type { Address, Order, Recipient } from '../../lib/types';
import { useAuth } from '../../lib/auth-context';
import { colors, radii, space } from '../../theme';

type StatusCount = { pending: number; preparing: number; out: number; delivered: number };

const STATUS_BUCKETS: Array<{
  key: keyof StatusCount; label: string;
  matches: (s: Order['status']) => boolean;
}> = [
  { key: 'pending',   label: 'To pay',      matches: (s) => s === 'pending' },
  { key: 'preparing', label: 'Preparing',   matches: (s) => s === 'accepted' || s === 'preparing' },
  { key: 'out',       label: 'On the way',  matches: (s) => s === 'out_for_delivery' },
  { key: 'delivered', label: 'To review',   matches: (s) => s === 'delivered' },
];

const MENU = [
  { key: 'orders',     label: 'My orders',     href: '/(purchaser)/orders' },
  { key: 'favorites',  label: 'Favorites',     href: '/(purchaser)/favorites' },
  { key: 'cart',       label: 'My cart',       href: '/(purchaser)/cart' },
  { key: 'notif',      label: 'Order updates', href: '/notifications' },
] as const;

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="m9 6 6 6-6 6" stroke={colors.muted} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <View style={styles.avatar}>
      <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
        <Circle cx={28} cy={28} r={27} fill={colors.champagneBg} stroke={colors.champagne} strokeWidth={1} />
      </Svg>
      <View style={styles.avatarText}>
        <Text variant="h2" color="champagne">{initial}</Text>
      </View>
    </View>
  );
}

export default function Account() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [counts, setCounts] = useState<StatusCount>({ pending: 0, preparing: 0, out: 0, delivered: 0 });
  const [addrs, setAddrs]   = useState<Address[]>([]);
  const [recs, setRecs]     = useState<Recipient[]>([]);
  const [error, setError]   = useState<string | null>(null);
  const [showForms, setShowForms] = useState(false);

  // address draft
  const [aLabel, setALabel]       = useState('');
  const [aAddress, setAAddress]   = useState('');
  const [aDistrict, setADistrict] = useState('');
  const [aDefault, setADefault]   = useState(false);

  // recipient draft
  const [rName, setRName]   = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rRel, setRRel]     = useState('');

  const load = useCallback(async () => {
    try {
      const [a, r, orders] = await Promise.all([
        apiGet<Address[]>('/account/addresses'),
        apiGet<Recipient[]>('/account/recipients'),
        apiGet<Order[]>('/orders').catch(() => []),
      ]);
      setAddrs(a);
      setRecs(r);

      const c: StatusCount = { pending: 0, preparing: 0, out: 0, delivered: 0 };
      orders.forEach((o) => {
        STATUS_BUCKETS.forEach((b) => { if (b.matches(o.status)) c[b.key] += 1; });
      });
      setCounts(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load account.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addAddress() {
    setError(null);
    if (!aLabel.trim() || !aAddress.trim()) { setError('Address needs a label and a body.'); return; }
    try {
      await apiPost('/account/addresses', {
        label: aLabel.trim(),
        address: aAddress.trim(),
        district: aDistrict.trim() || null,
        is_default: aDefault,
      });
      setALabel(''); setAAddress(''); setADistrict(''); setADefault(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save address.');
    }
  }

  async function removeAddress(id: number) {
    try { await apiDelete(`/account/addresses/${id}`); await load(); } catch { /* ignore */ }
  }

  async function addRecipient() {
    setError(null);
    if (!rName.trim()) { setError('Recipient name is required.'); return; }
    try {
      await apiPost('/account/recipients', {
        name: rName.trim(),
        phone: rPhone.trim() || null,
        relation: rRel.trim() || null,
      });
      setRName(''); setRPhone(''); setRRel('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save recipient.');
    }
  }

  async function removeRecipient(id: number) {
    try { await apiDelete(`/account/recipients/${id}`); await load(); } catch { /* ignore */ }
  }

  return (
    <Screen background="cream" maxFrame="tablet">
      {/* Profile header */}
      <View style={styles.profileBlock}>
        <Avatar name={user?.name ?? '?'} />
        <View style={{ flex: 1 }}>
          <Text variant="h3" color="ink">{user?.name ?? 'Account'}</Text>
          <Text variant="caption" color="muted">{user?.email}</Text>
          <Pressable onPress={signOut} style={styles.signOutChip}>
            <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      {/* Order shortcuts */}
      <Pressable onPress={() => router.push('/(purchaser)/orders' as any)} style={styles.statusCard}>
        <View style={styles.statusHead}>
          <Text variant="bodySm" color="ink" style={{ fontWeight: '600' }}>My orders</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="caption" color="muted">View all</Text>
            <ChevronRight />
          </View>
        </View>
        <View style={styles.statusGrid}>
          {STATUS_BUCKETS.map((b) => (
            <View key={b.key} style={styles.statusCell}>
              <View style={styles.statusIconWrap}>
                <Text variant="h3" color="champagne">{counts[b.key] || 0}</Text>
              </View>
              <Text variant="caption" color="muted" align="center">{b.label}</Text>
            </View>
          ))}
        </View>
      </Pressable>

      {error ? <Text variant="caption" color="danger" style={{ marginBottom: space.md }}>{error}</Text> : null}

      {/* Menu list */}
      <View style={styles.menuCard}>
        {MENU.map((m, idx) => (
          <Pressable
            key={m.key}
            onPress={() => router.push(m.href as any)}
            style={[styles.menuRow, idx > 0 && styles.menuRowDivider]}
          >
            <Text variant="body" color="ink">{m.label}</Text>
            <ChevronRight />
          </Pressable>
        ))}
      </View>

      {/* Saved addresses summary */}
      <Pressable onPress={() => setShowForms((v) => !v)} style={[styles.menuCard, { marginTop: space.md }]}>
        <View style={styles.menuRow}>
          <View>
            <Text variant="body" color="ink">Addresses & recipients</Text>
            <Text variant="caption" color="muted">
              {addrs.length} {addrs.length === 1 ? 'address' : 'addresses'} · {recs.length} {recs.length === 1 ? 'recipient' : 'recipients'}
            </Text>
          </View>
          <Text variant="caption" color="champagne" style={{ fontWeight: '600' }}>
            {showForms ? 'Hide' : 'Manage'}
          </Text>
        </View>
      </Pressable>

      {showForms ? (
        <View style={{ width: '100%', marginTop: space.md }}>
          <Text variant="eyebrow" color="champagne" style={styles.section}>SAVED ADDRESSES</Text>
          {addrs.length === 0 ? (
            <Text variant="body" color="muted" style={{ marginBottom: space.md }}>
              No addresses saved yet — add one for one-tap checkout.
            </Text>
          ) : (
            <View style={{ width: '100%', marginBottom: space.md }}>
              {addrs.map((a) => (
                <Card key={a.id} tone="white" style={{ width: '100%', marginBottom: space.sm }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                        <Text variant="h3" color="ink">{a.label}</Text>
                        {a.is_default ? <Pill label="DEFAULT" tone="champagne" /> : null}
                      </View>
                      <Text variant="bodySm" color="muted" style={{ marginTop: 2 }}>{a.address}</Text>
                      {a.district ? <Text variant="caption" color="muted">{a.district}</Text> : null}
                    </View>
                    <Pressable onPress={() => removeAddress(a.id)}>
                      <Text variant="caption" color="danger">Remove</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <Card tone="white" style={{ width: '100%', marginBottom: space.xl }}>
            <Text variant="eyebrow" color="champagne">ADD ADDRESS</Text>
            <Field label="Label"    value={aLabel}    onChangeText={setALabel}    placeholder="Home, Office, Mom's…" />
            <Field label="Address"  value={aAddress}  onChangeText={setAAddress}
              placeholder="Building, room, road, district, Bangkok"
              multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' as const } as any} />
            <Field label="District" value={aDistrict} onChangeText={setADistrict} placeholder="Khlong Toei" />
            <Pressable
              style={[styles.toggle, aDefault && styles.toggleOn]}
              onPress={() => setADefault((v) => !v)}
            >
              <View style={[styles.dot, aDefault && styles.dotOn]} />
              <Text variant="bodySm" color="ink" style={{ marginLeft: space.md }}>Set as default</Text>
            </Pressable>
            <Button label="Save address" onPress={addAddress} full />
          </Card>

          <Text variant="eyebrow" color="champagne" style={styles.section}>SAVED RECIPIENTS</Text>
          {recs.length === 0 ? (
            <Text variant="body" color="muted" style={{ marginBottom: space.md }}>
              No recipients yet — save the people you send to most.
            </Text>
          ) : (
            <View style={{ width: '100%', marginBottom: space.md }}>
              {recs.map((r) => (
                <Card key={r.id} tone="white" style={{ width: '100%', marginBottom: space.sm }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" color="ink">{r.name}</Text>
                      <Text variant="caption" color="muted">
                        {(r.relation ?? '—')}{r.phone ? ` · ${r.phone}` : ''}
                      </Text>
                    </View>
                    <Pressable onPress={() => removeRecipient(r.id)}>
                      <Text variant="caption" color="danger">Remove</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <Card tone="white" style={{ width: '100%' }}>
            <Text variant="eyebrow" color="champagne">ADD RECIPIENT</Text>
            <Field label="Name"      value={rName}  onChangeText={setRName}  placeholder="Mali" />
            <Field label="Phone"     value={rPhone} onChangeText={setRPhone} placeholder="+66 …" keyboardType="phone-pad" />
            <Field label="Relation"  value={rRel}   onChangeText={setRRel}   placeholder="Partner, friend, mom…" />
            <Button label="Save recipient" onPress={addRecipient} full />
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileBlock: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.md,
    paddingBottom: space.lg,
    marginBottom: space.md,
  },
  avatar: {
    width: 56, height: 56, position: 'relative',
  },
  avatarText: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  signOutChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
  statusCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    padding: space.lg,
    marginBottom: space.md,
  },
  statusHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statusIconWrap: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: colors.champagneBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  menuRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
  },
  section: { width: '100%', marginBottom: space.sm, marginTop: space.md },
  row:     { flexDirection: 'row', alignItems: 'flex-start' },
  toggle:  {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: space.sm, paddingHorizontal: space.md,
    borderWidth: 1, borderColor: colors.creamRule, borderRadius: 4,
    backgroundColor: colors.creamSoft,
    marginBottom: space.md,
  },
  toggleOn: { borderColor: colors.champagne, backgroundColor: colors.champagneTint },
  dot:      {
    width: 16, height: 16, borderRadius: 3,
    borderWidth: 1, borderColor: colors.muted,
  },
  dotOn:    { backgroundColor: colors.champagne, borderColor: colors.champagne },
});
