// Where the browser finds the CloudGuard API.
//
// Set VITE_API_BASE_URL when building to the API's origin (scheme and host only, no
// path), for example https://func-cloudguard-telemetry-prd.azurewebsites.net.
// Without it the app talks to the local API on http://localhost:5003.
const DEFAULT_API_ORIGIN = 'http://localhost:5003';

export const API_ORIGIN: string = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_ORIGIN).replace(/\/+$/, '');

export const ASSET_API_URL = `${API_ORIGIN}/api/asset`;

// How often an open page asks the API for fresh data. Every refresh is a billable call to
// the Function App, so these are deliberately slow. A page only refreshes while its browser
// tab is visible (see hooks/usePolling.ts); a tab that was hidden refreshes as soon as it is
// shown again if its data is older than the interval.

// The server list. In the deployed app the data only changes when a visitor remediates a
// server, and the page applies that change itself, so there is little to catch up on.
// Running the local API? Its VulnerabilityWorker changes server statuses every minute and a
// refresh this slow will not show that: reload the page, or lower this value while demoing.
export const ASSET_POLL_INTERVAL_MS = 2 * 60 * 60 * 1000;

// The audit ledger, while it is open.
export const AUDIT_POLL_INTERVAL_MS = 60 * 1000;

// How long to wait before trying again after a failed load, so one failure (for example a
// cold start that times out) does not leave an error on screen for a whole interval.
export const ERROR_RETRY_INTERVAL_MS = 30 * 1000;
