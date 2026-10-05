import type { ServerAsset, AuditLogEntry } from '../types';

// 🌐 CONNECT FRONTEND TO LIVE AZURE SERVERLESS BACKEND INFRASTRUCTURE ENGINE
const BASE_URL = 'https://func-cloudguard-telemetry-prd.azurewebsites.net';

// Fetch the entire global fleet array
export async function fetchServerAssets(): Promise<ServerAsset[]> {
  const response = await fetch(`${BASE_URL}/asset`);
  if (!response.ok) {
    throw new Error(`Security service connection failed: ${response.statusText}`);
  }
  return response.json();
}

// FETCH A SINGLE DENSE INFRASTRUCTURE PROFILE BY UNIQUE ID
export async function fetchServerAssetById(id: string): Promise<ServerAsset> {
  const cleanId = id.toString().trim().toLowerCase();
  const response = await fetch(`${BASE_URL}/asset/${cleanId}`);
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

  const response = await fetch(`${BASE_URL}/asset/${cleanId}/remediate`, {
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
  const response = await fetch(`${BASE_URL}/asset/security/audit-trail`);
  if (!response.ok) throw new Error('Failed to query immutable security audit ledger records.');
  return response.json();
}
