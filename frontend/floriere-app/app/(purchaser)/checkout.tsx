// Checkout — marketplace pattern.
// Cart summary thumbnails up top, then sectioned form (delivery / recipient
// / message / voucher / payment), and a heavy total card with the primary
// place-order CTA last.

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { PlaceholderImage, toneFromColor } from '../../components/PlaceholderImage';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiGet, apiPost, ApiError } from '../../lib/api';
import type { Address, Cart, CartItem, Recipient, VoucherPreview } from '../../lib/types';
import { occasionLabel, thb } from '../../lib/format';
import { colors, radii, space } from '../../theme';

function thumbToneFor(it: CartItem): Parameters<typeof PlaceholderImage>[0]['tone'] {
  const first = it.flowers?.[0];
  if (first) return toneFromColor(first.color);
  if (it.item_type === 'concierge') return 'blush';
  return 'neutral';
}

function titleFor(it: CartItem): string {
  return it.curated_name ?? it.custom_label ?? (
    it.item_type === 'intent' ? `Intent · ${occasionLabel(it.intent_occasion ?? '')}`
    : it.item_type === 'concierge' ? 'Concierge bouquet'
    : 'Florière bouquet'
  );
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// 1-hour delivery slots, 09:00 → 21:00. Mirrors backend orders.SCHEDULED_SLOTS.
const SCHEDULED_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const h = 9 + i;
  return `${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00`;
});
const URGENT_SLOT = 'ASAP (1–2h)';
const URGENT_SURCHARGE_THB = 150;

