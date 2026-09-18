import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardTable } from './DashboardTable';
import type { ServerAsset } from '../types';

describe('DashboardTable Component', () => {
  // 💡 Add a spy handle to track drilldown clicks accurately
  const mockOnSelectServer = vi.fn();

  const mockAssets: ServerAsset[] = [
    {
      id: '1',
      serverName: 'gsy-hr-vm-02',
      operatingSystem: 'Ubuntu 22.04 LTS',
      missingPatches: 4,
      securityStatus: 'Vulnerable',
      lastAuditedAt: new Date().toISOString(),
      buildingName: 'Building 1',
      serverRoom: 'Room 02',
      // 👇 New full-stack telemetry contracts added to pass typescript checks
      cpuCoreCount: 4,
      installedRamGb: 16,
      ipAddress: '10.1.10.20',
      macAddress: '00:11:22:33:44:55',
      uptimeSeconds: 86400,
      freeRamGb: 4.2,
      cpuAgeMonths: 12,
      ramAgeMonths: 12,
      diskAgeMonths: 12,
      avgCpuLoad24H: 25.5,
      avgCpuLoad1W: 20.1,
      avgCpuLoad1M: 18.5,
      avgRamLoad24H: 45.2,
      avgRamLoad1W: 42.1,
      avgRamLoad1M: 40.5,
      lastShellCommands: 'df -h'
    },
    {
      id: '2',
      serverName: 'gsy-fin-prod-01',
      operatingSystem: 'Windows Server 2022',
      missingPatches: 0,
      securityStatus: 'Compliant',
      lastAuditedAt: new Date().toISOString(),
      buildingName: 'Building 1',
      serverRoom: 'Room 01',
      cpuCoreCount: 8,
      installedRamGb: 32,
      ipAddress: '10.1.10.21',
      macAddress: '00:11:22:33:44:56',
      uptimeSeconds: 172800,
      freeRamGb: 12.8,
      cpuAgeMonths: 6,
      ramAgeMonths: 6,
      diskAgeMonths: 6,
      avgCpuLoad24H: 15.5,
      avgCpuLoad1W: 12.1,
      avgCpuLoad1M: 10.5,
      avgRamLoad24H: 35.2,
      avgRamLoad1W: 32.1,
      avgRamLoad1M: 30.5,
      lastShellCommands: 'ipconfig'
    },
    {
      id: '3',
      serverName: 'gsy-backup-nas-01',
      operatingSystem: 'Windows Server 2022',
      missingPatches: 12,
      securityStatus: 'Vulnerable',
      lastAuditedAt: new Date().toISOString(),
      buildingName: 'Building 1',
      serverRoom: 'Room 01',
      cpuCoreCount: 16,
      installedRamGb: 64,
      ipAddress: '10.1.10.22',
      macAddress: '00:11:22:33:44:57',
      uptimeSeconds: 259200,
      freeRamGb: 44.1,
      cpuAgeMonths: 24,
      ramAgeMonths: 24,
      diskAgeMonths: 24,
      avgCpuLoad24H: 5.5,
      avgCpuLoad1W: 4.1,
      avgCpuLoad1M: 3.5,
      avgRamLoad24H: 15.2,
      avgRamLoad1W: 12.1,
      avgRamLoad1M: 10.5,
      lastShellCommands: 'Get-Disk'
    }
  ];

  it('renders server row entries accurately inside the table body grid layout', () => {
    render(<DashboardTable assets={mockAssets} onSelectServer={mockOnSelectServer} />);

    expect(screen.getByText('gsy-fin-prod-01')).toBeInTheDocument();
    expect(screen.getByText('Ubuntu 22.04 LTS')).toBeInTheDocument();
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('executes interactive column sorting and applies secondary alphabetical tie-breakers correctly', () => {
    render(<DashboardTable assets={mockAssets} onSelectServer={mockOnSelectServer} />);

    const osHeader = screen.getByText(/OS/i);

    fireEvent.click(osHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('gsy-hr-vm-02');

    fireEvent.click(osHeader);
    rows = screen.getAllByRole('row').slice(1);

    expect(rows[0]).toHaveTextContent('gsy-backup-nas-01');
    expect(rows[1]).toHaveTextContent('gsy-fin-prod-01');
  });

  it('reverses row order mathematically when sorting by missing patches in descending direction', () => {
    render(<DashboardTable assets={mockAssets} onSelectServer={mockOnSelectServer} />);

    const patchesHeader = screen.getByText(/Missing Patches/i);

    fireEvent.click(patchesHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('gsy-fin-prod-01');

    fireEvent.click(patchesHeader);
    rows = screen.getAllByRole('row').slice(1);

    expect(rows[0]).toHaveTextContent('gsy-backup-nas-01');
    expect(rows[1]).toHaveTextContent('gsy-hr-vm-02');
    expect(rows[2]).toHaveTextContent('gsy-fin-prod-01');
  });
});
