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
      lastAuditedAt: new Date().toISOString()
    },
    {
      id: '2',
      serverName: 'gsy-test-02',
      operatingSystem: 'Windows',
      missingPatches: 12,
      securityStatus: 'Critical',
      lastAuditedAt: new Date().toISOString()
    },
    {
      id: '3',
      serverName: 'jsy-test-03',
      operatingSystem: 'Linux',
      missingPatches: 5,
      securityStatus: 'Vulnerable',
      lastAuditedAt: new Date().toISOString()
    }
  ];

  it('correctly aggregates data fields and renders values on the dashboard grid', () => {
    // Act
    render(<MetricCards assets={mockAssets} />);

    // Assert: Total count should equal full array length (3)
    expect(screen.getByText('3')).toBeInTheDocument();

    // Assert: Only 1 server strictly matches the 'Critical' parameter filter string
    expect(screen.getByText('1')).toBeInTheDocument();

    // Assert: Accumulate total patch drift (0 + 12 + 5 = 17)
    expect(screen.getByText('17')).toBeInTheDocument();
  });
});
