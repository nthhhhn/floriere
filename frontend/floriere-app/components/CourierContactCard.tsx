/**
 * Courier contact strip for an in-flight order — shows courier name + phone,
 * "Call" and "Message" buttons, and an inline chat thread when expanded.
 *
 * Pass 3 (mocked) — call is the `CallModal` (no real telephony), and the
 * chat replies are scripted server-side so the demo can show a conversation.
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { apiGet, apiPost } from '../lib/api';
import type { OrderMessage } from '../lib/types';
import { relativeTime } from '../lib/format';
import { colors, radii, space } from '../theme';

import { Button } from './Button';
import { CallModal } from './CallModal';
import { Field } from './Field';
import { Text } from './Text';

type Props = {
  orderId: number;
  courierName: string;
  courierPhone: string | null;
};

export function CourierContactCard({ orderId, courierName, courierPhone }: Props) {
  const [callOpen, setCallOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs]         = useState<OrderMessage[]>([]);
  const [draft, setDraft]       = useState('');
  const [busy, setBusy]         = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<OrderMessage[]>(`/orders/${orderId}/messages?channel=courier`);
      setMsgs(r);
    } catch { /* ignore */ }
  }, [orderId]);

  useEffect(() => {
    if (chatOpen) load();
  }, [chatOpen, load]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      await apiPost(`/orders/${orderId}/messages`, { body, channel: 'courier' });
      setDraft('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" color="champagne">YOUR COURIER</Text>
          <Text variant="h3" color="ink" style={{ marginTop: 4 }}>{courierName}</Text>
          {courierPhone ? (
            <Text variant="caption" color="muted">{courierPhone}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={{ flex: 1 }}>
          <Button label="Call" onPress={() => setCallOpen(true)} size="sm" full />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={chatOpen ? 'Hide chat' : 'Message'}
            variant="secondary"
            size="sm"
            onPress={() => setChatOpen((v) => !v)}
            full
          />
        </View>
      </View>

      {chatOpen ? (
        <View style={styles.chat}>
          {msgs.length === 0 ? (
            <Text variant="bodySm" color="muted">
              No messages yet — say hi or share gate-code instructions.
            </Text>
          ) : (
            msgs.map((m) => {
              const mine = m.sender_role === 'purchaser';
              return (
                <View
                  key={m.id}
                  style={[styles.bubble, mine ? styles.mine : styles.theirs]}
                >
                  <Text
                    variant="eyebrow"
                    color={mine ? 'cream' : 'champagne'}
                  >
                    {(mine ? 'YOU' : m.sender_name || 'COURIER').toUpperCase()}
                  </Text>
                  <Text
                    variant="bodySm"
                    color={mine ? 'cream' : 'ink'}
                    style={{ marginTop: 4 }}
                  >
                    {m.body}
                  </Text>
                  <Text
                    variant="caption"
                    color={mine ? 'cream' : 'muted'}
                    style={{ marginTop: 4, opacity: mine ? 0.8 : 1 }}
                  >
                    {relativeTime(m.created_at)}
                  </Text>
                </View>
              );
            })
          )}

          <Field
            label="Message courier"
            value={draft}
            onChangeText={setDraft}
            placeholder="Hi! Please call when you arrive."
            multiline
            numberOfLines={2}
            style={{ minHeight: 56, textAlignVertical: 'top' as const } as any}
          />
          <Button label={busy ? 'Sending…' : 'Send to courier'} onPress={send} loading={busy} full />
        </View>
      ) : null}

      <CallModal
        visible={callOpen}
        onClose={() => setCallOpen(false)}
        name={courierName}
        phone={courierPhone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  headRow:   { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  chat: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.creamRule,
  },
  bubble: {
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radii.md,
    maxWidth: '95%',
  },
  mine:    { backgroundColor: colors.charcoal, alignSelf: 'flex-end' },
  theirs:  {
    backgroundColor: colors.creamSoft, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: colors.creamRule,
  },
});
