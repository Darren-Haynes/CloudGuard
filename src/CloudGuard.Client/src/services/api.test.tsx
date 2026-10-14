import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API_ORIGIN = 'https://api.cloudguard.test';

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: 'OK',
    json: async () => body,
  } as Response;
}

// api.ts resolves its base URL from config.ts when first imported, so each test sets
// VITE_API_BASE_URL and then imports a fresh copy of the module.
describe('api service request URLs', () => {
  const fetchMock = vi.fn();
  let api: typeof import('./api');

  beforeEach(async () => {
    vi.stubEnv('VITE_API_BASE_URL', `${API_ORIGIN}/`);
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
    api = await import('./api');
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('loads the fleet from the configured API origin', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.fetchServerAssets();

    expect(fetchMock).toHaveBeenCalledWith(`${API_ORIGIN}/api/asset`);
  });

  it('loads a single asset using its trimmed, lower-cased id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'abc-123' }));

    await api.fetchServerAssetById('  ABC-123 ');

    expect(fetchMock).toHaveBeenCalledWith(`${API_ORIGIN}/api/asset/abc-123`);
  });

  it('posts remediation to the configured origin with the operator identity headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ updatedAsset: { id: 'abc-123' } }));

    const asset = await api.remediateServerPatches('ABC-123');

    expect(asset).toEqual({ id: 'abc-123' });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_ORIGIN}/api/asset/abc-123/remediate`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CloudGuard-User': 'darren-sre-lead',
          'X-CloudGuard-Role': 'SecOps-Admin-Tier3',
        }),
      }),
    );
  });

  it('reads the audit trail from the configured API origin', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.fetchSecurityAuditTrail();

    expect(fetchMock).toHaveBeenCalledWith(`${API_ORIGIN}/api/asset/security/audit-trail`);
  });
});
