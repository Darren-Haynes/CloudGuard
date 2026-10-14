import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const API_ORIGIN = 'https://api.cloudguard.test';

const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

// AuthGate reads VITE_REQUIRE_LOGIN when it is first imported, so each test sets it and then
// loads fresh copies of the gate and of the auth module it shares with the tests.
async function load(requireLogin: boolean) {
  vi.resetModules();
  vi.stubEnv('VITE_REQUIRE_LOGIN', requireLogin ? 'true' : 'false');
  vi.stubEnv('VITE_API_BASE_URL', API_ORIGIN);
  const { AuthGate } = await import('./AuthGate');
  const auth = await import('../services/auth');
  return { AuthGate, auth };
}

describe('AuthGate', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('shows the app straight away when no login is required', async () => {
    const { AuthGate } = await load(false);

    render(<AuthGate><p>the app</p></AuthGate>);

    expect(screen.getByText('the app')).toBeInTheDocument();
    expect(screen.queryByLabelText('Access password')).not.toBeInTheDocument();
  });

  it('shows the lock screen and keeps the app unmounted when a login is required', async () => {
    const { AuthGate } = await load(true);
    const mounted = vi.fn();
    const Probe = () => { mounted(); return <p>the app</p>; };

    render(<AuthGate><Probe /></AuthGate>);

    expect(screen.getByLabelText('Access password')).toBeInTheDocument();
    expect(screen.queryByText('the app')).not.toBeInTheDocument();
    expect(mounted).not.toHaveBeenCalled();
  });

  it('shows the app when a login is required but there is already a valid session', async () => {
    const { AuthGate, auth } = await load(true);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: 't', expiresAt: inOneHour() }) });
    await auth.login('pw');

    render(<AuthGate><p>the app</p></AuthGate>);

    expect(screen.getByText('the app')).toBeInTheDocument();
  });

  it('ignores an expired session', async () => {
    const { AuthGate } = await load(true);
    sessionStorage.setItem('cloudguard.session', JSON.stringify({ token: 't', expiresAt: Date.now() - 1000 }));

    render(<AuthGate><p>the app</p></AuthGate>);

    expect(screen.getByLabelText('Access password')).toBeInTheDocument();
  });

  it('unlocks with the right password', async () => {
    const { AuthGate } = await load(true);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: 't', expiresAt: inOneHour() }) });

    render(<AuthGate><p>the app</p></AuthGate>);
    fireEvent.change(screen.getByLabelText('Access password'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByText('the app')).toBeInTheDocument();
  });

  it('stays locked with the wrong password', async () => {
    const { AuthGate } = await load(true);
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Incorrect password.' }) });

    render(<AuthGate><p>the app</p></AuthGate>);
    fireEvent.change(screen.getByLabelText('Access password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password.');
    expect(screen.queryByText('the app')).not.toBeInTheDocument();
  });

  it('goes back to the lock screen, with a notice, when the API rejects the token', async () => {
    const { AuthGate, auth } = await load(false);
    render(<AuthGate><p>the app</p></AuthGate>);
    expect(screen.getByText('the app')).toBeInTheDocument();

    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await act(async () => {
      await auth.authFetch('https://x.test/a').catch(() => undefined);
    });

    expect(screen.queryByText('the app')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Access password')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('session has ended');
  });

  it('shows the app again, without the notice, after unlocking once more', async () => {
    const { AuthGate, auth } = await load(false);
    render(<AuthGate><p>the app</p></AuthGate>);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await act(async () => {
      await auth.authFetch('https://x.test/a').catch(() => undefined);
    });

    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: 't', expiresAt: inOneHour() }) });
    fireEvent.change(screen.getByLabelText('Access password'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByText('the app')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
