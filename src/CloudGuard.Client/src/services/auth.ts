import { API_ORIGIN } from '../config';

// The shared-password lock, client side.
//
// A successful login gives a token that is good for a few hours. It is kept in sessionStorage,
// so it is gone when the tab closes, and it is never written anywhere else. The expiry is
// stored with it so an expired token is treated as no token at all.

const STORAGE_KEY = 'cloudguard.session';

interface StoredSession {
  token: string;
  expiresAt: number; // milliseconds since the epoch
}

// Thrown when the API says our token is missing, expired or not accepted.
export class UnauthorizedError extends Error {
  constructor() {
    super('Your session has ended. Please unlock again.');
    this.name = 'UnauthorizedError';
  }
}

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' && parsed !== null &&
      typeof (parsed as StoredSession).token === 'string' &&
      typeof (parsed as StoredSession).expiresAt === 'number'
    ) {
      return parsed as StoredSession;
    }
  } catch {
    // Unreadable or blocked storage is the same as being logged out.
  }
  return null;
}

// The current token, or null if there is none or it has expired.
export function getToken(): string | null {
  const session = readSession();
  if (session === null) return null;
  if (session.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }
  return session.token;
}

export function hasValidSession(): boolean {
  return getToken() !== null;
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

function saveSession(token: string, expiresAt: number): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt } satisfies StoredSession));
  } catch {
    // If the browser blocks storage the user simply has to unlock again on reload.
  }
}

// Listeners are told when the API rejects our token, so the app can go back to the lock screen.
type UnauthorizedListener = () => void;
const listeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Trade the shared password for a token. Throws an Error whose message is safe to show.
export async function login(password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Incorrect password.');
    throw new Error(
      typeof body.message === 'string' ? body.message : 'The server could not process the login. Try again later.',
    );
  }

  const data = await response.json().catch(() => null);
  const expiresAt = typeof data?.expiresAt === 'string' ? Date.parse(data.expiresAt) : NaN;
  if (typeof data?.token !== 'string' || Number.isNaN(expiresAt)) {
    throw new Error('The server sent an unexpected login response.');
  }

  saveSession(data.token, expiresAt);
}

// fetch with the access token attached. On a 401 the token is dropped, listeners are told and
// UnauthorizedError is thrown, so callers never have to handle expiry themselves.
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token !== null) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    clearSession();
    listeners.forEach((listener) => listener());
    throw new UnauthorizedError();
  }

  return response;
}
