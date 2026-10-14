// Where the browser finds the CloudGuard API.
//
// Set VITE_API_BASE_URL when building to the API's origin (scheme and host only, no
// path), for example https://func-cloudguard-telemetry-prd.azurewebsites.net.
// Without it the app talks to the local API on http://localhost:5003.
const DEFAULT_API_ORIGIN = 'http://localhost:5003';

export const API_ORIGIN: string = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_ORIGIN).replace(/\/+$/, '');

export const ASSET_API_URL = `${API_ORIGIN}/api/asset`;
