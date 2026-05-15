import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../../components/AppHeader';
import { Button } from '../../../components/Button';
import { CallModal } from '../../../components/CallModal';
import { Card } from '../../../components/Card';
import { DeliveryPhotoPicker } from '../../../components/DeliveryPhotoCard';
import { Field } from '../../../components/Field';
import { MessageThread } from '../../../components/MessageThread';
import { OrderTimeline } from '../../../components/OrderTimeline';
import { Pill } from '../../../components/Pill';
import { PlaceholderImage } from '../../../components/PlaceholderImage';
import { Screen } from '../../../components/Screen';
import { StatusBadge } from '../../../components/StatusBadge';
import { Text } from '../../../components/Text';
import { apiGet, apiPatch, apiPost, ApiError } from '../../../lib/api';
import type { Order, OrderEvent, OrderMessage, OrderStatus } from '../../../lib/types';
import { occasionLabel, prettyDate, statusLabel, thb } from '../../../lib/format';
import { colors, radii, space } from '../../../theme';

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:          'accepted',
  accepted:         'preparing',
  preparing:        'out_for_delivery',
  out_for_delivery: 'delivered',
};

export default function SellerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder]       = useState<Order | null>(null);
  const [events, setEvents]     = useState<OrderEvent[]>([]);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [busy, setBusy]         = useState(false);
  const [msgBusy, setMsgBusy]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [callRecipient, setCallRecipient] = useState(false);
  // Concierge review actions
  const [conciergeAction, setConciergeAction] = useState<'ask' | 'decline' | null>(null);
  const [conciergeNote, setConciergeNote] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [o, ev, msgs] = await Promise.all([
        apiGet<Order>(`/orders/${id}`),
        apiGet<OrderEvent[]>(`/orders/${id}/events`).catch(() => [] as OrderEvent[]),
        apiGet<OrderMessage[]>(`/orders/${id}/messages`).catch(() => [] as OrderMessage[]),
      ]);
      setOrder(o);
      setEvents(ev);
      setMessages(msgs);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(s: OrderStatus) {
    if (!order) return;
    setError(null); setBusy(true);
    try {
      await apiPatch(`/orders/${order.id}/status`, { status: s });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update.');
    } finally { setBusy(false); }
  }

  async function conciergeAccept() {
    if (!order) return;
    setError(null); setBusy(true);
    try {
      await apiPost(`/orders/${order.id}/concierge_accept`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept brief.');
    } finally { setBusy(false); }
  }

  async function conciergeAsk() {
    if (!order || !conciergeNote.trim()) return;
    setError(null); setBusy(true);
    try {
      await apiPost(`/orders/${order.id}/concierge_ask`, { question: conciergeNote.trim() });
      setConciergeNote(''); setConciergeAction(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send question.');
    } finally { setBusy(false); }
  }

  async function conciergeDecline() {
    if (!order) return;
    setError(null); setBusy(true);
    try {
      await apiPost(`/orders/${order.id}/concierge_decline`, {
        reason: conciergeNote.trim() || null,
      });
      setConciergeNote(''); setConciergeAction(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not decline brief.');
    } finally { setBusy(false); }
  }

  async function respondCancel(decision: 'approve' | 'deny') {
    if (!order) return;
    setBusy(true);
    try {
      await apiPost(`/orders/${order.id}/cancel_response`, {
        decision,
        note: cancelNote.trim() || null,
      });
      setCancelNote('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not respond.');
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

  const next = NEXT[order.status];
  const canCancel = order.status === 'pending' || order.status === 'accepted';
  const hasCancelRequest = order.cancel_request === 'requested';
  const brief = order.concierge_brief ?? null;
  const isReviewing = brief && (order.status === 'pending_review' || order.status === 'awaiting_customer');

  return (
    <Screen background="cream" maxFrame="tablet">
      <AppHeader eyebrow={`ORDER #${order.id}`} title={`For ${order.recipient_name}`} back />

      <View style={{ width: '100%' }}>
        <View style={styles.headRow}>
          <StatusBadge status={order.status} />
          {order.delivery_mode === 'urgent' ? <Pill label="RUSH · TODAY" tone="danger" /> : null}
          {brief ? <Pill label="CONCIERGE BRIEF" tone="champagne" /> : null}
          {hasCancelRequest ? <Pill label="CANCEL REQUESTED" tone="danger" /> : null}
          {order.tip_thb && order.tip_thb > 0 ? (
            <Pill label={`TIP ${thb(order.tip_thb)}`} tone="champagne" />
          ) : null}
        </View>
        <Text variant="body" color="ink" style={{ marginTop: space.sm }}>
          From {order.purchaser_name ?? '—'} ({order.purchaser_email ?? '—'}) · {prettyDate(order.delivery_date)}
          {order.delivery_window ? ` · ${order.delivery_window}` : ''} · {thb(order.total_thb)}
        </Text>
        {order.courier_name ? (
          <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
            Dispatched to {order.courier_name}{order.courier_phone ? ` · ${order.courier_phone}` : ''}
          </Text>
        ) : null}
      </View>

      {/* ── Concierge brief panel + action bar (pending_review / awaiting_customer) ── */}
      {brief ? (
        <View style={styles.briefCard}>
          <View style={styles.briefImg}>
            <PlaceholderImage label={brief.label} subLabel="Brief preview" tone="blush" size="lg" fill />
            {(brief.preview_url || order.preview_url) ? (
              <Image
                source={{ uri: (brief.preview_url || order.preview_url) as string }}
                style={StyleSheet.absoluteFill as any}
                resizeMode="cover"
              />
            ) : null}
          </View>
          <View style={styles.briefBody}>
            <Text variant="eyebrow" color="champagne">{(brief.preview_url || order.preview_url) ? 'AI PREVIEW · CONCIERGE BRIEF' : 'CONCIERGE BRIEF'}</Text>
            <Text variant="h3" color="ink" style={{ marginTop: 2 }}>{brief.label}</Text>
            <Text variant="bodySm" color="muted" style={{ marginTop: 2 }}>{brief.summary}</Text>

            <View style={styles.briefMetaRow}>
              {brief.format ? <Pill label={`FORMAT · ${brief.format.toUpperCase().replace('_',' ')}`} tone="muted" /> : null}
              {brief.palette_id ? <Pill label={`PALETTE · ${String(brief.palette_id).toUpperCase()}`} tone="muted" /> : null}
              {brief.flower_kinds && brief.flower_kinds.length > 0
                ? <Pill label={`STEMS · ${brief.flower_kinds.join(', ').toUpperCase()}`} tone="muted" />
                : null}
            </View>

            {brief.message ? (
              <View style={styles.briefBox}>
                <Text variant="eyebrow" color="muted">MESSAGE FROM CUSTOMER</Text>
                <Text variant="quote" color="ink" style={{ marginTop: 2 }}>"{brief.message}"</Text>
              </View>
            ) : null}
            {brief.anything_else ? (
              <View style={[styles.briefBox, { borderColor: colors.champagne, backgroundColor: colors.champagneTint }]}>
                <Text variant="eyebrow" color="champagne">NOTES — PLEASE READ</Text>
                <Text variant="bodySm" color="ink" style={{ marginTop: 2 }}>{brief.anything_else}</Text>
              </View>
            ) : null}

            {isReviewing ? (
              <>
                <View style={styles.briefActionRow}>
                  <View style={{ flex: 1 }}>
                    <Button label="Accept brief" onPress={conciergeAccept} loading={busy && !conciergeAction} full />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Ask question" variant="secondary"
                      onPress={() => { setConciergeAction('ask'); setConciergeNote(''); }}
                      full />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Decline" variant="danger"
                      onPress={() => { setConciergeAction('decline'); setConciergeNote(''); }}
                      full />
                  </View>
                </View>

                {conciergeAction === 'ask' ? (
                  <View style={styles.briefForm}>
                    <Text variant="eyebrow" color="champagne">ASK THE CUSTOMER</Text>
                    <View style={{ marginTop: space.sm }}>
                      <Field
                        value={conciergeNote}
                        onChangeText={setConciergeNote}
                        placeholder="Hi — we're out of peony today, OK to swap with garden roses?"
                        multiline
                        numberOfLines={3}
                        style={{ minHeight: 70, textAlignVertical: 'top' as const } as any}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      <View style={{ flex: 1 }}>
                        <Button label="Send question" onPress={conciergeAsk}
                          disabled={!conciergeNote.trim()} loading={busy} full />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button label="Never mind" variant="ghost"
                          onPress={() => { setConciergeAction(null); setConciergeNote(''); }} full />
                      </View>
                    </View>
                  </View>
                ) : null}

                {conciergeAction === 'decline' ? (
                  <View style={styles.briefForm}>
                    <Text variant="eyebrow" color="danger">DECLINE THIS BRIEF</Text>
                    <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
                      Customer will be notified. In production they'd receive a refund.
                    </Text>
                    <View style={{ marginTop: space.sm }}>
                      <Field
                        label="Reason (optional)"
                        value={conciergeNote}
                        onChangeText={setConciergeNote}
                        placeholder="Wrong region · unavailable today · etc."
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      <View style={{ flex: 1 }}>
                        <Button label="Confirm decline" variant="danger" onPress={conciergeDecline} loading={busy} full />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button label="Never mind" variant="ghost"
                          onPress={() => { setConciergeAction(null); setConciergeNote(''); }} full />
                      </View>
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      {hasCancelRequest ? (
        <Card tone="creamSoft" style={{ width: '100%', marginTop: space.xl, borderColor: colors.danger }}>
          <Text variant="eyebrow" color="danger">CANCELLATION REQUEST</Text>
          {order.cancel_reason ? (
            <Text variant="body" color="ink" style={{ marginTop: space.sm }}>"{order.cancel_reason}"</Text>
          ) : (
            <Text variant="bodySm" color="muted" style={{ marginTop: space.sm }}>No reason provided.</Text>
          )}
          <Field
            label="Note for the purchaser (optional)"
            value={cancelNote}
            onChangeText={setCancelNote}
            placeholder="We've already started preparing your bouquet…"
            multiline
            numberOfLines={2}
            style={{ minHeight: 60, textAlignVertical: 'top' as const } as any}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button label="Approve cancellation" variant="danger" onPress={() => respondCancel('approve')} loading={busy} full />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Deny request" variant="secondary" onPress={() => respondCancel('deny')} loading={busy} full />
            </View>
          </View>
        </Card>
      ) : null}

      <Card tone="white" style={{ width: '100%', marginTop: space.xl }}>
        <Text variant="eyebrow" color="champagne">DELIVERY</Text>
        <Text variant="body" color="ink" style={{ marginTop: space.sm }}>{order.delivery_address}</Text>
        {order.delivery_district ? <Text variant="caption" color="muted">{order.delivery_district}</Text> : null}
        {order.recipient_phone ? (
          <View style={{ marginTop: space.sm }}>
            <Text variant="caption" color="muted">Recipient phone: {order.recipient_phone}</Text>
            <View style={{ marginTop: space.sm }}>
              <Button
                label={`Call recipient`}
                variant="secondary"
                size="sm"
                onPress={() => setCallRecipient(true)}
              />
            </View>
          </View>
        ) : null}
        {order.recipient_message ? (
          <View style={{ marginTop: space.md }}>
            <Text variant="eyebrow" color="champagne">CARD MESSAGE</Text>
            <Text variant="quote" color="ink" style={{ marginTop: 4 }}>"{order.recipient_message}"</Text>
          </View>
        ) : null}
      </Card>

      <Card tone="white" style={{ width: '100%', marginTop: space.lg }}>
        <Text variant="eyebrow" color="champagne">ITEMS TO PREPARE</Text>
        {(order.items ?? []).map((it) => (
          <View key={it.id} style={{ marginTop: space.md }}>
            <Text variant="h3" color="ink">
              {it.curated_name ?? it.custom_label ?? 'Florière bouquet'}
            </Text>
            {it.item_type === 'intent' ? (
              <Text variant="caption" color="muted">
                Intent · {occasionLabel(it.intent_occasion ?? '')} · For {it.intent_recipient ?? '—'}
              </Text>
            ) : null}
            {it.flowers.length > 0 ? (
              <Text variant="body" color="ink" style={{ marginTop: 4 }}>
                {it.flowers.map((f) => `${f.quantity}× ${f.name} (${f.color})`).join('  ·  ')}
              </Text>
            ) : null}
          </View>
        ))}
      </Card>

      {/* Delivery photo — seller-side picker, surfaces once delivered */}
      {(order.status === 'delivered' || order.status === 'out_for_delivery') ? (
        <Card tone="white" style={{ width: '100%', marginTop: space.lg }}>
          <DeliveryPhotoPicker
            orderId={order.id}
            initialUrl={order.delivery_photo_url ?? null}
            onPicked={() => load()}
          />
        </Card>
      ) : null}

      <Card tone="white" style={{ width: '100%', marginTop: space.lg }}>
        <Text variant="eyebrow" color="champagne">TIMELINE</Text>
        <View style={{ marginTop: space.md }}>
          <OrderTimeline events={events} />
        </View>
      </Card>

      <Card tone="white" style={{ width: '100%', marginTop: space.lg }}>
        <Text variant="eyebrow" color="champagne">MESSAGES WITH PURCHASER</Text>
        <View style={{ marginTop: space.md }}>
          <MessageThread
            messages={messages}
            myRole="seller"
            busy={msgBusy}
            onSend={sendMessage}
          />
        </View>
      </Card>

      {error ? (
        <Text variant="caption" color="danger" style={{ marginTop: space.md }}>{error}</Text>
      ) : null}

      <View style={{ height: space.lg, width: '100%' }} />

      {next ? (
        <Button label={`Advance: ${statusLabel(next)}`} onPress={() => setStatus(next)} loading={busy} full />
      ) : null}

      {canCancel ? (
        <>
          <View style={{ height: space.md, width: '100%' }} />
          <Button label="Cancel order" variant="danger" onPress={() => setStatus('cancelled')} loading={busy} full />
        </>
      ) : null}

      <CallModal
        visible={callRecipient}
        onClose={() => setCallRecipient(false)}
        name={order.recipient_name}
        phone={order.recipient_phone ?? null}
        label="CALLING RECIPIENT"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },

  briefCard: {
    width: '100%',
    marginTop: space.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.champagne,
    overflow: 'hidden',
  },
  briefImg: { width: '100%', height: 220, backgroundColor: colors.creamSoft, position: 'relative', overflow: 'hidden' },
  briefBody: { padding: space.lg },
  briefMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.sm,
  },
  briefBox: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.creamSoft,
  },
  briefActionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.lg,
    flexWrap: 'wrap',
  },
  briefForm: {
    width: '100%',
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.creamSoft,
  },
});
