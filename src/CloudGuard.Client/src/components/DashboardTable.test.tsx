import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardTable } from './DashboardTable';
import type { ServerAsset } from '../types';

describe('DashboardTable Component', () => {
  const mockAssets: ServerAsset[] = [
    {
      id: '1',
      serverName: 'gsy-hr-vm-02',
      operatingSystem: 'Ubuntu 22.04 LTS',
      missingPatches: 4,
      securityStatus: 'Vulnerable',
      lastAuditedAt: new Date().toISOString()
    },
    {
      id: '2',
      serverName: 'gsy-fin-prod-01',
      operatingSystem: 'Windows Server 2022',
      missingPatches: 0,
      securityStatus: 'Compliant',
      lastAuditedAt: new Date().toISOString()
    },
    {
      id: '3',
      serverName: 'gsy-backup-nas-01',
      operatingSystem: 'Windows Server 2022', // Identical OS to create a tie-breaker condition!
      missingPatches: 12, // High patch count to verify numerical order
      securityStatus: 'Vulnerable',
      lastAuditedAt: new Date().toISOString()
    }
  ];

  it('renders server row entries accurately inside the table body grid layout', () => {
    render(<DashboardTable assets={mockAssets} />);

    expect(screen.getByText('gsy-fin-prod-01')).toBeInTheDocument();
    expect(screen.getByText('Ubuntu 22.04 LTS')).toBeInTheDocument();
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('executes interactive column sorting and applies secondary alphabetical tie-breakers correctly', () => {
    render(<DashboardTable assets={mockAssets} />);

    // Locate the clickable 'OS' header target
    const osHeader = screen.getByText(/OS/i);

    // Click once to trigger ascending sort by Operating System
    fireEvent.click(osHeader);

    let rows = screen.getAllByRole('row').slice(1); // Exclude header row
    expect(rows[0]).toHaveTextContent('gsy-hr-vm-02'); // Ubuntu ('U') before Windows ('W')

    // Click to sort by OS again to reverse primary direction and trigger secondary tie-breakers
    fireEvent.click(osHeader);

    rows = screen.getAllByRole('row').slice(1);

    // Check our secondary alphabetical tie-breaker sequence explicitly
    expect(rows[0]).toHaveTextContent('gsy-backup-nas-01'); // 'b' comes before 'f'
    expect(rows[1]).toHaveTextContent('gsy-fin-prod-01');
  });

  // 👇 ADDED TO COVER LINES 30, 58, 93, 105 (DESCENDING NUMERICAL SORT PATH)
  it('reverses row order mathematically when sorting by missing patches in descending direction', () => {
    render(<DashboardTable assets={mockAssets} />);

    const patchesHeader = screen.getByText(/Missing Patches/i);

    // 1. First Click: Sort by patches ascending (0 -> 4 -> 12)
    fireEvent.click(patchesHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('gsy-fin-prod-01'); // 0 patches

    // 2. Second Click: Sort by patches descending (12 -> 4 -> 0)
    fireEvent.click(patchesHeader);
    rows = screen.getAllByRole('row').slice(1);

    // Verify that the highest numerical values are forced right to the top of the grid
    expect(rows[0]).toHaveTextContent('gsy-backup-nas-01'); // 12 patches
    expect(rows[1]).toHaveTextContent('gsy-hr-vm-02');      // 4 patches
    expect(rows[2]).toHaveTextContent('gsy-fin-prod-01');     // 0 patches
  });
});
