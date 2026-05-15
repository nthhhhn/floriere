// NativeWind: register Tailwind base styles. Must be the very first import so
// the CSS is in the runtime before any className-styled component mounts.
import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandMark } from '../components/BrandMark';
import { NotifToast } from '../components/NotifToast';
import { AuthProvider, homeRouteForRole, useAuth } from '../lib/auth-context';
import { colors, space } from '../theme';

// Routes that any authenticated role may visit (shared across roles).
const SHARED_ROUTES = new Set(['notifications']);

// Compute the redirect target for the current segments + user.
// Returns null if no redirect is needed.
function computeRedirect(segments: string[], user: ReturnType<typeof useAuth>['user']): string | null {
  const first = segments[0] ?? '';
  const inAuth      = first === '(auth)';
  const inPurchaser = first === '(purchaser)';
  const inSeller    = first === '(seller)';
  const inAdmin     = first === '(admin)';
  const onLanding   = first === '' || first === 'index';
  const inShared    = SHARED_ROUTES.has(first);

  if (!user) {
    if (!onLanding && !inAuth) return '/';
    return null;
  }

  if (onLanding || inAuth) return homeRouteForRole(user.role);

  if (inShared) return null;

  if (user.role === 'purchaser' && (inSeller || inAdmin)) return '/(purchaser)/home';
  if (user.role === 'seller'    && (inPurchaser || inAdmin)) return '/(seller)/home';
  if (user.role === 'admin'     && (inPurchaser || inSeller)) return '/(admin)/home';

  return null;
}

function NavigationGate() {
  const segments = useSegments();
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    const target = computeRedirect(segments as string[], user);
    if (target) router.replace(target as any);
  }, [user, ready, segments, router]);

  return null;
}

function Splash() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cream,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.xl,
      }}
    >
      <BrandMark size="md" />
      <ActivityIndicator color={colors.champagne} />
    </View>
  );
}

function AppShell() {
  const { ready, user } = useAuth();
  const segments = useSegments();
  // While auth is resolving, or while a route is about to redirect, show the
  // splash. This prevents flashes of the wrong screen (e.g. landing → home,
  // or protected screens firing API calls before token is ready).
  const pendingRedirect = ready ? computeRedirect(segments as string[], user) : null;
  if (!ready || pendingRedirect) {
    // Gate must stay mounted so its effect fires the router.replace.
    return (
      <>
        <NavigationGate />
        <Splash />
      </>
    );
  }
  return (
    <>
      <NavigationGate />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index"        options={{ title: 'Florière' }} />
        <Stack.Screen name="(auth)"       options={{ title: 'Sign in' }} />
        <Stack.Screen name="(purchaser)"  options={{ title: 'Florière' }} />
        <Stack.Screen name="(seller)"     options={{ title: 'Merchant' }} />
        <Stack.Screen name="(admin)"      options={{ title: 'Admin' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
      <NotifToast />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
