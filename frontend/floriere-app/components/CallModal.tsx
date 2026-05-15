/**
 * Mock phone-call modal. Pass 3 (mocked) — the deck excluded real telephony
 * and we don't launch the OS dialer. Instead we present a calm modal that
 * reads as "ringing" so the demo can show the courier-contact affordance.
 */

import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { colors, radii, space } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  phone: string | null;
  /** Eyebrow text — defaults to "CALLING". */
  label?: string;
};

export function CallModal({ visible, onClose, name, phone, label = 'CALLING' }: Props) {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible) {
      setDots('');
      setElapsed(0);
      return;
    }
    const tick = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '·'));
      setElapsed((s) => s + 1);
    }, 700);
    return () => clearInterval(tick);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text variant="eyebrow" color="champagne">{label}</Text>
          <Text variant="h2" color="ink" style={{ marginTop: space.sm }}>{name}</Text>
          <Text variant="body" color="muted" style={{ marginTop: space.xs }}>
            {phone ?? '+66 8• ••• ••••'}
          </Text>

          {/* Ringing affordance — soft champagne ring */}
          <View style={styles.ringWrap}>
            <View style={styles.ring}>
              <Text variant="h1" color="champagne">{dots || '·'}</Text>
            </View>
          </View>

          <Text variant="caption" color="muted" style={{ marginTop: space.sm }}>
            {elapsed > 0 ? `Ringing… ${elapsed}s` : 'Ringing…'}
          </Text>
          <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
            Demo — Florière doesn't dial real numbers in V1.
          </Text>

          <View style={{ height: space.lg }} />
          <Button label="Hang up" variant="danger" onPress={onClose} full />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(28, 26, 23, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
    padding: space.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  ringWrap: {
    marginTop: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2,
    borderColor: colors.champagneSoft,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.creamSoft,
  },
});
