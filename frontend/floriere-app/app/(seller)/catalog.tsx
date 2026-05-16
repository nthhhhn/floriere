import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PlaceholderImage, toneFromColor } from '../../components/PlaceholderImage';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiGet, apiPatch, apiPost, apiDelete, ApiError } from '../../lib/api';
import type { Flower } from '../../lib/types';
import { thb } from '../../lib/format';
import { colors, radii, space } from '../../theme';

const ILLUSTRATIONS = ['rose', 'tulip', 'lily', 'sunflower', 'peony', 'eucalyptus', 'babys_breath', 'generic'];

type Draft = {
  name: string;
  color: string;
  price_thb: string;
  stock: string;
  meaning: string;
  illustration: string;
};

const blank: Draft = { name: '', color: '', price_thb: '', stock: '0', meaning: '', illustration: 'rose' };

export default function SellerCatalog() {
  const [flowers, setFlowers] = useState<Flower[] | null>(null);
  const [draft, setDraft]     = useState<Draft>(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await apiGet<Flower[]>('/seller/flowers');
      setFlowers(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        color: draft.color.trim(),
        price_thb: Number(draft.price_thb) || 0,
        stock: Number(draft.stock) || 0,
        meaning: draft.meaning.trim() || null,
        illustration: draft.illustration,
      };
      if (editing) {
        await apiPatch(`/seller/flowers/${editing}`, payload);
      } else {
        await apiPost('/seller/flowers', payload);
      }
      setDraft(blank);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: number, active: boolean) {
    try {
      if (active) {
        await apiPatch(`/seller/flowers/${id}`, { active: 1 });
      } else {
        await apiDelete(`/seller/flowers/${id}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    }
  }

  function edit(f: Flower) {
    setEditing(f.id);
    setDraft({
      name: f.name,
      color: f.color,
      price_thb: String(f.price_thb),
      stock: String(f.stock),
      meaning: f.meaning ?? '',
      illustration: f.illustration ?? 'generic',
    });
  }

  return (
    <Screen background="cream" maxFrame="tablet" back="/(seller)/home" backLabel="Back">
      <AppHeader eyebrow="CATALOG" title="Manage your stems" />

      <Card tone="creamSoft" style={{ width: '100%', marginBottom: space.xl }}>
        <Text variant="eyebrow" color="champagne">
          {editing ? 'EDIT STEM' : 'ADD A STEM'}
        </Text>
        <Field label="Name" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} placeholder="Rose" />
        <Field label="Color" value={draft.color} onChangeText={(v) => setDraft({ ...draft, color: v })} placeholder="red, white, pink…" />
        <Field label="Price (THB)" value={draft.price_thb} onChangeText={(v) => setDraft({ ...draft, price_thb: v })} keyboardType="numeric" />
        <Field label="Stock" value={draft.stock} onChangeText={(v) => setDraft({ ...draft, stock: v })} keyboardType="numeric" />
        <Field label="Meaning" value={draft.meaning} onChangeText={(v) => setDraft({ ...draft, meaning: v })} placeholder="Love and passion" />

        <Text variant="eyebrow" color="muted" style={{ marginBottom: space.xs }}>PHOTO TYPE</Text>
        <View style={styles.illuRow}>
          {ILLUSTRATIONS.map((kind) => {
            const active = kind === draft.illustration;
            return (
              <Pressable key={kind} onPress={() => setDraft({ ...draft, illustration: kind })}>
                <View style={[styles.illuCell, active && styles.illuCellOn]}>
                  <View style={styles.illuImg}>
                    <PlaceholderImage label={kind} tone={toneFromColor(draft.color)} size="sm" fill />
                  </View>
                </View>
                <Text variant="caption" color={active ? 'champagne' : 'muted'} style={styles.illuLabel} numberOfLines={1}>
                  {kind.replace('_', ' ')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text variant="caption" color="danger" style={{ marginVertical: space.sm }}>{error}</Text> : null}

        <Button label={editing ? 'Save changes' : 'Add stem'} onPress={save} loading={busy} full />
        {editing ? (
          <>
            <View style={{ height: space.sm }} />
            <Button label="Cancel" variant="secondary" onPress={() => { setEditing(null); setDraft(blank); }} full />
          </>
        ) : null}
      </Card>

      <Text variant="eyebrow" color="champagne" style={{ marginBottom: space.sm }}>YOUR STEMS</Text>
      {flowers === null ? null : flowers.length === 0 ? (
        <Text variant="body" color="muted">No stems yet — add your first above.</Text>
      ) : (
        flowers.map((f) => (
          <Card key={f.id} tone="white" style={{ width: '100%', marginBottom: space.sm, opacity: f.active ? 1 : 0.5 }}>
            <View style={styles.flowerRow}>
              <View style={styles.flowerImg}>
                <PlaceholderImage label={f.name} subLabel={f.color} tone={toneFromColor(f.color)} size="sm" fill />
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <Text variant="h3" color="ink">{f.name} · {f.color}</Text>
                <Text variant="caption" color="muted">
                  {thb(f.price_thb)} · stock {f.stock}{f.active ? '' : ' · inactive'}
                </Text>
                {f.meaning ? <Text variant="caption" color="muted">{f.meaning}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: space.xs }}>
                <Pressable onPress={() => edit(f)}><Text variant="caption" color="champagne">Edit</Text></Pressable>
                {f.active ? (
                  <Pressable onPress={() => toggleActive(f.id, false)}><Text variant="caption" color="danger">Disable</Text></Pressable>
                ) : (
                  <Pressable onPress={() => toggleActive(f.id, true)}><Text variant="caption" color="success">Enable</Text></Pressable>
                )}
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  illuRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  illuCell: {
    width: 64, height: 64,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  illuCellOn: { borderColor: colors.champagne },
  illuImg:    { width: '100%', height: '100%' },
  illuLabel:  { width: 64, textAlign: 'center', marginTop: 2, fontSize: 9, letterSpacing: 0.2 },
  flowerRow:  { flexDirection: 'row', alignItems: 'center' },
  flowerImg:  { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.creamSoft },
});
