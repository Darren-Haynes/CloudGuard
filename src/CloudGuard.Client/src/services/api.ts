import type { ServerAsset } from '../types';

const BASE_URL = 'http://localhost:5003/api/asset';

// Fetch the entire global fleet array
export async function fetchServerAssets(): Array<Promise<ServerAsset>> {
  const response = await fetch(BASE_URL);
  if (!response.ok) {
    throw new Error(`Security service connection failed: ${response.statusText}`);
  }
  return response.json();
}

// FETCH A SINGLE DENSE INFRASTRUCTURE PROFILE BY UNIQUE ID
export async function fetchServerAssetById(id: string): Promise<ServerAsset> {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Requested hardware perimeter node could not be located.');
    }
    throw new Error('Telemetry retrieval handshake experienced a transient link error.');
  }
  return response.json();
}

// Execute live security patch remediation sequences over a specific hardware ID
export async function remediateServerPatches(id: string): Promise<ServerAsset> {
  const cleanId = id.toString().trim().toLowerCase();

  const response = await fetch(`http://localhost:5003/api/asset/${cleanId}/remediate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Remediation network transaction experienced an unexpected failure.');
  }

  const data = await response.json();
  return data.updatedAsset;
}
