import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './App';
import { fetchServerAssets } from './services/api';
import type { ServerAsset } from './types';

// Mock the API client library completely
vi.mock('./services/api', () => ({
  fetchServerAssets: vi.fn(),
}));

describe('App Root Component Integration', () => {
  const mockAssets: ServerAsset[] = [
    {
      id: '1',
      serverName: 'gsy-fin-prod-01',
      operatingSystem: 'Windows Server 2022',
      missingPatches: 0,
      securityStatus: 'Compliant',
      lastAuditedAt: new Date().toISOString(),
    },
    {
      id: '2',
      serverName: 'gsy-hr-vm-02',
      operatingSystem: 'Ubuntu 22.04 LTS',
      missingPatches: 4,
      securityStatus: 'Vulnerable',
      lastAuditedAt: new Date().toISOString(),
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially, then resolves data telemetry cleanly', async () => {
    vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);

    render(<App />);

    expect(screen.getByText('Querying telemetry data...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Total Servers')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('gsy-fin-prod-01')).toBeInTheDocument();
    expect(screen.getByText('gsy-hr-vm-02')).toBeInTheDocument();
  });

  it('filters table rows fluidly when typing inside the OS search input box', async () => {
    vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    const osInput = screen.getByPlaceholderText('Search servers by OS...');
    fireEvent.change(osInput, { target: { value: 'Ubuntu' } });

    expect(screen.getByText('gsy-hr-vm-02')).toBeInTheDocument();
    expect(screen.queryByText('gsy-fin-prod-01')).not.toBeInTheDocument();
  });
});
