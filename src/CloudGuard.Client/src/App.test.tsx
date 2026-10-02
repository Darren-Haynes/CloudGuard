import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from './App';
import { fetchServerAssets, fetchSecurityAuditTrail } from './services/api';
import type { ServerAsset } from './types';

vi.mock('./services/api', () => ({
  fetchServerAssets: vi.fn(),
  fetchSecurityAuditTrail: vi.fn(),
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
      serverName: 'gsy-hr-vm-02',
      operatingSystem: 'Ubuntu 22.04 LTS',
      missingPatches: 4,
      securityStatus: 'Vulnerable',
      lastAuditedAt: new Date().toISOString(),
      buildingName: 'Building 1',
      serverRoom: 'Room 02',
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 💡 Reset clock state explicitly after EVERY single test case to prevent resource leakage!
  afterEach(() => {
    vi.useRealTimers();
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

    // 1. Render under standard real-world clocks first so async fetches resolve naturally
    render(<App />);

    // 2. Wait for the initial loading boundary to clear out completely
    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    // 3. Now safely introduce fake timers to handle the useDebounce delay
    vi.useFakeTimers();

    // 4. Locate the input field which is now fully mounted on screen
    const osInput = screen.getByPlaceholderText('Search servers by OS...');
    fireEvent.change(osInput, { target: { value: 'Ubuntu' } });

    // 5. Fast-forward exactly 300ms inside act to flush out the search debounce hook latency!
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // 6. Assert row filtering correctness
    expect(screen.getByText('gsy-hr-vm-02')).toBeInTheDocument();
    expect(screen.queryByText('gsy-fin-prod-01')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('gracefully handles telemetry fetching exceptions and renders a red alert card', async () => {
    vi.mocked(fetchServerAssets).mockRejectedValue(new Error('Network conflict or gateway timeout.'));

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Error loading telemetry:')).toBeInTheDocument();
    expect(screen.getByText('Network conflict or gateway timeout.')).toBeInTheDocument();
  });

  it('swaps the fleet grid for the audit ledger and snaps back via sidebar scope selection', async () => {
    vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);
    vi.mocked(fetchSecurityAuditTrail).mockResolvedValue([
      {
        id: 'a1',
        username: 'darren-sre-lead',
        userRole: 'SecOps-Admin-Tier3',
        action: 'POST',
        endpointPath: '/api/asset/abc/remediate',
        payloadData: '',
        isSuccess: true,
        timestamp: '2026-01-15T10:30:00Z',
      },
    ]);

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sidebar-audit-ledger'));

    await waitFor(() => {
      expect(screen.getByText('darren-sre-lead')).toBeInTheDocument();
    });
    expect(screen.getByText('SecOps-Admin-Tier3')).toBeInTheDocument();
    expect(screen.getByText('/api/asset/abc/remediate')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('2026-01-15 10:30:00 UTC')).toBeInTheDocument();
    expect(screen.queryByText('gsy-fin-prod-01')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/View Entire Fleet/i));

    expect(screen.getByText('gsy-fin-prod-01')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-ledger')).not.toBeInTheDocument();
  });

  it('swaps the fleet grid for cluster analytics and snaps back via sidebar scope selection', async () => {
    vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sidebar-cluster-analytics'));

    expect(screen.getByTestId('cluster-analytics')).toBeInTheDocument();
    expect(screen.getByText('Compliance Posture')).toBeInTheDocument();
    expect(screen.getByText('Building Hardware Allocation')).toBeInTheDocument();
    expect(screen.queryByText('gsy-fin-prod-01')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/View Entire Fleet/i));

    expect(screen.queryByTestId('cluster-analytics')).not.toBeInTheDocument();
    expect(screen.getByText('gsy-fin-prod-01')).toBeInTheDocument();
  });

  it('clears active polling timers and updates mounting flags on component unmount', async () => {
    vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    vi.useFakeTimers();

    act(() => {
      unmount();
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('gracefully handles audit ledger network failures and displays error boundary text layouts', async () => {
    // 🔥 ENVIRONMENT DEEP CLEAN: Restore native clocks and fix browser scope leakage!
    vi.useRealTimers();
    if (typeof window.clearInterval === 'undefined') {
      (window as any).clearInterval = () => {};
    }

    vi.mocked(fetchSecurityAuditTrail).mockRejectedValueOnce(new Error('Audit logging subsystem database connection timed out.'));

    render(<App />);

    // Click the ledger view button in the sidebar nav tree
    const auditBtn = screen.getByText(/System Audit Ledger/i);
    fireEvent.click(auditBtn);

    // Verify that the fallback error intercept string accurately mounts onto the screen canvas
    await waitFor(() => {
      expect(screen.getByText(/Audit logging subsystem database connection timed out./i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('swaps the fleet grid for the infographic analytics page and snaps back cleanly on scope reset', async () => {
    // 🔥 ENVIRONMENT Safety Lock to prevent timer leaks
    vi.useRealTimers();
    if (typeof window.clearInterval === 'undefined') {
      (window as any).clearInterval = () => {};
    }

    render(<App />);

    // Locate and click the new Cluster Analytics link button inside the sidebar
    const analyticsBtn = screen.getByText(/Cluster Analytics/i);
    expect(analyticsBtn).toBeInTheDocument();
    fireEvent.click(analyticsBtn);

    // Verify that the fleet asset table disappears and the analytics page content renders
    await waitFor(() => {
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    // Reset view by clicking the master fleet button
    const fleetBtn = screen.getByText(/View Entire Fleet/i);
    fireEvent.click(fleetBtn);

    // Verify that the server asset grid mounts cleanly back onto the screen layout
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});
