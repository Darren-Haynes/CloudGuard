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
      serverRoom: 'Room 01'
    },
    {
      id: '2',
      serverName: 'building2-rm01-002',
      operatingSystem: 'Linux',
      missingPatches: 0,
      securityStatus: 'Compliant', // Triggers the Green Status Light
      lastAuditedAt: new Date().toISOString(),
      buildingName: 'Building 2',
      serverRoom: 'Room 01'
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
});
