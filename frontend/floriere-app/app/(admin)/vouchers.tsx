import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiGet, apiPatch, apiPost, ApiError } from '../../lib/api';
import type { Voucher } from '../../lib/types';
import { prettyDate, thb } from '../../lib/format';
import { space } from '../../theme';

export default function AdminVouchers() {
  const [list, setList] = useState<Voucher[] | null>(null);
  const [code, setCode]               = useState('');
  const [description, setDescription] = useState('');
  const [percent, setPercent]         = useState('');
  const [flat, setFlat]               = useState('');
  const [minSub, setMinSub]           = useState('0');
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await apiGet<Voucher[]>('/admin/vouchers');
      setList(rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load vouchers.');
      setList([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setError(null);
    if (!code.trim()) { setError('Code required.'); return; }
    setBusy(true);
    try {
      await apiPost('/admin/vouchers', {
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        percent_off: percent ? Number(percent) : null,
        flat_off_thb: flat ? Number(flat) : null,
        min_subtotal: Number(minSub) || 0,
      });
      setCode(''); setDescription(''); setPercent(''); setFlat(''); setMinSub('0');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create voucher.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(v: Voucher) {
    try {
      await apiPatch(`/admin/vouchers/${v.id}`, { active: !v.active });
      await load();
    } catch { /* ignore */ }
  }

  return (
    <Screen background="cream" maxFrame="desktop" back>
      <AppHeader eyebrow="ADMIN" title="Voucher codes" />

      <Card tone="creamSoft" style={{ width: '100%', marginBottom: space.xl }}>
        <Text variant="eyebrow" color="champagne">NEW VOUCHER</Text>
        <Field label="Code"         value={code}        onChangeText={(v) => setCode(v.toUpperCase())} placeholder="GRADER25" />
        <Field label="Description"  value={description} onChangeText={setDescription} placeholder="25% off — for the App Dev grader" />
        <Field label="Percent off (1-100)"  value={percent}     onChangeText={setPercent}     keyboardType="numeric" placeholder="25" />
        <Field label="Flat off (THB)"       value={flat}        onChangeText={setFlat}        keyboardType="numeric" placeholder="200" />
        <Field label="Minimum subtotal (THB)" value={minSub}      onChangeText={setMinSub}      keyboardType="numeric" placeholder="0" />
        {error ? <Text variant="caption" color="danger" style={{ marginBottom: space.sm }}>{error}</Text> : null}
        <Button label={busy ? 'Saving…' : 'Create voucher'} onPress={create} loading={busy} full />
        <Text variant="caption" color="muted" style={{ marginTop: space.sm }}>
          Set EITHER percent OR flat — not both.
        </Text>
      </Card>

      <Text variant="eyebrow" color="champagne" style={{ marginBottom: space.sm }}>EXISTING</Text>
      {list === null ? null : list.length === 0 ? (
        <Text variant="body" color="muted">No vouchers yet.</Text>
      ) : (
        list.map((v) => (
          <Card key={v.id} tone="white" style={{ width: '100%', marginBottom: space.sm, opacity: v.active ? 1 : 0.5 }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text variant="h3" color="ink">{v.code}</Text>
                  <Pill label={v.active ? 'ACTIVE' : 'INACTIVE'} tone={v.active ? 'champagne' : 'muted'} />
                  {v.percent_off ? <Pill label={`${v.percent_off}% OFF`} tone="plum" /> : null}
                  {v.flat_off_thb ? <Pill label={`${thb(v.flat_off_thb)} OFF`} tone="plum" /> : null}
                </View>
                {v.description ? (
                  <Text variant="bodySm" color="muted" style={{ marginTop: space.xs }}>{v.description}</Text>
                ) : null}
                <Text variant="caption" color="muted">
                  Min subtotal: {thb(v.min_subtotal)} · {v.expires_at ? `Expires ${prettyDate(v.expires_at)}` : 'No expiry'}
                </Text>
              </View>
              <Pressable onPress={() => toggle(v)}>
                <Text variant="caption" color="champagne">{v.active ? 'Deactivate' : 'Activate'}</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
