import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Resolution order:
//   1. EXPO_PUBLIC_API_URL env var (set in .env or shell)
//   2. extra.apiUrl from app.json
//   3. http://10.0.2.2:5000 on Android emulator (alias for host's 127.0.0.1)
//   4. http://localhost:5000 everywhere else
function resolveApiUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (envUrl) return envUrl;

  const extraUrl =
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim() ?? '';
  if (extraUrl) return extraUrl;

  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://localhost:5000';
}

export const API_URL = resolveApiUrl();
