// Register — full-viewport split. Same shape as login.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { PlaceholderImage } from '../../components/PlaceholderImage';
import { Text } from '../../components/Text';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { colors, radii, space } from '../../theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [phone, setPhone]         = useState('');
  const [asSeller, setAsSeller]   = useState(false);
  const [shopName, setShopName]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email and password are required.');
      return;
    }
    if (asSeller && !shopName.trim()) {
      setError('Shop name is required for merchant accounts.');
      return;
    }
    setLoading(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        as_seller: asSeller,
        shop_name: shopName.trim() || undefined,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not connect to Florière.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-cream">
      <View className="flex-1 flex-col lg:flex-row">

        {/* Left: TODO photo slot (desktop only) */}
        <View className="hidden lg:flex lg:flex-1 lg:min-h-screen relative">
          <PlaceholderImage size="lg" fill />
        </View>

        {/* Right: form */}
        <ScrollView
          className="flex-1 bg-cream"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-xl lg:px-huge py-xxxl lg:py-huge justify-center items-center lg:items-start">
            <View className="w-full max-w-[460px]">
              <View className="items-center lg:items-start mb-xxl">
                <BrandMark size="md" />
                <Text variant="quote" color="muted" align="center" style={{ marginTop: space.sm }}>
                  Open an account.
                </Text>
              </View>

              <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@email.com"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="At least 6 characters"
              />
              <Field
                label="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+66 …"
              />

              <Pressable
                style={[styles.toggle, asSeller && styles.toggleOn]}
                onPress={() => setAsSeller((v) => !v)}
                accessibilityRole="switch"
                accessibilityState={{ checked: asSeller }}
              >
                <View style={[styles.toggleDot, asSeller && styles.toggleDotOn]} />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <Text variant="bodySm" color="ink">I'm signing up as a flower merchant</Text>
                  <Text variant="caption" color="muted">
                    Manage your stems, accept orders, fulfil deliveries.
                  </Text>
                </View>
              </Pressable>

              {asSeller ? (
                <View style={{ marginTop: space.md }}>
                  <Field
                    label="Shop name"
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder="Floriste de Sukhumvit"
                  />
                </View>
              ) : null}

              {error ? (
                <Text variant="caption" color="danger" style={{ marginBottom: space.md }}>{error}</Text>
              ) : null}

              <Button label={loading ? 'Creating account…' : 'Create account'} onPress={handleRegister} loading={loading} full />
              <View style={{ height: space.md }} />
              <Button
                label="I already have an account"
                variant="secondary"
                full
                onPress={() => router.push('/(auth)/login')}
              />
              <View style={{ height: space.lg }} />
              <Text variant="caption" color="muted" align="center" onPress={() => router.push('/')}>
                ← Back to home
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.white,
    marginBottom: space.md,
  },
  toggleOn:   { borderColor: colors.champagne, backgroundColor: colors.champagneTint },
  toggleDot:  {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.muted, backgroundColor: 'transparent',
  },
  toggleDotOn: { backgroundColor: colors.champagne, borderColor: colors.champagne },
});
