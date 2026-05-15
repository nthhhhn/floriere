/**
 * Tip-the-courier card. Pass 3 (mocked) — no real payment, we just record
 * the intended tip on the order so the demo can show a delightful flow.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { apiPost, ApiError } from '../lib/api';
import { thb } from '../lib/format';
import { colors, radii, space } from '../theme';

import { Button } from './Button';
import { Field } from './Field';
import { Text } from './Text';

type Props = {
  orderId: number;
  courierName: string;
  /** If already tipped, render in confirmation mode. */
  existingTip?: number;
  existingNote?: string | null;
  onTipped?: (amount: number) => void;
};

const PRESETS = [20, 50, 100];

export function TipCard({ orderId, courierName, existingTip = 0, existingNote, onTipped }: Props) {
  const [amount, setAmount]   = useState<number>(existingTip || 0);
  const [custom, setCustom]   = useState('');
  const [showCustom, setShow] = useState(false);
  const [note, setNote]       = useState(existingNote ?? '');
  const [busy, setBusy]       = useState(false);
  const [done, setDone]       = useState<number>(existingTip);
  const [err,  setErr]        = useState<string | null>(null);

  async function submit() {
    let final = amount;
    if (showCustom) {
      const parsed = parseInt(custom, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setErr('Enter a tip amount.');
        return;
      }
      final = parsed;
    }
    if (!final) { setErr('Pick an amount.'); return; }
    setBusy(true); setErr(null);
    try {
      await apiPost(`/orders/${orderId}/tip`, { amount_thb: final, note: note.trim() || null });
      setDone(final);
      onTipped?.(final);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not send tip.');
    } finally {
      setBusy(false);
    }
  }

  if (done > 0) {
    return (
      <View style={styles.confirm}>
        <Text variant="eyebrow" color="champagne">TIP SENT</Text>
        <Text variant="h3" color="ink" style={{ marginTop: 4 }}>
          {thb(done)} to {courierName}
        </Text>
        {note ? (
          <Text variant="quote" color="ink" style={{ marginTop: space.sm }}>"{note}"</Text>
        ) : null}
        <Text variant="caption" color="muted" style={{ marginTop: space.sm }}>
          Demo — Florière V1 doesn't move real money. The intent is logged on this order.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text variant="eyebrow" color="champagne">SEND A TIP TO YOUR COURIER</Text>
      <Text variant="bodySm" color="muted" style={{ marginTop: 4 }}>
        A small thank-you to {courierName}.
      </Text>

      <View style={styles.row}>
        {PRESETS.map((p) => {
          const on = amount === p && !showCustom;
          return (
            <Pressable
              key={p}
              onPress={() => { setAmount(p); setShow(false); }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text variant="body" color={on ? 'cream' : 'ink'}>{thb(p)}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => { setShow(true); setAmount(0); }}
          style={[styles.chip, showCustom && styles.chipOn]}
        >
          <Text variant="body" color={showCustom ? 'cream' : 'ink'}>Custom</Text>
        </Pressable>
      </View>

      {showCustom ? (
        <Field
          label="Custom amount (฿)"
          value={custom}
          onChangeText={setCustom}
          keyboardType="number-pad"
          placeholder="e.g., 75"
        />
      ) : null}

      <Field
        label="Thank-you note (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="Thanks for the careful handoff!"
        multiline
        numberOfLines={2}
        style={{ minHeight: 56, textAlignVertical: 'top' as const } as any}
      />

      {err ? <Text variant="caption" color="danger">{err}</Text> : null}

      <Button
        label={busy ? 'Sending…' : 'Send tip'}
        onPress={submit}
        loading={busy}
        disabled={busy || (!amount && !showCustom)}
        full
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.sm,
    flexWrap: 'wrap',
    marginTop: space.md,
    marginBottom: space.md,
  },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
  },
  chipOn: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  confirm: {
    padding: space.lg,
    backgroundColor: colors.creamSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamRule,
  },
});
