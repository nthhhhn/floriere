// Login — full-viewport split. Desktop: hero LEFT, form RIGHT.
// Mobile: form only (no hero — keeps the form focused on small screens).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { PlaceholderImage } from '../../components/PlaceholderImage';
import { Text } from '../../components/Text';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api';
import { space } from '../../theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
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
            <View className="w-full max-w-[420px]">
              <View className="items-center lg:items-start mb-xxl">
                <BrandMark size="md" />
                <Text variant="quote" color="muted" align="center" style={{ marginTop: space.sm }}>
                  Sign in to send something true.
                </Text>
              </View>

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
                error={error}
              />
              <Button label={loading ? 'Signing in…' : 'Sign in'} onPress={handleLogin} loading={loading} full />
              <View style={{ height: space.md }} />
              <Button
                label="Create an account"
                variant="secondary"
                full
                onPress={() => router.push('/(auth)/register')}
              />
              <View style={{ height: space.lg }} />
              <Text variant="caption" color="muted" align="center" onPress={() => router.push('/')}>
                ← Back to home
              </Text>

              <View className="mt-xxxl pt-lg border-t border-creamRule items-center lg:items-start">
                <Text variant="eyebrow" color="champagne">DEMO ACCOUNTS</Text>
                <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                  pete@floriere.test · purchaser123{'\n'}
                  merchant@floriere.test · merchant123{'\n'}
                  admin@floriere.test · admin123
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
