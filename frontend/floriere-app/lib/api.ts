import { API_URL } from './config';
import { getToken } from './session';

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, payload: unknown, message: string) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...((headers as Record<string, string> | undefined) ?? {}),
  };

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body,
  });

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in (payload as object) &&
        typeof (payload as { error: unknown }).error === 'string')
        ? (payload as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, payload, message);
  }

  return payload as T;
}

export const apiGet = <T = unknown>(path: string, opts: { auth?: boolean } = {}) =>
  api<T>(path, { method: 'GET', ...opts });

export const apiPost = <T = unknown>(path: string, body?: unknown, opts: { auth?: boolean } = {}) =>
  api<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  });

export const apiPatch = <T = unknown>(path: string, body?: unknown, opts: { auth?: boolean } = {}) =>
  api<T>(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  });

export const apiDelete = <T = unknown>(path: string, opts: { auth?: boolean } = {}) =>
  api<T>(path, { method: 'DELETE', ...opts });
