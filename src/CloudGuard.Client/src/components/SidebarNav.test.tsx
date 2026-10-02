import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SidebarNav } from './SidebarNav';
import type { ServerAsset } from '../types';

describe('SidebarNav Component', () => {
  const mockAssets: ServerAsset[] = [
    {
      id: '1',
      serverName: 'building1-rm01-001',
      operatingSystem: 'Ubuntu',
      missingPatches: 12,
      securityStatus: 'Critical', // Triggers the Red Status Light
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
      serverName: 'building2-rm01-002',
      operatingSystem: 'Linux',
      missingPatches: 0,
      securityStatus: 'Compliant', // Triggers the Green Status Light
      lastAuditedAt: new Date().toISOString(),
      buildingName: 'Building 2',
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

  it('renders structural infrastructure scopes and filters items upon user interaction', () => {
    const onSelectScopeSpy = vi.fn();

    // Act
    render(
      <SidebarNav
        assets={mockAssets}
        selectedBuilding={null}
        selectedRoom={null}
        onSelectScope={onSelectScopeSpy}
        currentView="fleet"
        onSelectView={vi.fn()}
      />
    );

    // Assert: Check that fleet root triggers mount smoothly
    expect(screen.getByText(/View Entire Fleet/i)).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument(); // 2 items total in fleet

    // Assert: Building 1 is expanded by default, confirm Room 01 sub-link renders
    const roomButton = screen.getByText(/Room 01/i);
    expect(roomButton).toBeInTheDocument();

    // Act: Simulate an administrator clicking on Room 01
    fireEvent.click(roomButton);

    // Assert: Verify callback fires with specific building/room scope parameters
    expect(onSelectScopeSpy).toHaveBeenCalledWith('Building 1', 'Room 01');
  });

  it('invokes onSelectView("audit") when the System Audit Ledger button is clicked', () => {
    const onSelectViewSpy = vi.fn();

    render(
      <SidebarNav
        assets={mockAssets}
        selectedBuilding={null}
        selectedRoom={null}
        onSelectScope={vi.fn()}
        currentView="fleet"
        onSelectView={onSelectViewSpy}
      />
    );

    fireEvent.click(screen.getByText(/System Audit Ledger/i));

    expect(onSelectViewSpy).toHaveBeenCalledWith('audit');
  });

  it('invokes onSelectView("analytics") when the Cluster Analytics button is clicked and highlights it when active', () => {
    const onSelectViewSpy = vi.fn();

    const { rerender } = render(
      <SidebarNav
        assets={mockAssets}
        selectedBuilding={null}
        selectedRoom={null}
        onSelectScope={vi.fn()}
        currentView="fleet"
        onSelectView={onSelectViewSpy}
      />
    );

    fireEvent.click(screen.getByText(/Cluster Analytics/i));
    expect(onSelectViewSpy).toHaveBeenCalledWith('analytics');
    expect(screen.getByTestId('sidebar-cluster-analytics')).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0)' });

    rerender(
      <SidebarNav
        assets={mockAssets}
        selectedBuilding={null}
        selectedRoom={null}
        onSelectScope={vi.fn()}
        currentView="analytics"
        onSelectView={vi.fn()}
      />
    );

    expect(screen.getByTestId('sidebar-cluster-analytics')).toHaveStyle({ backgroundColor: 'rgb(79, 70, 229)' });
  });

  it('highlights the audit ledger button only when the audit view is active', () => {
    const { rerender } = render(
      <SidebarNav
        assets={mockAssets}
        selectedBuilding={null}
        selectedRoom={null}
        onSelectScope={vi.fn()}
        currentView="fleet"
        onSelectView={vi.fn()}
      />
    );

    const button = screen.getByTestId('sidebar-audit-ledger');
    expect(button).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0)' });

    rerender(
      <SidebarNav
        assets={mockAssets}
        selectedBuilding={null}
        selectedRoom={null}
        onSelectScope={vi.fn()}
        currentView="audit"
        onSelectView={vi.fn()}
      />
    );

    expect(screen.getByTestId('sidebar-audit-ledger')).toHaveStyle({ backgroundColor: 'rgb(79, 70, 229)' });
  });
});
