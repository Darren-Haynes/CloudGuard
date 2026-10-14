import { afterEach, describe, expect, it, vi } from 'vitest';

// config.ts reads VITE_API_BASE_URL once, when it is first imported, so each case sets
// the variable and then imports a fresh copy of the module.
async function loadConfig() {
  vi.resetModules();
  return import('./config');
}

describe('API location config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the local API when VITE_API_BASE_URL is not set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', undefined);

    const { API_ORIGIN, ASSET_API_URL } = await loadConfig();

    expect(API_ORIGIN).toBe('http://localhost:5003');
    expect(ASSET_API_URL).toBe('http://localhost:5003/api/asset');
  });

  it('falls back to the local API when VITE_API_BASE_URL is an empty string', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    const { API_ORIGIN } = await loadConfig();

    expect(API_ORIGIN).toBe('http://localhost:5003');
  });

  it('uses VITE_API_BASE_URL as the API origin when it is set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://func-cloudguard-telemetry-prd.azurewebsites.net');

    const { API_ORIGIN, ASSET_API_URL } = await loadConfig();

    expect(API_ORIGIN).toBe('https://func-cloudguard-telemetry-prd.azurewebsites.net');
    expect(ASSET_API_URL).toBe('https://func-cloudguard-telemetry-prd.azurewebsites.net/api/asset');
  });

  it('strips trailing slashes so request paths never contain a double slash', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.cloudguard.test///');

    const { API_ORIGIN, ASSET_API_URL } = await loadConfig();

    expect(API_ORIGIN).toBe('https://api.cloudguard.test');
    expect(ASSET_API_URL).toBe('https://api.cloudguard.test/api/asset');
  });
});

// Every refresh is a billable call to the Function App, so the cadence is a deliberate choice
// that should not change by accident.
describe('polling cadence', () => {
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;

  it('refreshes the fleet every 2 hours', async () => {
    const { ASSET_POLL_INTERVAL_MS } = await loadConfig();

    expect(ASSET_POLL_INTERVAL_MS).toBe(2 * HOUR);
  });

  it('refreshes an open audit ledger every minute', async () => {
    const { AUDIT_POLL_INTERVAL_MS } = await loadConfig();

    expect(AUDIT_POLL_INTERVAL_MS).toBe(MINUTE);
  });

  it('retries a failed load after 30 seconds', async () => {
    const { ERROR_RETRY_INTERVAL_MS } = await loadConfig();

    expect(ERROR_RETRY_INTERVAL_MS).toBe(30 * 1000);
  });
});
