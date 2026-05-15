/**
 * Delivery-photo affordance.
 *
 * - On the purchaser side: shows the photo the courier "took" at drop-off.
 * - On the seller side: a preset-picker (no real camera, no real upload).
 *
 * Pass 3 (mocked) — preset URLs come from the backend so the seller's pick
 * is deterministic across the demo flow.
 */

import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { apiGet, apiPost, ApiError } from '../lib/api';
import { prettyDateTime } from '../lib/format';
import { colors, radii, space } from '../theme';

import { Button } from './Button';
import { Text } from './Text';

type DisplayProps = {
  url: string;
  takenAt?: string | null;
  courierName?: string | null;
  caption?: string;
};

export function DeliveryPhotoDisplay({ url, takenAt, courierName, caption }: DisplayProps) {
  return (
    <View>
      <View style={styles.frame}>
        <Image source={{ uri: url }} style={styles.img} contentFit="cover" />
      </View>
      <Text variant="caption" color="muted" align="center" style={{ marginTop: space.sm }}>
        {caption ?? 'Left at reception'}
        {takenAt ? ` · ${prettyDateTime(takenAt)}` : ''}
        {courierName ? ` · by ${courierName}` : ''}
      </Text>
    </View>
  );
}

type PickerProps = {
  orderId: number;
  initialUrl?: string | null;
  onPicked?: (url: string) => void;
};

export function DeliveryPhotoPicker({ orderId, initialUrl, onPicked }: PickerProps) {
  const [presets, setPresets] = useState<string[]>([]);
  const [picked, setPicked]   = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy]       = useState(false);
  const [err,  setErr]        = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ presets: string[] }>('/orders/photo_presets')
      .then((r) => setPresets(r.presets))
      .catch(() => setPresets([]));
  }, []);

  async function commit(url: string) {
    setBusy(true); setErr(null);
    try {
      await apiPost(`/orders/${orderId}/delivery_photo`, { url });
      setPicked(url);
      onPicked?.(url);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not save photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Text variant="eyebrow" color="champagne">DELIVERY PHOTO</Text>
      <Text variant="bodySm" color="muted" style={{ marginTop: 4 }}>
        Pick the shot for this drop-off. Demo — your phone camera isn't wired in V1.
      </Text>

      {picked ? (
        <View style={{ marginTop: space.md }}>
          <DeliveryPhotoDisplay url={picked} caption="Attached to this order" />
          <Button
            label={busy ? 'Updating…' : 'Pick a different photo'}
            variant="secondary"
            onPress={() => setPicked(null)}
            loading={busy}
            full
          />
        </View>
      ) : (
        <View style={styles.grid}>
          {presets.map((p) => (
            <Pressable
              key={p}
              onPress={() => commit(p)}
              style={styles.thumb}
              disabled={busy}
            >
              <Image source={{ uri: p }} style={styles.thumbImg} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      )}

      {err ? <Text variant="caption" color="danger">{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderColor: colors.champagne,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.cream,
  },
  img: {
    width: '100%',
    aspectRatio: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md,
  },
  thumb: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.creamSoft,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
});
