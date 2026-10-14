import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API_ORIGIN = 'https://api.cloudguard.test';
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

describe('auth service', () => {
  let auth: typeof import('./auth');

  beforeEach(async () => {
    sessionStorage.clear();
    vi.stubEnv('VITE_API_BASE_URL', API_ORIGIN);
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
    auth = await import('./auth');
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('login', () => {
    it('posts the password as JSON to the login endpoint and keeps the token', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ token: 'abc.def.ghi', expiresAt: inOneHour() }));

      await auth.login('correct horse');

      expect(fetchMock).toHaveBeenCalledWith(`${API_ORIGIN}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'correct horse' }),
      });
      expect(auth.getToken()).toBe('abc.def.ghi');
      expect(auth.hasValidSession()).toBe(true);
    });

    it('keeps the token in sessionStorage only, never localStorage', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ token: 'abc.def.ghi', expiresAt: inOneHour() }));
      const localSet = vi.spyOn(Storage.prototype, 'setItem');

      await auth.login('pw');

      expect(sessionStorage.length).toBe(1);
      expect(localStorage.length).toBe(0);
      localSet.mockRestore();
    });

    it('reports an incorrect password without storing anything', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'Incorrect password.' }, 401));

      await expect(auth.login('wrong')).rejects.toThrow('Incorrect password.');

      expect(auth.getToken()).toBeNull();
      expect(sessionStorage.length).toBe(0);
    });

    it("shows the server's message for other refusals, such as an unconfigured server", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ message: 'Access control is not configured on the server.' }, 503),
      );

      await expect(auth.login('pw')).rejects.toThrow('Access control is not configured on the server.');
    });

    it('falls back to a generic message when the refusal has no readable body', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('not json'); } } as unknown as Response);

      await expect(auth.login('pw')).rejects.toThrow('The server could not process the login');
    });

    it('reports a network failure in plain words', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(auth.login('pw')).rejects.toThrow('Could not reach the server');
    });

    it.each([
      ['no token', { expiresAt: inOneHour() }],
      ['no expiry', { token: 'abc' }],
      ['an unreadable expiry', { token: 'abc', expiresAt: 'not a date' }],
      ['a non-string token', { token: 42, expiresAt: inOneHour() }],
    ])('rejects a success response with %s', async (_label, body) => {
      fetchMock.mockResolvedValue(jsonResponse(body));

      await expect(auth.login('pw')).rejects.toThrow('unexpected login response');
      expect(auth.getToken()).toBeNull();
    });

    it('rejects a success response that is not JSON', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('not json'); } } as unknown as Response);

      await expect(auth.login('pw')).rejects.toThrow('unexpected login response');
    });
  });

  describe('stored session', () => {
    it('has no token before login', () => {
      expect(auth.getToken()).toBeNull();
      expect(auth.hasValidSession()).toBe(false);
    });

    it('treats an expired token as no token and removes it', async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue(jsonResponse({ token: 'abc', expiresAt: new Date(Date.now() + 1000).toISOString() }));
      await auth.login('pw');
      expect(auth.getToken()).toBe('abc');

      vi.advanceTimersByTime(1001);

      expect(auth.getToken()).toBeNull();
      expect(sessionStorage.length).toBe(0);
    });

    it.each([
      ['not JSON', 'garbage'],
      ['JSON of the wrong shape', JSON.stringify({ token: 1 })],
      ['JSON null', 'null'],
    ])('ignores stored data that is %s', (_label, raw) => {
      sessionStorage.setItem('cloudguard.session', raw);

      expect(auth.getToken()).toBeNull();
    });

    it('clearSession logs out', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ token: 'abc', expiresAt: inOneHour() }));
      await auth.login('pw');

      auth.clearSession();

      expect(auth.hasValidSession()).toBe(false);
    });

    it('copes with storage that throws', async () => {
      const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      fetchMock.mockResolvedValue(jsonResponse({ token: 'abc', expiresAt: inOneHour() }));

      expect(auth.getToken()).toBeNull();
      expect(() => auth.clearSession()).not.toThrow();
      await expect(auth.login('pw')).resolves.toBeUndefined();

      getItem.mockRestore();
      removeItem.mockRestore();
      setItem.mockRestore();
    });
  });

  describe('authFetch', () => {
    it('adds the bearer token and keeps the caller\'s own headers and options', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'tok', expiresAt: inOneHour() }));
      await auth.login('pw');
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(jsonResponse({}));

      await auth.authFetch('https://x.test/a', { method: 'POST', headers: { 'X-Custom': '1' } });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://x.test/a');
      expect(init.method).toBe('POST');
      expect((init.headers as Headers).get('X-Custom')).toBe('1');
      expect((init.headers as Headers).get('Authorization')).toBe('Bearer tok');
    });

    it('sends the request without Authorization when logged out', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));

      await auth.authFetch('https://x.test/a');

      expect((fetchMock.mock.calls[0][1].headers as Headers).has('Authorization')).toBe(false);
    });

    it('returns non-401 error responses to the caller untouched', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'tok', expiresAt: inOneHour() }));
      await auth.login('pw');
      fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, 404));

      const response = await auth.authFetch('https://x.test/a');

      expect(response.status).toBe(404);
      expect(auth.getToken()).toBe('tok');
    });

    it('on a 401 drops the token, tells listeners and throws UnauthorizedError', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'tok', expiresAt: inOneHour() }));
      await auth.login('pw');
      const listener = vi.fn();
      auth.onUnauthorized(listener);
      fetchMock.mockResolvedValue(jsonResponse({}, 401));

      await expect(auth.authFetch('https://x.test/a')).rejects.toBeInstanceOf(auth.UnauthorizedError);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(auth.getToken()).toBeNull();
    });

    it('stops telling a listener once it has unsubscribed', async () => {
      const listener = vi.fn();
      const unsubscribe = auth.onUnauthorized(listener);
      unsubscribe();
      fetchMock.mockResolvedValue(jsonResponse({}, 401));

      await expect(auth.authFetch('https://x.test/a')).rejects.toThrow();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  it('UnauthorizedError has a readable message and name', () => {
    const error = new auth.UnauthorizedError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnauthorizedError');
    expect(error.message).toContain('session has ended');
  });
});
