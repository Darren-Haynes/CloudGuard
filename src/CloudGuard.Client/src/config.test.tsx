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
