import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerDetail } from './ServerDetail';
import { fetchServerAssetById, remediateServerPatches } from '../services/api';
import type { ServerAsset } from '../types';

// Mock our API module layer cleanly
vi.mock('../services/api', () => ({
  fetchServerAssetById: vi.fn(),
  remediateServerPatches: vi.fn(),
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

    // Assert the deep telemetry text grid lines have fully mounted on screen
    expect(screen.getByText('64 GB DDR4')).toBeInTheDocument();
    expect(screen.getByText('AA:BB:CC:DD:EE:FF')).toBeInTheDocument();
    expect(screen.getByText('45.2%')).toBeInTheDocument();
    expect(screen.getByText('60.1%')).toBeInTheDocument();

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

  it('opens the export dropdown and correctly triggers the plain text download and PDF print handlers', async () => {
    vi.mocked(fetchServerAssetById).mockResolvedValue(mockSingleAsset);

    // Stub the native browser print engine so window.print() doesn't throw in jsdom
    const printSpy = vi.fn();
    vi.stubGlobal('print', printSpy);

    // Stub window.location.href assignment so navigation doesn't error out in jsdom
    const originalLocation = window.location;
    // @ts-expect-error -- intentionally deleting to allow a mock replacement
    delete window.location;
    window.location = { ...originalLocation, href: '' } as Location;

    render(<ServerDetail assetId="deep-guid-001" onBack={mockOnBackSpy} />);

    await waitFor(() => {
      expect(screen.queryByText('Querying deep telemetry matrix...')).not.toBeInTheDocument();
    });

    // The dropdown menu options should not be present until the export button is clicked
    expect(screen.queryByText('📄 Download Plain Text (.txt)')).not.toBeInTheDocument();
    expect(screen.queryByText('🖨️ Print Secure PDF (.pdf)')).not.toBeInTheDocument();

    const exportButton = screen.getByTitle('Export Server Report');
    fireEvent.click(exportButton);

    // Dropdown menu options should now be visible
    const downloadTextOption = screen.getByText('📄 Download Plain Text (.txt)');
    const printPdfOption = screen.getByText('🖨️ Print Secure PDF (.pdf)');
    expect(downloadTextOption).toBeInTheDocument();
    expect(printPdfOption).toBeInTheDocument();

    // Trigger the plain text export handler and confirm the streaming endpoint URL is hit
    fireEvent.click(downloadTextOption);
    expect(window.location.href).toBe('http://localhost:5003/api/asset/deep-guid-001/export/text');

    // Re-open the dropdown and trigger the native print engine handler
    fireEvent.click(exportButton);
    fireEvent.click(screen.getByText('🖨️ Print Secure PDF (.pdf)'));
    expect(printSpy).toHaveBeenCalledTimes(1);

    // Restore the native window.location object to avoid leaking state into other test files
    window.location = originalLocation;
  });

  it('executes the live patch remediation sequence and updates the state posture metrics cleanly', async () => {
    const mockVulnerableAsset: ServerAsset = {
      ...mockSingleAsset,
      missingPatches: 5,
      securityStatus: 'Vulnerable',
    };

    const mockRemediatedAsset: ServerAsset = {
      ...mockSingleAsset,
      missingPatches: 0,
      securityStatus: 'Compliant',
    };

    vi.mocked(fetchServerAssetById).mockResolvedValue(mockVulnerableAsset);
    vi.mocked(remediateServerPatches).mockResolvedValue(mockRemediatedAsset);

    render(<ServerDetail assetId="deep-guid-001" onBack={mockOnBackSpy} />);

    await waitFor(() => {
      expect(screen.queryByText('Querying deep telemetry matrix...')).not.toBeInTheDocument();
    });

    // Assert the vulnerable posture banner and remediation button are present
    expect(screen.getByText(/Outstanding Vulnerability Drift Detected \(5 Patches Missing\)/i)).toBeInTheDocument();
    const remediateButton = screen.getByText('⚡ Execute Active Patch Remediation');

    fireEvent.click(remediateButton);

    // Confirm the mutation API was invoked with the correct asset ID
    expect(remediateServerPatches).toHaveBeenCalledWith('deep-guid-001');

    // Wait for the local asset state to flip to the remediated, fully-compliant payload
    await waitFor(() => {
      expect(screen.getByText(/Perimeter Guard Status: Fully Patched & Compliant/i)).toBeInTheDocument();
    });

    // The vulnerability drift banner and remediation button should no longer be rendered
    expect(screen.queryByText(/Outstanding Vulnerability Drift Detected/i)).not.toBeInTheDocument();
    expect(screen.queryByText('⚡ Execute Active Patch Remediation')).not.toBeInTheDocument();
  });

  it('gracefully handles patch remediation failures and renders error logs inside the network catch block', async () => {
    // 💡 Simulates a network failure on remediation to execute line 61 completely!
    vi.mocked(fetchServerAssetById).mockResolvedValue({
      ...mockSingleAsset,
      missingPatches: 5,
      securityStatus: 'Vulnerable'
    });
    vi.mocked(remediateServerPatches).mockRejectedValue(new Error('Remediation deployment connection timed out.'));

    render(<ServerDetail assetId="deep-guid-001" theme="dark" onToggleTheme={vi.fn()} onBack={mockOnBackSpy} />);

    await waitFor(() => {
      expect(screen.queryByText('Querying deep telemetry matrix...')).not.toBeInTheDocument();
    });

    // Fire the remediation trigger event
    const remediateBtn = screen.getByText(/Execute Active Patch Remediation/i);
    fireEvent.click(remediateBtn);

    // Verify that the global or local telemetry catch error intercept maps to the DOM
    await waitFor(() => {
      expect(screen.getByText(/Remediation deployment connection timed out./i)).toBeInTheDocument();
    });
  });
});
