import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Field } from './Field';
import { Text } from './Text';
import { colors, radii, space } from '../theme';
import type { OrderMessage, Role } from '../lib/types';
import { relativeTime } from '../lib/format';

type Props = {
  messages: OrderMessage[];
  myRole: Role | 'courier';
  busy?: boolean;
  onSend: (body: string) => Promise<void>;
  empty?: string;
};

/** Order-scoped chat thread: purchaser ⇄ seller ⇄ admin. */
export function MessageThread({ messages, myRole, busy, onSend, empty }: Props) {
  const [draft, setDraft] = useState('');

  async function submit() {
    const body = draft.trim();
    if (!body) return;
    await onSend(body);
    setDraft('');
  }

  return (
    <View style={styles.wrap}>
      {messages.length === 0 ? (
        <Text variant="body" color="muted">
          {empty ?? 'Send the first message — questions, gate codes, special instructions.'}
        </Text>
      ) : (
        <View>
          {messages.map((m) => {
            const mine = m.sender_role === myRole;
            return (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  mine ? styles.mine : styles.theirs,
                ]}
              >
                <Text variant="eyebrow" color={mine ? 'cream' : 'champagne'}>
                  {m.sender_role.toUpperCase()} · {m.sender_name}
                </Text>
                <Text variant="bodySm" color={mine ? 'cream' : 'ink'} style={{ marginTop: 4 }}>
                  {m.body}
                </Text>
                <Text variant="caption" color={mine ? 'cream' : 'muted'} style={{ marginTop: 4, opacity: mine ? 0.8 : 1 }}>
                  {relativeTime(m.created_at)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: space.md }} />
      <Field
        label="Send a message"
        value={draft}
        onChangeText={setDraft}
        placeholder="Type your message…"
        multiline
        numberOfLines={2}
        style={{ minHeight: 60, textAlignVertical: 'top' as const } as any}
      />
      <Button label={busy ? 'Sending…' : 'Send'} onPress={submit} loading={busy} full />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { width: '100%' },
  bubble:  {
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radii.md,
    maxWidth: '95%',
  },
  mine:    {
    backgroundColor: colors.charcoal,
    alignSelf: 'flex-end',
  },
  theirs:  {
    backgroundColor: colors.creamSoft,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
});
