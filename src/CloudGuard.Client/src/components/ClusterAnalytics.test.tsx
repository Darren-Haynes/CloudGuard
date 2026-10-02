import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClusterAnalytics } from './ClusterAnalytics';
import type { ServerAsset } from '../types';

const buildAsset = (overrides: Partial<ServerAsset>): ServerAsset => ({
  id: '1',
  serverName: 'node-01',
  operatingSystem: 'Ubuntu 22.04 LTS',
  missingPatches: 0,
  securityStatus: 'Compliant',
  lastAuditedAt: new Date().toISOString(),
  buildingName: 'Building 1',
  serverRoom: 'Room 01',
  cpuCoreCount: 8,
  installedRamGb: 32,
  freeRamGb: 16,
  ipAddress: '10.0.0.1',
  macAddress: '00:11:22:33:44:55',
  uptimeSeconds: 3600,
  cpuAgeMonths: 6,
  ramAgeMonths: 6,
  diskAgeMonths: 6,
  avgCpuLoad24H: 20,
  avgCpuLoad1W: 20,
  avgCpuLoad1M: 20,
  avgRamLoad24H: 40,
  avgRamLoad1W: 40,
  avgRamLoad1M: 40,
  lastShellCommands: 'clear',
  ...overrides,
});

describe('ClusterAnalytics Component', () => {
  it('renders both dashboard panels with semantic headings and the total server count', () => {
    const assets = [
      buildAsset({ id: '1', securityStatus: 'Compliant' }),
      buildAsset({ id: '2', securityStatus: 'Vulnerable', buildingName: 'Building 2' }),
      buildAsset({ id: '3', securityStatus: 'Critical', buildingName: 'Building 2' }),
    ];

    render(<ClusterAnalytics assets={assets} />);

    expect(screen.getByRole('heading', { name: 'Compliance Posture' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Building Hardware Allocation' })).toBeInTheDocument();
    expect(screen.getByText(/Server count by security status \(3 total\)/)).toBeInTheDocument();
    expect(screen.queryByText('No telemetry available yet.')).not.toBeInTheDocument();
  });

  it('shows an empty-state message in both panels when no assets are available', () => {
    render(<ClusterAnalytics assets={[]} />);

    expect(screen.getAllByText('No telemetry available yet.')).toHaveLength(2);
  });
});
