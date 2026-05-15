import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { apiGet, apiPatch, ApiError } from '../../lib/api';
import { prettyDate } from '../../lib/format';
import { space } from '../../theme';
import type { Role } from '../../lib/types';

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  created_at: string;
  shop_name: string | null;
};

const ROLES: Role[] = ['purchaser', 'seller', 'admin'];

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await apiGet<AdminUser[]>('/admin/users');
      setUsers(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeRole(u: AdminUser, role: Role) {
    try {
      await apiPatch(`/admin/users/${u.id}/role`, { role });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update role.');
    }
  }

  return (
    <Screen background="cream" maxFrame="desktop">
      <AppHeader eyebrow="ADMIN" title="Users" back />

      {error ? <Text variant="caption" color="danger" style={{ marginBottom: space.md }}>{error}</Text> : null}

      {users === null ? null : users.length === 0 ? (
        <Text variant="body" color="muted">No users.</Text>
      ) : (
        <View style={{ width: '100%' }}>
          {users.map((u) => (
            <Card key={u.id} tone="white" style={{ marginBottom: space.sm, width: '100%' }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" color="ink">{u.name}</Text>
                  <Text variant="caption" color="muted">{u.email} · joined {prettyDate(u.created_at)}</Text>
                  {u.shop_name ? <Text variant="caption" color="muted">Shop: {u.shop_name}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: space.xs }}>
                  <Pill label={u.role.toUpperCase()} tone={u.role === 'admin' ? 'plum' : u.role === 'seller' ? 'champagne' : 'muted'} />
                  <View style={styles.roleBtns}>
                    {ROLES.filter((r) => r !== u.role).map((r) => (
                      <Pressable key={r} onPress={() => changeRole(u, r)}>
                        <Text variant="caption" color="champagne">→ {r}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'flex-start' },
  roleBtns: { flexDirection: 'row', gap: space.sm, marginTop: 4 },
});
