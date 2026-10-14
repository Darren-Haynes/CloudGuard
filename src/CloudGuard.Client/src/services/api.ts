import type { ServerAsset, AuditLogEntry } from '../types';
import { ASSET_API_URL } from '../config';
import { authFetch } from './auth';

// Fetch the entire global fleet array
export async function fetchServerAssets(): Promise<ServerAsset[]> {
  const response = await authFetch(ASSET_API_URL);
  if (!response.ok) {
    throw new Error(`Security service connection failed: ${response.statusText}`);
  }
  return response.json();
}

// FETCH A SINGLE DENSE INFRASTRUCTURE PROFILE BY UNIQUE ID
export async function fetchServerAssetById(id: string): Promise<ServerAsset> {
  const cleanId = id.toString().trim().toLowerCase();
  const response = await authFetch(`${ASSET_API_URL}/${cleanId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Requested hardware perimeter node could not be located.');
    }
    throw new Error('Telemetry retrieval handshake experienced a transient link error.');
  }
  return response.json();
}

// Execute live security patch remediation sequences with explicit admin identity headers
export async function remediateServerPatches(id: string): Promise<ServerAsset> {
  const cleanId = id.toString().trim().toLowerCase();

  const response = await authFetch(`${ASSET_API_URL}/${cleanId}/remediate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 👇 INJECT CORPORATE OPERATOR ACCESS CLAIMS FOR THE BACKEND INTERCEPT LOGGER
      'X-CloudGuard-User': 'darren-sre-lead',
      'X-CloudGuard-Role': 'SecOps-Admin-Tier3'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Remediation network transaction experienced an unexpected failure.');
  }

  const data = await response.json();
  return data.updatedAsset;
}

// Fetch the immutable corporate security audit ledger log trail from memory channels
export async function fetchSecurityAuditTrail(): Promise<AuditLogEntry[]> {
  const response = await authFetch(`${ASSET_API_URL}/security/audit-trail`);
  if (!response.ok) throw new Error('Failed to query immutable security audit ledger records.');
  return response.json();
}

// Download a file the API protects. A plain link or window.location cannot carry the access
// token, so the file is fetched with it and handed to the browser as a blob.
//
// The file name is worked out here rather than read from Content-Disposition, because the API
// does not expose that header to cross-origin scripts.
async function downloadProtectedFile(url: string, fileName: string, failureMessage: string): Promise<void> {
  const response = await authFetch(url);
  if (!response.ok) {
    throw new Error(failureMessage);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser a moment to start the download before the blob goes away.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

// The CSV for the fleet, or for one building / room. The file name matches the API's own.
export async function downloadAuditCsv(building: string | null, room: string | null): Promise<void> {
  const params = new URLSearchParams();
  if (building) params.append('building', building);
  if (room) params.append('room', room);

  const query = params.toString();
  const url = query ? `${ASSET_API_URL}/export?${query}` : `${ASSET_API_URL}/export`;
  const fileName = `cloudguard_${building?.toLowerCase() || 'all'}_${room?.toLowerCase() || 'all'}_audit.csv`;

  await downloadProtectedFile(url, fileName, 'The audit report could not be downloaded. Please try again.');
}

// The plain-text report for one server. The file name matches the API's own.
export async function downloadAssetTextReport(id: string, serverName: string): Promise<void> {
  const cleanId = id.toString().trim().toLowerCase();
  const fileName = `cloudguard_audit_${serverName.toLowerCase()}.txt`;

  await downloadProtectedFile(
    `${ASSET_API_URL}/${cleanId}/export/text`,
    fileName,
    'The server report could not be downloaded. Please try again.',
  );
}