type DeliveryMode = 'scheduled' | 'urgent';

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<number | null>(null);
  const [selectedRecId,  setSelectedRecId]  = useState<number | null>(null);

  // form state
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('scheduled');
  const [deliveryDate, setDeliveryDate] = useState(tomorrowIso());
  const [deliveryWindow, setDeliveryWindow] = useState<string>(SCHEDULED_SLOTS[2]);
  const [address, setAddress]           = useState('');
  const [district, setDistrict]         = useState('');
  const [recipient, setRecipient]       = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [cardMessage, setCardMessage]   = useState('');
  const [voucherCode, setVoucherCode]   = useState('');
  const [voucher, setVoucher]           = useState<VoucherPreview | null>(null);
  const [placing, setPlacing] = useState(false);
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, addrs, recs] = await Promise.all([
          apiGet<Cart>('/cart'),
          apiGet<Address[]>('/account/addresses').catch(() => [] as Address[]),
          apiGet<Recipient[]>('/account/recipients').catch(() => [] as Recipient[]),
        ]);
        setCart(c);
        setAddresses(addrs);
        setRecipients(recs);
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        if (def) {
          setSelectedAddrId(def.id);
          setAddress(def.address);
          setDistrict(def.district ?? '');
        }
      } catch { /* keep empty defaults */ }
    })();
  }, []);

  function pickAddress(a: Address) {
    setSelectedAddrId(a.id);
    setAddress(a.address);
    setDistrict(a.district ?? '');
  }

  function pickRecipient(r: Recipient) {
    setSelectedRecId(r.id);
    setRecipient(r.name);
    setRecipientPhone(r.phone ?? '');
  }

  async function checkVoucher() {
    if (!voucherCode.trim() || !cart) return;
    setVoucherBusy(true);
    try {
      const r = await apiPost<VoucherPreview>('/account/voucher/preview', {
        code: voucherCode.trim().toUpperCase(),
        subtotal_thb: cart.subtotal_thb,
      });
      setVoucher(r);
    } catch (err) {
      setVoucher({ valid: false, error: err instanceof ApiError ? err.message : 'Could not validate.' });
    } finally {
      setVoucherBusy(false);
    }
  }

  function clearVoucher() {
    setVoucher(null);
    setVoucherCode('');
  }

  const urgentSurcharge = deliveryMode === 'urgent' ? URGENT_SURCHARGE_THB : 0;
  const subtotalWithSurcharge = cart ? cart.subtotal_thb + urgentSurcharge : 0;
  const discount = voucher && voucher.valid ? voucher.discount_thb : 0;
  const total = cart ? Math.max(0, subtotalWithSurcharge - discount) : 0;

  function pickMode(m: DeliveryMode) {
    setDeliveryMode(m);
    if (m === 'urgent') {
      setDeliveryDate(todayIso());
      setDeliveryWindow(URGENT_SLOT);
    } else {
      setDeliveryDate(tomorrowIso());
      setDeliveryWindow(SCHEDULED_SLOTS[2]);
    }
  }

  async function placeOrder() {
    setError(null);
    if (!address.trim() || !recipient.trim() || !deliveryDate) {
      setError('Delivery date, address and recipient name are required.');
      return;
    }
    if (!cart || cart.items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setPlacing(true);
    try {
      const out = await apiPost<{ order_id: number }>('/orders/checkout', {
        delivery_mode:     deliveryMode,
        delivery_date:     deliveryDate,
        delivery_window:   deliveryWindow,
        delivery_address:  address.trim(),
        delivery_district: district.trim() || null,
        recipient_name:    recipient.trim(),
        recipient_phone:   recipientPhone.trim() || null,
        recipient_message: cardMessage.trim() || null,
        voucher_code:      voucher && voucher.valid ? voucher.code : null,
      });
      router.replace(`/(purchaser)/orders/${out.order_id}` as any);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place order.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <Screen background="cream" maxFrame="tablet">
      <AppHeader eyebrow="CHECKOUT" title="Delivery details" back />

      {/* Cart summary row */}
      {cart && cart.items.length > 0 ? (
        <View style={styles.cartCard}>
          <View style={styles.cartHead}>
            <Text variant="caption" color="muted" style={styles.eyebrow}>
              {cart.items.length} item{cart.items.length === 1 ? '' : 's'}
            </Text>
            <Pressable onPress={() => router.push('/(purchaser)/cart')}>
              <Text variant="caption" color="champagne" style={{ fontWeight: '600' }}>Edit cart →</Text>
            </Pressable>
          </View>
          <View>
            {cart.items.map((it) => (
              <View key={it.id} style={styles.cartRow}>
                <View style={styles.thumb}>
                  <PlaceholderImage label={titleFor(it)} tone={thumbToneFor(it)} size="sm" fill />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm" color="ink" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {titleFor(it)}
                  </Text>
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    Qty {it.quantity} · {thb(it.line_total_thb)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Delivery section */}
      <Text variant="caption" color="muted" style={styles.section}>DELIVERY</Text>

      {/* Mode toggle — Scheduled vs Urgent */}
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => pickMode('scheduled')}
          style={deliveryMode === 'scheduled' ? [styles.modeCard, styles.modeCardActive] : styles.modeCard}
        >
          <Text variant="caption" color={deliveryMode === 'scheduled' ? 'champagne' : 'muted'} style={styles.eyebrow}>
            SCHEDULED
          </Text>
          <Text variant="body" color="ink" style={{ fontWeight: deliveryMode === 'scheduled' ? '700' : '600', marginTop: 2 }}>
            Pick a day + 1-hour slot
          </Text>
          <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
            For dates 2–14 days out. Standard rate.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => pickMode('urgent')}
          style={deliveryMode === 'urgent' ? [styles.modeCard, styles.modeCardUrgent] : styles.modeCard}
        >
          <Text variant="caption" color={deliveryMode === 'urgent' ? 'danger' : 'muted'} style={styles.eyebrow}>
            URGENT · TODAY
          </Text>
          <Text variant="body" color="ink" style={{ fontWeight: deliveryMode === 'urgent' ? '700' : '600', marginTop: 2 }}>
            ASAP — 1 to 2 hours
          </Text>
          <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
            For today. +{thb(URGENT_SURCHARGE_THB)} rush fee.
          </Text>
        </Pressable>
      </View>

      {deliveryMode === 'scheduled' ? (
        <>
          <Field
            label="Delivery date"
            value={deliveryDate}
            onChangeText={setDeliveryDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text variant="caption" color="muted" style={styles.subLabel}>1-HOUR SLOT</Text>
          <View style={styles.chipRow}>
            {SCHEDULED_SLOTS.map((w) => {
              const active = w === deliveryWindow;
              return (
                <Pressable
                  key={w}
                  onPress={() => setDeliveryWindow(w)}
                  style={active ? [styles.slotChip, styles.chipActive] : styles.slotChip}
                >
                  <Text variant="caption" color={active ? 'champagne' : 'ink'} style={[styles.slotText, active && { fontWeight: '700' }]}>
                    {w}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.urgentBox}>
          <Text variant="caption" color="danger" style={styles.eyebrow}>RUSH ORDER</Text>
          <Text variant="body" color="ink" style={{ fontWeight: '600', marginTop: 4 }}>
            Today · within 1–2 hours of order placed
          </Text>
          <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
            We dispatch the closest available courier. Brief may be adjusted on the fly with what's in stock — the florist will message you if anything needs to change.
          </Text>
          <View style={styles.surchargeRow}>
            <Text variant="bodySm" color="muted">Rush fee</Text>
            <Text variant="bodySm" color="danger" style={{ fontWeight: '700' }}>+{thb(URGENT_SURCHARGE_THB)}</Text>
          </View>
        </View>
      )}

      {addresses.length > 0 ? (
        <>
          <Text variant="caption" color="muted" style={styles.subLabel}>SAVED ADDRESSES</Text>
          <View style={styles.chipRow}>
            {addresses.map((a) => {
              const active = a.id === selectedAddrId;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => pickAddress(a)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text variant="bodySm" color={active ? 'champagne' : 'ink'} style={[styles.chipText, active && { fontWeight: '700' }]}>
                    {a.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Field
        label="Delivery address"
        value={address}
        onChangeText={setAddress}
        placeholder="Building, room, road, district, Bangkok"
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' as const } as any}
      />
      <Field
        label="District (optional)"
        value={district}
        onChangeText={setDistrict}
        placeholder="Khlong Toei"
      />

      {/* Recipient section */}
      <Text variant="caption" color="muted" style={styles.section}>RECIPIENT</Text>

      {recipients.length > 0 ? (
        <>
          <Text variant="caption" color="muted" style={styles.subLabel}>SAVED</Text>
          <View style={styles.chipRow}>
            {recipients.map((r) => {
              const active = r.id === selectedRecId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => pickRecipient(r)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text variant="bodySm" color={active ? 'champagne' : 'ink'} style={[styles.chipText, active && { fontWeight: '700' }]}>
                    {r.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Field
        label="Recipient name"
        value={recipient}
        onChangeText={setRecipient}
        placeholder="On the card to."
      />
      <Field
        label="Recipient phone (optional)"
        value={recipientPhone}
        onChangeText={setRecipientPhone}
        placeholder="+66 …"
        keyboardType="phone-pad"
      />

      {/* Card message section */}
      <Text variant="caption" color="muted" style={styles.section}>CARD MESSAGE</Text>
      <Field
        value={cardMessage}
        onChangeText={setCardMessage}
        placeholder="What should the card say?"
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' as const } as any}
      />

      {/* Voucher section */}
      <Text variant="caption" color="muted" style={styles.section}>VOUCHER</Text>
      <View style={styles.voucherRow}>
        <View style={{ flex: 1 }}>
          <Field
            value={voucherCode}
            onChangeText={(v) => setVoucherCode(v.toUpperCase())}
            placeholder="WELCOME10 / GRADER25 / STUDIO200"
            autoCapitalize="characters"
          />
        </View>
        <Button
          label={voucher && voucher.valid ? 'Remove' : 'Apply'}
          onPress={voucher && voucher.valid ? clearVoucher : checkVoucher}
          loading={voucherBusy}
          variant={voucher && voucher.valid ? 'secondary' : 'primary'}
          size="md"
        />
      </View>
      {voucher ? (
        voucher.valid ? (
          <Text variant="caption" color="champagne" style={{ marginTop: 4 }}>
            ✓ Applied {voucher.code} · saving {thb(voucher.discount_thb)}
          </Text>
        ) : (
          <Text variant="caption" color="danger" style={{ marginTop: 4 }}>
            {voucher.error}
          </Text>
        )
      ) : null}

      {/* Payment (demo) */}
      <Text variant="caption" color="muted" style={styles.section}>PAYMENT</Text>
      <Card tone="white" style={{ width: '100%' }}>
        <View style={styles.demoPayRow}>
          <View style={styles.cardChip}><Text variant="caption" color="white" style={styles.cardChipText}>VISA</Text></View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" color="ink" style={{ fontWeight: '600' }}>•••• 1839</Text>
            <Text variant="caption" color="muted">Exp 03/29 · Demo card</Text>
          </View>
          <Text variant="caption" color="champagne" style={{ fontWeight: '600' }}>DEMO</Text>
        </View>
        <Text variant="caption" color="muted" style={{ marginTop: space.sm }}>
          Production wires Omise (Thailand) and Stripe (international).
        </Text>
      </Card>

      {/* Total */}
      {cart ? (
        <Card tone="creamSoft" style={{ marginTop: space.lg, width: '100%' }}>
          <View style={styles.totalRow}>
            <Text variant="bodySm" color="muted">Subtotal</Text>
            <Text variant="bodySm" color="ink">{thb(cart.subtotal_thb)}</Text>
          </View>
          {urgentSurcharge > 0 ? (
            <View style={styles.totalRow}>
              <Text variant="bodySm" color="muted">Rush fee</Text>
              <Text variant="bodySm" color="danger">+ {thb(urgentSurcharge)}</Text>
            </View>
          ) : null}
          {discount > 0 ? (
            <View style={styles.totalRow}>
              <Text variant="bodySm" color="muted">Discount</Text>
              <Text variant="bodySm" color="champagne">− {thb(discount)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text variant="bodySm" color="muted">Delivery</Text>
            <Text variant="bodySm" color="ink">
              {deliveryMode === 'urgent' ? 'Rush · today' : 'Standard'}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowGrand]}>
            <Text variant="h3" color="ink">To pay</Text>
            <Text variant="h2" color="champagne" style={{ fontVariant: ['tabular-nums'] }}>{thb(total)}</Text>
          </View>
          <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
            Florière packaging + handwritten card included.
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Text variant="caption" color="danger" style={{ marginVertical: space.sm }}>{error}</Text>
      ) : null}

      <View style={{ height: space.lg }} />
      <Button
        label={placing ? 'Placing order…' : `Place order · ${thb(total)}`}
        onPress={placeOrder}
        loading={placing}
        full
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  section: {
    width: '100%',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: space.xl,
    marginBottom: space.sm,
    color: colors.muted,
  },
  subLabel: {
    width: '100%',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: space.sm,
    marginBottom: space.xs,
  },

  cartCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    padding: space.md,
    marginBottom: space.md,
  },
  cartHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
  },
  thumb: {
    width: 48, height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.creamSoft,
  },

  chipRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.sm,
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
  chipText: { fontWeight: '500' },

  // ── Delivery mode toggle (Scheduled / Urgent) ─────────────────────────
  modeRow: {
    width: '100%',
    flexDirection: 'row',
    gap: space.md,
    marginBottom: space.md,
  },
  modeCard: {
    flex: 1,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },
  modeCardActive: {
    borderColor: colors.champagne,
    backgroundColor: colors.champagneTint,
  },
  modeCardUrgent: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  slotChip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },
  slotText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },

  urgentBox: {
    width: '100%',
    padding: space.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
    marginBottom: space.md,
  },
  surchargeRow: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  voucherRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    width: '100%',
  },

  demoPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  cardChip: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    backgroundColor: colors.charcoal,
    borderRadius: radii.xs,
  },
  cardChipText: { fontWeight: '700', letterSpacing: 1, fontSize: 10 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalRowGrand: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
  },
});
