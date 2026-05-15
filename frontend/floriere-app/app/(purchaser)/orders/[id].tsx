// Order detail — marketplace pattern, redesigned to drop the redundancy.
//
// Sections (in order, all conditional except hero / items / delivery / chat):
//   1. Hero card        — thumbnail + status pill + recipient + date + total + ETA
//   2. Tracker          — horizontal stepper (one row, replaces vertical list)
//   3. Live map         — only when out_for_delivery (courier card folded in)
//   4. Delivery photo   — only when delivered
//   5. Items            — bouquet rows + flower chips + voucher / tip summary
//   6. Delivery         — address + recipient phone + card message + call studio
//   7. Timeline         — append-only event log
//   8. Chat             — three-way messaging thread
//   9. Tip the courier  — only when delivered (and courier was assigned)
//  10. Rating           — only when delivered
//  11. Action bar       — contextual Reorder / Request cancel / Direct cancel
//
// Lifecycle banners (cancel request status) collapse into hero pills or a
// single tinted strip — no longer a full card per state.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../../components/AppHeader';
import { Button } from '../../../components/Button';
import { CallModal } from '../../../components/CallModal';
import { Card } from '../../../components/Card';
import { CourierContactCard } from '../../../components/CourierContactCard';
import { DeliveryMap } from '../../../components/DeliveryMap';
import { DeliveryPhotoDisplay } from '../../../components/DeliveryPhotoCard';
import { Field } from '../../../components/Field';
import { MessageThread } from '../../../components/MessageThread';
import { OrderTimeline } from '../../../components/OrderTimeline';
import { Pill } from '../../../components/Pill';
import { PlaceholderImage, toneFromColor } from '../../../components/PlaceholderImage';
import { Screen } from '../../../components/Screen';
import { Stars } from '../../../components/Stars';
import { Text } from '../../../components/Text';
import { TipCard } from '../../../components/TipCard';
import { apiGet, apiPatch, apiPost, ApiError } from '../../../lib/api';
import type {
  CourierInfo,
  MerchantPublic,
  Order,
  OrderEvent,
  OrderMessage,
  OrderStatus,
} from '../../../lib/types';
import { etaSummary, occasionLabel, prettyDate, statusHelper, statusLabel, thb } from '../../../lib/format';
import { colors, radii, space } from '../../../theme';

const STAGES_STANDARD:  OrderStatus[] = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
const STAGES_CONCIERGE: OrderStatus[] = ['pending_review', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];

function heroTone(o: Order): Parameters<typeof PlaceholderImage>[0]['tone'] {
  const first = o.items?.[0];
  const flower = first?.flowers?.[0];
  if (flower) return toneFromColor(flower.color);
  if (o.concierge_brief) return 'blush';
  return 'neutral';
}

// For the horizontal stepper: collapse pending_review + awaiting_customer to
// the same "Florist reviewing" stage (concierge orders skip plain 'pending').
function stageIndexFor(status: OrderStatus, isConcierge: boolean): number {
  if (status === 'cancelled') return -1;
  const stages = isConcierge ? STAGES_CONCIERGE : STAGES_STANDARD;
  if (status === 'awaiting_customer') return stages.indexOf('pending_review');
  return stages.indexOf(status);
}

