import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerDetail } from './ServerDetail';
import { fetchServerAssetById } from '../services/api';
import type { ServerAsset } from '../types';

// Mock our API module layer cleanly
vi.mock('../services/api', () => ({
  fetchServerAssetById: vi.fn(),
}));

describe('ServerDetail Component Suite', () => {
  const mockOnBackSpy = vi.fn();

  const mockSingleAsset: ServerAsset = {
    id: 'deep-guid-001',
    serverName: 'building1-rm01-001',
    operatingSystem: 'Ubuntu 22.04 LTS',
    missingPatches: 0,
    securityStatus: 'Compliant',
    lastAuditedAt: new Date().toISOString(),
    buildingName: 'Building 1',
    serverRoom: 'Room 01',
    cpuCoreCount: 16,
    installedRamGb: 64,
    ipAddress: '10.1.44.12',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    uptimeSeconds: 172800, // 2 days
    freeRamGb: 22.4,
    cpuAgeMonths: 12,
    ramAgeMonths: 12,
    diskAgeMonths: 40, // Trigger explicit replacement warning threshold
    avgCpuLoad24H: 45.2,
    avgCpuLoad1W: 38.1,
    avgCpuLoad1M: 35.5,
    avgRamLoad24H: 60.1,
    avgRamLoad1W: 55.4,
    avgRamLoad1M: 50.2,
    lastShellCommands: 'df -h\nsudo apt-get update'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries dynamic server telemetry and renders the hardware load panels cleanly', async () => {
    vi.mocked(fetchServerAssetById).mockResolvedValue(mockSingleAsset);

    render(<ServerDetail assetId="deep-guid-001" onBack={mockOnBackSpy} />);

    // Assert initial loading boundary exists
    expect(screen.getByText('Querying deep telemetry matrix...')).toBeInTheDocument();

    // Wait for the asynchronous network promise to fully resolve into the DOM grid
    await waitFor(() => {
      expect(screen.queryByText('Querying deep telemetry matrix...')).not.toBeInTheDocument();
    });

    // Assert high-level metadata elements
    expect(screen.getByText('🖥️ building1-rm01-001')).toBeInTheDocument();
    expect(screen.getByText(/16 Physical Cores/i)).toBeInTheDocument();
    expect(screen.getByText('10.1.44.12')).toBeInTheDocument();

    // Assert that our replacement alert string logic is executing accurately
    expect(screen.getByText(/Replace Immediately/i)).toBeInTheDocument();

    // Assert that our split terminal audit lines are rendering line items
    expect(screen.getByText('sudo apt-get update')).toBeInTheDocument();
  });

  it('triggers the structural parent onBack callback upon click interaction', async () => {
    vi.mocked(fetchServerAssetById).mockResolvedValue(mockSingleAsset);

    render(<ServerDetail assetId="deep-guid-001" onBack={mockOnBackSpy} />);

    await waitFor(() => {
      expect(screen.queryByText('Querying deep telemetry matrix...')).not.toBeInTheDocument();
    });

    const backButton = screen.getByText('⬅️ Back to Master Overview');
    fireEvent.click(backButton);

    // Verify callback loop tracks successfully
    expect(mockOnBackSpy).toHaveBeenCalledTimes(1);
  });

  it('gracefully intercept network link exceptions and renders an error recovery alert boundary', async () => {
    // 💡 Simulates an API network exception to trigger line 23 & 33 completely!
    vi.mocked(fetchServerAssetById).mockRejectedValue(new Error('Telemetry link timeout or perimeter offline.'));

    render(<ServerDetail assetId="deep-guid-broken" onBack={mockOnBackSpy} />);

    // Wait for the asynchronous rejection handling loop to flush state changes to the DOM
    await waitFor(() => {
      expect(screen.queryByText('Querying deep telemetry matrix...')).not.toBeInTheDocument();
    });

    // Assert that the exact network error text displays on screen cleanly
    expect(screen.getByText('Telemetry Link Error:')).toBeInTheDocument();
    expect(screen.getByText('Telemetry link timeout or perimeter offline.')).toBeInTheDocument();

    // Act: Ensure the emergency return button remains active inside the error viewport box
    const fallbackReturnBtn = screen.getByText('⬅️ Return to Fleet Dashboard');
    expect(fallbackReturnBtn).toBeInTheDocument();
    fireEvent.click(fallbackReturnBtn);

    expect(mockOnBackSpy).toHaveBeenCalledTimes(1);
  });
});
