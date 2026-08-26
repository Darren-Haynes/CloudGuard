import React from 'react';
import type { ServerAsset } from './types';
import { DashboardTable } from './components/DashboardTable';

const MOCK_ASSETS: ServerAsset[] = [
  {
    id: '1a9f3c2e-4b5a-4d6e-8f7a-9b0c1d2e3f4a',
    serverName: 'gsy-fin-prod-01',
    operatingSystem: 'Windows Server 2022',
    missingPatches: 0,
    securityStatus: 'Compliant',
    lastAuditedAt: '2026-08-25T08:30:00Z',
  },
  {
    id: '2b0a4d3f-5c6b-5e7f-9a8b-0c1d2e3f4a5b',
    serverName: 'gsy-hr-vm-02',
    operatingSystem: 'Ubuntu 22.04 LTS',
    missingPatches: 4,
    securityStatus: 'Vulnerable',
    lastAuditedAt: '2026-08-24T14:15:00Z',
  },
  {
    id: '3c1b5e4a-6d7c-6f8a-0b9c-1d2e3f4a5b6c',
    serverName: 'gsy-core-dc-01',
    operatingSystem: 'Windows Server 2019',
    missingPatches: 12,
    securityStatus: 'Critical',
    lastAuditedAt: '2026-08-23T11:45:00Z',
  },
];

export const App: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 0.5rem 0',
          }}
        >
          CloudGuard Infrastructure Dashboard
        </h1>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>
          Real-time security status and patch compliance across monitored servers.
        </p>
      </header>

      <main>
        <DashboardTable assets={MOCK_ASSETS} />
      </main>
    </div>
  );
};

export default App;
