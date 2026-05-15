// Session token + user storage. SecureStore on native, AsyncStorage on web.
// SecureStore isn't available on web in Expo — fall back to AsyncStorage there.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthUser } from './types';

const TOKEN_KEY = 'floriere.token';
const USER_KEY  = 'floriere.user';

const isWeb = Platform.OS === 'web';

async function getRaw(key: string): Promise<string | null> {
  if (isWeb) return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setRaw(key: string, value: string): Promise<void> {
  if (isWeb) return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

async function delRaw(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getToken(): Promise<string | null> {
  return getRaw(TOKEN_KEY);
}

export async function getUser(): Promise<AuthUser | null> {
  const raw = await getRaw(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function saveSession(token: string, user: AuthUser): Promise<void> {
  await setRaw(TOKEN_KEY, token);
  await setRaw(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await delRaw(TOKEN_KEY);
  await delRaw(USER_KEY);
}
