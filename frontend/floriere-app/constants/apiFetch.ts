import { getSession } from './session';
import { API_URL } from './api';
export async function apiFetch(path: string, options: RequestInit = {}) {
  const session = await getSession();
  console.log('Session in apiFetch:', session); // ← add this
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (session) {
    headers['X-User-ID'] = String(session.user_id);
  }
  return fetch(`${API_URL}${path}`, { ...options, headers });
}