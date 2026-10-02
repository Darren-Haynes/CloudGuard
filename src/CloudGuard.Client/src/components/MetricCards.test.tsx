import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricCards } from './MetricCards';
import type { ServerAsset } from '../types';

describe('MetricCards Component', () => {
  const mockAssets: ServerAsset[] = [
    {
      id: '1',
      serverName: 'gsy-test-01',
      operatingSystem: 'Ubuntu',
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
      lastShellCommands: 'clear'
    },
    {
      id: '2',
      serverName: 'gsy-test-02',
      operatingSystem: 'Windows',
      missingPatches: 12,
      securityStatus: 'Critical', // This should register as 1 Critical Alert
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
      lastShellCommands: 'clear'
    },
    {
      id: '3',
      serverName: 'jsy-test-03',
      operatingSystem: 'Linux',
      missingPatches: 5,
      securityStatus: 'Vulnerable',
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
      lastShellCommands: 'clear'
    }
  ];

  it('correctly aggregates data fields and renders values on the dashboard grid', () => {
    // Act
    render(<MetricCards assets={mockAssets} />);

    // Assert: Total count should equal full array length (3)
    expect(screen.getByText('3')).toBeInTheDocument();

    // Assert: Only 1 server strictly matches the 'Critical' parameter
    expect(screen.getByText('1')).toBeInTheDocument();

    // Assert: Accumulate total patch drift (0 + 12 + 5 = 17)
    expect(screen.getByText('17')).toBeInTheDocument();
  });
});