export default function OrderDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder]   = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [courier, setCourier]   = useState<CourierInfo | null>(null);
  const [merchant, setMerchant] = useState<MerchantPublic | null>(null);
  const [callMerchant, setCallMerchant] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [reason, setReason] = useState('');
  const [conciergeReply, setConciergeReply] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [o, ev, msgs, mer] = await Promise.all([
        apiGet<Order>(`/orders/${id}`),
        apiGet<OrderEvent[]>(`/orders/${id}/events`).catch(() => [] as OrderEvent[]),
        apiGet<OrderMessage[]>(`/orders/${id}/messages`).catch(() => [] as OrderMessage[]),
        apiGet<{ merchant: MerchantPublic | null }>('/seller/public')
          .then((r) => r.merchant)
          .catch(() => null),
      ]);
      setOrder(o);
      setEvents(ev);
      setMessages(msgs);
      setMerchant(mer);
      if (o.rating_stars) setRating(o.rating_stars);
      if (o.rating_comment) setReview(o.rating_comment);
      if (o.courier_name) {
        try {
          const c = await apiGet<CourierInfo>(`/orders/${id}/courier`);
          setCourier(c);
        } catch { /* ignore */ }
      } else {
        setCourier(null);
      }
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!order || order.status !== 'out_for_delivery' || !id) return;
    const h = setInterval(async () => {
      try {
        const c = await apiGet<CourierInfo>(`/orders/${id}/courier`);
        setCourier(c);
      } catch { /* ignore */ }
    }, 10_000);
    return () => clearInterval(h);
  }, [order?.status, id]);

  async function cancelDirect() {
    if (!order) return;
    setError(null); setBusy(true);
    try {
      await apiPatch(`/orders/${order.id}/status`, { status: 'cancelled' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel.');
    } finally { setBusy(false); }
  }

  async function requestCancel() {
    if (!order) return;
    setError(null); setBusy(true);
    try {
      await apiPost(`/orders/${order.id}/cancel_request`, { reason: reason.trim() || null });
      setReason(''); setCancelOpen(false); await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not request cancellation.');
    } finally { setBusy(false); }
  }

  async function reorder() {
    if (!order) return;
    try {
      await apiPost(`/orders/${order.id}/reorder`);
      router.push('/(purchaser)/cart');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reorder.');
    }
  }

  async function submitRating() {
    if (!order || !rating) return;
    setError(null); setBusy(true);
    try {
      await apiPost(`/orders/${order.id}/rating`, { stars: rating, comment: review.trim() || null });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your rating.');
    } finally { setBusy(false); }
  }

  async function confirmConcierge() {
    if (!order) return;
    setError(null); setBusy(true);
    try {
      await apiPost(`/orders/${order.id}/concierge_confirm`, {
        reply: conciergeReply.trim() || 'Sounds good — please proceed.',
      });
      setConciergeReply('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm.');
    } finally { setBusy(false); }
  }

  async function sendMessage(body: string) {
    if (!order) return;
    setMsgBusy(true);
    try {
      await apiPost(`/orders/${order.id}/messages`, { body });
      const msgs = await apiGet<OrderMessage[]>(`/orders/${order.id}/messages`);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send message.');
    } finally { setMsgBusy(false); }
  }

  if (!order) {
    return (
      <Screen background="cream" maxFrame="tablet">
        <AppHeader eyebrow="ORDER" title="Loading" back />
        <ActivityIndicator color={colors.champagne} />
      </Screen>
    );
  }

  const brief        = order.concierge_brief ?? null;
  const isConcierge  = Boolean(brief);
  const stages       = isConcierge ? STAGES_CONCIERGE : STAGES_STANDARD;
  const stageIdx     = stageIndexFor(order.status, isConcierge);
  const isLive       = order.status !== 'cancelled' && order.status !== 'delivered';
  const eta = order.status === 'out_for_delivery'
    ? etaSummary(order.delivery_date, order.delivery_window ?? null)
    : null;
  // Latest seller message — used to surface the florist's question on the
  // awaiting_customer card.
  const lastSellerMsg = [...messages].reverse().find((m) => m.sender_role === 'seller')?.body ?? null;

  // Status block: tracker progress + step number. Stage list adapts to concierge.
  const totalStages = stages.length;
  const currentStep = stageIdx + 1;  // 1-indexed for display
  const progressPct = order.status === 'cancelled'
    ? 0
    : Math.max(0, Math.min(1, currentStep / totalStages));

  return (
    <Screen background="cream" maxFrame="tablet">
      <AppHeader eyebrow={`ORDER #${order.id}`} title={`For ${order.recipient_name}`} back />

      {/* 1 · Status hero — single source of truth. Replaces old hero + 5-dot tracker. */}
      <View style={[
        styles.statusHero,
        order.status === 'cancelled' && styles.statusHeroCancelled,
        order.status === 'delivered' && styles.statusHeroDelivered,
        order.status === 'awaiting_customer' && styles.statusHeroAwaiting,
      ]}>
        <View style={styles.statusRow}>
          <Text variant="eyebrow" color={
            order.status === 'cancelled' ? 'danger' :
            order.status === 'awaiting_customer' ? 'danger' :
            order.status === 'delivered' ? 'champagne' :
            'champagne'
          }>
            {order.status === 'cancelled' ? 'CANCELLED'
              : order.status === 'delivered' ? 'COMPLETE'
              : `STEP ${currentStep} OF ${totalStages}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
            {order.delivery_mode === 'urgent' && order.status !== 'cancelled' ? (
              <Pill label="RUSH · TODAY" tone="danger" />
            ) : null}
            {order.cancel_request === 'requested' ? <Pill label="CANCEL REQ" tone="danger" /> : null}
            {order.cancel_request === 'denied' ? <Pill label="CANCEL DENIED" tone="muted" /> : null}
          </View>
        </View>

        <Text variant="h1" color="ink" style={styles.statusName}>{statusLabel(order.status)}</Text>
        <Text variant="body" color="muted" style={{ marginTop: 4 }}>
          {eta && order.status === 'out_for_delivery'
            ? `Arriving ${eta}.`
            : statusHelper(order.status)}
        </Text>

        {/* Slim progress bar — non-cancelled only */}
        {order.status !== 'cancelled' ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
        ) : null}

        {/* Meta strip: delivery date/window · total. Single line of facts. */}
        <View style={styles.statusMeta}>
          <Text variant="caption" color="muted">
            {prettyDate(order.delivery_date)}
            {order.delivery_window ? ` · ${order.delivery_window}` : ''}
          </Text>
          <Text variant="body" color="ink" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {thb(order.total_thb)}
          </Text>
        </View>
      </View>

      {/* Concierge brief panel (only on concierge orders) */}
      {brief ? (
        <View style={styles.briefCard}>
          <View style={styles.briefImg}>
            <PlaceholderImage
              label={brief.label}
              subLabel="Concierge brief"
              tone={heroTone(order)}
              size="lg"
              fill
            />
            {(brief.preview_url || order.preview_url) ? (
              <Image
                source={{ uri: (brief.preview_url || order.preview_url) as string }}
                style={StyleSheet.absoluteFill as any}
                resizeMode="cover"
              />
            ) : null}
          </View>
          <View style={styles.briefBadgeRow}>
            <View style={styles.briefBadge}>
              <Text variant="caption" color="champagne" style={{ fontWeight: '700' }}>
                {(brief.preview_url || order.preview_url) ? 'AI PREVIEW' : 'CONCIERGE BRIEF'}
              </Text>
            </View>
          </View>
          <View style={styles.briefBody}>
            <Text variant="h3" color="ink" numberOfLines={2}>{brief.label}</Text>
            <Text variant="bodySm" color="muted" style={{ marginTop: 2 }} numberOfLines={3}>
              {brief.summary}
            </Text>

            <View style={styles.briefMetaRow}>
              {brief.format ? <Pill label={`FORMAT · ${brief.format.toUpperCase().replace('_',' ')}`} tone="muted" /> : null}
              {brief.palette_id ? <Pill label={`PALETTE · ${String(brief.palette_id).toUpperCase()}`} tone="muted" /> : null}
              {brief.flower_kinds && brief.flower_kinds.length > 0
                ? <Pill label={`STEMS · ${brief.flower_kinds.join(', ').toUpperCase()}`} tone="muted" />
                : null}
            </View>

            {brief.message ? (
              <View style={styles.briefMsgBox}>
                <Text variant="caption" color="muted" style={styles.eyebrow}>MESSAGE</Text>
                <Text variant="quote" color="ink" style={{ marginTop: 2 }}>"{brief.message}"</Text>
              </View>
            ) : null}
            {brief.anything_else ? (
              <View style={styles.briefNoteBox}>
                <Text variant="caption" color="muted" style={styles.eyebrow}>NOTES FOR FLORIST</Text>
                <Text variant="bodySm" color="ink" style={{ marginTop: 2 }}>{brief.anything_else}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Florist question (awaiting_customer) — call-to-action card */}
      {brief && order.status === 'awaiting_customer' ? (
        <View style={styles.askCard}>
          <Text variant="caption" color="danger" style={styles.eyebrow}>FLORIST HAS A QUESTION</Text>
          {lastSellerMsg ? (
            <Text variant="body" color="ink" style={{ marginTop: space.xs }}>
              "{lastSellerMsg}"
            </Text>
          ) : (
            <Text variant="bodySm" color="muted" style={{ marginTop: space.xs }}>
              Check the chat below — they need a quick reply before they can proceed.
            </Text>
          )}
          <View style={{ marginTop: space.md }}>
            <Field
              value={conciergeReply}
              onChangeText={setConciergeReply}
              placeholder="Sounds good — please proceed."
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' as const } as any}
            />
          </View>
          <Button
            label={busy ? 'Sending…' : 'Confirm & continue'}
            onPress={confirmConcierge}
            loading={busy}
            full
          />
        </View>
      ) : null}

      {/* 2 · Live map + courier (only out_for_delivery) */}
      {order.status === 'out_for_delivery' && courier ? (
        <View style={styles.section}>
          <View style={styles.mapHead}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="muted" style={styles.sectionLabel}>COURIER EN ROUTE</Text>
              <Text variant="h3" color="ink" style={{ marginTop: 2 }}>
                {courier.remaining_minutes != null
                  ? courier.remaining_minutes > 0
                    ? `~${courier.remaining_minutes} min away`
                    : 'Almost there'
                  : `ETA ~${courier.eta_minutes ?? 18} min`}
              </Text>
              <Text variant="caption" color="muted">
                Sukhumvit 31 → {order.delivery_district ?? 'Bangkok'} · ~1.8 km
              </Text>
            </View>
          </View>
          <View style={{ marginTop: space.sm }}>
            <DeliveryMap
              progress={courier.progress}
              expanded={false}
              originLabel="Sukhumvit 31"
              destLabel={order.delivery_district ?? 'Recipient'}
            />
          </View>
          <View style={{ marginTop: space.md }}>
            <CourierContactCard
              orderId={order.id}
              courierName={courier.courier_name ?? order.courier_name ?? 'Courier'}
              courierPhone={courier.courier_phone ?? order.courier_phone ?? null}
            />
          </View>
        </View>
      ) : null}

      {/* 4 · Delivery photo (only delivered) */}
      {order.delivery_photo_url ? (
        <View style={styles.section}>
          <Text variant="caption" color="muted" style={styles.sectionLabel}>DELIVERED</Text>
          <View style={{ marginTop: space.sm }}>
            <DeliveryPhotoDisplay
              url={order.delivery_photo_url}
              takenAt={order.delivery_photo_at ?? null}
              courierName={order.courier_name ?? null}
              caption="Left at reception"
            />
          </View>
        </View>
      ) : null}

      {/* 5 · Items */}
      <View style={styles.section}>
        <Text variant="caption" color="muted" style={styles.sectionLabel}>YOUR BOUQUET</Text>
        {(order.items ?? []).map((it) => (
          <View key={it.id} style={{ marginTop: space.sm }}>
            <View style={styles.itemHead}>
              <Text variant="body" color="ink" style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>
                {it.curated_name ?? it.custom_label ?? 'Florière bouquet'}
              </Text>
              <Text variant="bodySm" color="champagne" style={{ fontWeight: '600' }}>{thb(it.line_total_thb)}</Text>
            </View>
            {it.item_type === 'intent' ? (
              <Text variant="caption" color="muted">
                {occasionLabel(it.intent_occasion ?? '')} · For {it.intent_recipient ?? '—'}
              </Text>
            ) : null}
            {it.flowers.length > 0 ? (
              <View style={styles.flowerRow}>
                {it.flowers.map((f) => (
                  <View key={`${it.id}-${f.flower_id}-${f.name}`} style={styles.flowerChip}>
                    <View style={styles.flowerImg}>
                      <PlaceholderImage label={f.name} tone={toneFromColor(f.color)} size="sm" fill />
                    </View>
                    <Text variant="caption" color="muted" style={{ marginTop: 4 }} numberOfLines={1}>
                      {f.quantity}× {f.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        {/* Summary line (voucher + tip) */}
        {order.discount_thb || (order.tip_thb && order.tip_thb > 0) ? (
          <View style={styles.summaryBlock}>
            {order.discount_thb ? (
              <View style={styles.summaryRow}>
                <Text variant="caption" color="muted">Voucher {order.voucher_code}</Text>
                <Text variant="caption" color="champagne">− {thb(order.discount_thb)}</Text>
              </View>
            ) : null}
            {order.tip_thb && order.tip_thb > 0 ? (
              <View style={styles.summaryRow}>
                <Text variant="caption" color="muted">Tip · {order.courier_name ?? 'courier'}</Text>
                <Text variant="caption" color="champagne">{thb(order.tip_thb)}</Text>
              </View>
            ) : null}
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text variant="bodySm" color="ink" style={{ fontWeight: '700' }}>Total</Text>
              <Text variant="bodySm" color="ink" style={{ fontWeight: '700' }}>{thb(order.total_thb)}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* 6 · Delivery */}
      <View style={styles.section}>
        <Text variant="caption" color="muted" style={styles.sectionLabel}>DELIVERY</Text>
        <Text variant="bodySm" color="ink" style={{ marginTop: space.sm }}>{order.delivery_address}</Text>
        {order.delivery_district ? (
          <Text variant="caption" color="muted">{order.delivery_district}</Text>
        ) : null}
        {order.recipient_phone ? (
          <Text variant="caption" color="muted">Recipient · {order.recipient_phone}</Text>
        ) : null}
        {order.recipient_message ? (
          <View style={styles.cardMessage}>
            <Text variant="caption" color="muted" style={styles.eyebrow}>CARD</Text>
            <Text variant="quote" color="ink" style={{ marginTop: 2 }}>
              "{order.recipient_message}"
            </Text>
          </View>
        ) : null}
        {merchant?.phone ? (
          <View style={{ marginTop: space.md }}>
            <Button
              label="Call the studio"
              variant="secondary"
              size="sm"
              onPress={() => setCallMerchant(true)}
            />
          </View>
        ) : null}
      </View>

      {/* 7 · Timeline */}
      {events.length > 0 ? (
        <View style={styles.section}>
          <Text variant="caption" color="muted" style={styles.sectionLabel}>TIMELINE</Text>
          <View style={{ marginTop: space.sm }}>
            <OrderTimeline events={events} />
          </View>
        </View>
      ) : null}

      {/* 8 · Chat */}
      <View style={styles.section}>
        <Text variant="caption" color="muted" style={styles.sectionLabel}>CHAT WITH STUDIO</Text>
        <View style={{ marginTop: space.sm }}>
          <MessageThread
            messages={messages}
            myRole="purchaser"
            busy={msgBusy}
            onSend={sendMessage}
          />
        </View>
      </View>

      {/* 9 · Tip courier (delivered) */}
      {order.status === 'delivered' && order.courier_name ? (
        <Card tone="creamSoft" style={{ width: '100%', marginTop: space.md }} flat>
          <TipCard
            orderId={order.id}
            courierName={order.courier_name}
            existingTip={order.tip_thb ?? 0}
            existingNote={order.tip_note ?? null}
            onTipped={() => load()}
          />
        </Card>
      ) : null}

      {/* 10 · Rating (delivered) */}
      {order.status === 'delivered' ? (
        <View style={[styles.section, { marginTop: space.md }]}>
          <Text variant="caption" color="muted" style={styles.sectionLabel}>RATE THIS DELIVERY</Text>
          <View style={{ marginTop: space.sm }}>
            <Stars value={rating} onChange={setRating} size={28} />
          </View>
          <View style={{ marginTop: space.sm }}>
            <Field
              value={review}
              onChangeText={setReview}
              placeholder="How was the studio?"
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' as const } as any}
            />
          </View>
          <Button
            label={busy ? 'Saving…' : (order.rating_stars ? 'Update rating' : 'Leave rating')}
            onPress={submitRating}
            loading={busy}
            disabled={!rating}
            full
          />
        </View>
      ) : null}

      {/* Cancel request status — single tinted strip (no full card) */}
      {order.cancel_request === 'requested' ? (
        <View style={styles.banner}>
          <Text variant="caption" color="muted" style={styles.eyebrow}>CANCEL REQUEST PENDING</Text>
          <Text variant="bodySm" color="ink" style={{ marginTop: 2 }}>
            We notified the studio. You'll see a response below when they decide.
          </Text>
          {order.cancel_reason ? (
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>Reason: {order.cancel_reason}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Inline cancel-request form (collapsed) */}
      {isLive && order.status !== 'pending' && order.cancel_request === 'none' ? (
        <View style={[styles.section, { marginTop: space.md }]}>
          {!cancelOpen ? (
            <Pressable onPress={() => setCancelOpen(true)} style={styles.cancelToggle}>
              <Text variant="bodySm" color="danger" style={{ fontWeight: '600' }}>Need to cancel?</Text>
              <Text variant="caption" color="muted">The studio has started — request a cancellation.</Text>
            </Pressable>
          ) : (
            <View>
              <Text variant="caption" color="muted" style={styles.sectionLabel}>REQUEST CANCELLATION</Text>
              <View style={{ marginTop: space.sm }}>
                <Field
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Reason (optional) — wrong address, change of plans…"
                />
              </View>
              <Button label={busy ? 'Sending…' : 'Submit request'} variant="danger" onPress={requestCancel} loading={busy} full />
              <View style={{ height: space.sm }} />
              <Button label="Never mind" variant="ghost" onPress={() => setCancelOpen(false)} full />
            </View>
          )}
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" color="danger" style={{ marginTop: space.md }}>{error}</Text>
      ) : null}

      {/* 11 · Action bar at the bottom */}
      <View style={styles.actionBar}>
        {(order.status === 'delivered' || order.status === 'cancelled') ? (
          <Button label="Order this again" variant="secondary" onPress={reorder} full />
        ) : null}
        {order.status === 'pending' ? (
          <Button label={busy ? 'Cancelling…' : 'Cancel order'} variant="danger" onPress={cancelDirect} loading={busy} full />
        ) : null}
      </View>

      <CallModal
        visible={callMerchant}
        onClose={() => setCallMerchant(false)}
        name={merchant?.shop_name ?? 'Florière studio'}
        phone={merchant?.phone ?? null}
        label="CALLING STUDIO"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Status hero — single block replacing old hero + 5-dot tracker.
  statusHero: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.champagne,
    padding: space.xl,
  },
  statusHeroCancelled: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  statusHeroDelivered: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  statusHeroAwaiting: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  statusName: {
    marginTop: space.sm,
    letterSpacing: -0.5,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.creamRule,
    marginTop: space.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.champagne,
    borderRadius: 2,
  },
  statusMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
  },

  // ── Concierge brief panel ──────────────────────────────────────────
  briefCard: {
    width: '100%',
    marginTop: space.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.champagne,
    overflow: 'hidden',
    position: 'relative',
  },
  briefImg: {
    width: '100%',
    height: 240,
    backgroundColor: colors.creamSoft,
    position: 'relative',
    overflow: 'hidden',
  },
  briefBadgeRow: {
    position: 'absolute',
    top: space.md, left: space.md,
    flexDirection: 'row',
    gap: space.xs,
  },
  briefBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  briefBody: {
    padding: space.lg,
  },
  briefMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.sm,
  },
  briefMsgBox: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.sm,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
  briefNoteBox: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radii.sm,
    backgroundColor: colors.champagneTint,
    borderWidth: 1,
    borderColor: colors.champagne,
  },

  // Florist-question call-to-action
  askCard: {
    width: '100%',
    marginTop: space.md,
    padding: space.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },

  // Generic section block — replaces stacked Cards
  section: {
    width: '100%',
    marginTop: space.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    padding: space.lg,
  },
  sectionLabel: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 11,
  },
  eyebrow: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 11,
  },

  mapHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },

  itemHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flowerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.sm },
  flowerChip: { width: 64, alignItems: 'center' },
  flowerImg:  { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.creamSoft },

  summaryBlock: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryTotal: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
  },

  cardMessage: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
  },

  banner: {
    width: '100%',
    marginTop: space.md,
    padding: space.md,
    backgroundColor: colors.dangerBg,
    borderRadius: radii.sm,
  },

  cancelToggle: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.sm,
    backgroundColor: colors.dangerBg,
    alignItems: 'flex-start',
  },

  actionBar: {
    width: '100%',
    marginTop: space.xl,
    gap: space.sm,
  },
});
