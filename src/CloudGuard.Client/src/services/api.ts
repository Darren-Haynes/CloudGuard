import type { ServerAsset } from '../types';

const API_BASE_URL = 'http://localhost:5003/api';

export async function fetchServerAssets(): Promise<ServerAsset[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/asset`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ServerAsset[] = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch server assets:', error);
    throw error;
  }
}
