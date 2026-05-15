import { StyleSheet, View } from 'react-native';

import { colors, space } from '../theme';
import { Text } from './Text';
import { Pill } from './Pill';
import type { OrderEvent } from '../lib/types';
import { prettyDateTime, statusLabel } from '../lib/format';

type Props = {
  events: OrderEvent[];
  empty?: string;
};

const EVENT_LABEL: Record<OrderEvent['event_type'], string> = {
  status:          'Status',
  message:         'Message',
  cancel_request:  'Cancel request',
  cancel_response: 'Cancel decision',
  note:            'Note',
  concierge:       'Concierge',
};

const BULLET_TONE: Partial<Record<OrderEvent['event_type'], string>> = {
  concierge:       colors.plum,
  cancel_request:  colors.danger,
  cancel_response: colors.danger,
};

const ACTOR_TONE: Record<string, 'champagne' | 'plum' | 'muted'> = {
  purchaser: 'champagne',
  seller:    'plum',
  admin:     'muted',
  system:    'muted',
};

export function OrderTimeline({ events, empty }: Props) {
  // Skip plain `message` events — they're already rendered in the chat thread,
  // and a timeline cluttered with every message back-and-forth loses signal.
  // Status changes, cancellations, ratings, and explicit notes stay.
  const visible = events.filter((e) => e.event_type !== 'message');
  if (visible.length === 0) {
    return (
      <Text variant="body" color="muted">
        {empty ?? 'No events on this order yet.'}
      </Text>
    );
  }
  return (
    <View style={styles.list}>
      {visible.map((e, idx) => (
        <View key={e.id} style={styles.row}>
          <View style={styles.gutter}>
            <View style={[styles.bullet, BULLET_TONE[e.event_type] ? { backgroundColor: BULLET_TONE[e.event_type] } : null]} />
            {idx < visible.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.body}>
            <View style={styles.headerRow}>
              <Text variant="eyebrow" color="champagne">
                {EVENT_LABEL[e.event_type]}
              </Text>
              {e.actor_role ? (
                <Pill label={e.actor_role.toUpperCase()} tone={ACTOR_TONE[e.actor_role] ?? 'muted'} />
              ) : null}
            </View>
            <Text variant="bodySm" color="ink" style={{ marginTop: 2 }}>
              {e.event_type === 'status' && e.to_status
                ? `Moved to ${statusLabel(e.to_status)}`
                : (e.note || EVENT_LABEL[e.event_type])}
            </Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
              {prettyDateTime(e.created_at)}
              {e.actor_name ? ` · ${e.actor_name}` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list:    { width: '100%' },
  row:     { flexDirection: 'row', paddingVertical: space.xs },
  gutter:  { width: 18, alignItems: 'center' },
  bullet:  {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.champagne, marginTop: 4,
  },
  line:    {
    flex: 1, width: 1, backgroundColor: colors.creamRule, marginTop: 2,
  },
  body:    { flex: 1, paddingLeft: space.md, paddingBottom: space.md },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap',
  },
});
