import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API_ORIGIN = 'https://api.cloudguard.test';
const fetchMock = vi.fn();

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: 'OK',
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
  } as Response;
}

// Every API call goes through authFetch, which passes the headers as a Headers object.
function sentHeaders(callIndex = 0): Headers {
  return (fetchMock.mock.calls[callIndex][1] as RequestInit).headers as Headers;
}

// api.ts resolves its base URL from config.ts when first imported, so each test sets
// VITE_API_BASE_URL and then imports a fresh copy of the module.
describe('api service request URLs', () => {
  let api: typeof import('./api');

  beforeEach(async () => {
    sessionStorage.clear();
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

    expect(fetchMock).toHaveBeenCalledWith(`${API_ORIGIN}/api/asset`, expect.anything());
  });

  it('loads a single asset using its trimmed, lower-cased id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'abc-123' }));

    await api.fetchServerAssetById('  ABC-123 ');

    expect(fetchMock).toHaveBeenCalledWith(`${API_ORIGIN}/api/asset/abc-123`, expect.anything());
  });

  it('posts remediation to the configured origin with the operator identity headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ updatedAsset: { id: 'abc-123' } }));

    const asset = await api.remediateServerPatches('ABC-123');

    expect(asset).toEqual({ id: 'abc-123' });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_ORIGIN}/api/asset/abc-123/remediate`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );

    const headers = sentHeaders();
    expect(headers.get('X-CloudGuard-User')).toBe('darren-sre-lead');
    expect(headers.get('X-CloudGuard-Role')).toBe('SecOps-Admin-Tier3');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('reads the audit trail from the configured API origin', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.fetchSecurityAuditTrail();

    expect(fetchMock).toHaveBeenCalledWith(`${API_ORIGIN}/api/asset/security/audit-trail`, expect.anything());
  });

  describe('access token', () => {
    const signIn = async () => {
      const auth = await import('./auth');
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ token: 'the-token', expiresAt: new Date(Date.now() + 60_000).toISOString() }),
      );
      await auth.login('pw');
      fetchMock.mockClear();
    };

    it('sends the bearer token on every call once logged in', async () => {
      await signIn();
      fetchMock.mockResolvedValue(jsonResponse([]));

      await api.fetchServerAssets();
      await api.fetchServerAssetById('abc');
      await api.fetchSecurityAuditTrail();
      fetchMock.mockResolvedValueOnce(jsonResponse({ updatedAsset: {} }));
      await api.remediateServerPatches('abc');

      expect(fetchMock).toHaveBeenCalledTimes(4);
      for (let i = 0; i < 4; i++) {
        expect(sentHeaders(i).get('Authorization')).toBe('Bearer the-token');
      }
    });

    it('sends no Authorization header when there is no token', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]));

      await api.fetchServerAssets();

      expect(sentHeaders().has('Authorization')).toBe(false);
    });

    it('turns a 401 into an UnauthorizedError for every call', async () => {
      const { UnauthorizedError } = await import('./auth');
      fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 401 }));

      await expect(api.fetchServerAssets()).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(api.fetchServerAssetById('abc')).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(api.remediateServerPatches('abc')).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(api.fetchSecurityAuditTrail()).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('file downloads', () => {
    let clickedLinks: Array<{ href: string; download: string }>;
    let clickSpy: ReturnType<typeof vi.spyOn>;
    const createObjectURL = vi.fn(() => 'blob:cloudguard-test');
    const revokeObjectURL = vi.fn();

    beforeEach(() => {
      vi.useFakeTimers();
      clickedLinks = [];
      createObjectURL.mockClear();
      revokeObjectURL.mockClear();
      Object.assign(URL, { createObjectURL, revokeObjectURL });
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clickedLinks.push({ href: this.href, download: this.download });
      });
    });

    afterEach(() => {
      clickSpy.mockRestore();
      vi.useRealTimers();
    });

    it('downloads the whole-fleet CSV with the token and an "all" file name', async () => {
      const auth = await import('./auth');
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ token: 't', expiresAt: new Date(Date.now() + 60_000).toISOString() }),
      );
      await auth.login('pw');
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(jsonResponse('csv'));

      await api.downloadAuditCsv(null, null);

      expect(fetchMock.mock.calls[0][0]).toBe(`${API_ORIGIN}/api/asset/export`);
      expect(sentHeaders().get('Authorization')).toBe('Bearer t');
      expect(clickedLinks).toEqual([{ href: 'blob:cloudguard-test', download: 'cloudguard_all_all_audit.csv' }]);
      expect(document.querySelector('a[download]')).toBeNull();
    });

    it('scopes the CSV by building and room and names the file like the API does', async () => {
      fetchMock.mockResolvedValue(jsonResponse('csv'));

      await api.downloadAuditCsv('Building 1', 'Room 01');

      expect(fetchMock.mock.calls[0][0]).toBe(`${API_ORIGIN}/api/asset/export?building=Building+1&room=Room+01`);
      expect(clickedLinks[0].download).toBe('cloudguard_building 1_room 01_audit.csv');
    });

    it('names a building-only CSV with "all" for the room', async () => {
      fetchMock.mockResolvedValue(jsonResponse('csv'));

      await api.downloadAuditCsv('Building 2', null);

      expect(fetchMock.mock.calls[0][0]).toBe(`${API_ORIGIN}/api/asset/export?building=Building+2`);
      expect(clickedLinks[0].download).toBe('cloudguard_building 2_all_audit.csv');
    });

    it('downloads a single server report using the trimmed, lower-cased id', async () => {
      fetchMock.mockResolvedValue(jsonResponse('text'));

      await api.downloadAssetTextReport('  ABC-123 ', 'Building1-RM01-001');

      expect(fetchMock.mock.calls[0][0]).toBe(`${API_ORIGIN}/api/asset/abc-123/export/text`);
      expect(clickedLinks[0].download).toBe('cloudguard_audit_building1-rm01-001.txt');
    });

    it('releases the blob URL shortly after starting the download', async () => {
      fetchMock.mockResolvedValue(jsonResponse('text'));

      await api.downloadAssetTextReport('abc', 'srv');
      expect(revokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:cloudguard-test');
    });

    it('fails with a readable message and downloads nothing when the API refuses', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

      await expect(api.downloadAuditCsv(null, null)).rejects.toThrow('The audit report could not be downloaded');
      await expect(api.downloadAssetTextReport('abc', 'srv')).rejects.toThrow('The server report could not be downloaded');

      expect(clickedLinks).toEqual([]);
      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('treats a 401 on a download as an ended session', async () => {
      const { UnauthorizedError } = await import('./auth');
      fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 401 }));

      await expect(api.downloadAuditCsv(null, null)).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });
});
