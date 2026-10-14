import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from './App';
import { fetchServerAssets, fetchSecurityAuditTrail, fetchServerAssetById, remediateServerPatches } from './services/api';
import { ASSET_POLL_INTERVAL_MS, ERROR_RETRY_INTERVAL_MS } from './config';
import { resetTabVisibility, setTabVisibility } from './test/tabVisibility';
import type { ServerAsset } from './types';

vi.mock('./services/api', () => ({
  fetchServerAssets: vi.fn(),
  fetchSecurityAuditTrail: vi.fn(),
  fetchServerAssetById: vi.fn(),
  remediateServerPatches: vi.fn(),
}));

// For the tests that run on a fake clock: lets pending promises settle, or moves time forward.
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

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
    resetTabVisibility();
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

  it('stops refreshing the fleet once the app is unmounted', async () => {
    // The old version of this test spied on clearInterval, which the app no longer uses (the
    // spy was only ever satisfied by Testing Library's own timers). This checks the behaviour
    // instead: nothing is fetched after unmount, however long the clock runs.
    vi.useFakeTimers();
    vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);

    const { unmount } = render(<App />);
    await flush();
    expect(fetchServerAssets).toHaveBeenCalledTimes(1);

    unmount();
    await advance(ASSET_POLL_INTERVAL_MS * 2);

    expect(fetchServerAssets).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
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

  // These run on a fake clock and reset every mock they use, so they do not depend on what
  // the tests above left behind.
  describe('refreshing the fleet', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.mocked(fetchServerAssets).mockReset();
      vi.mocked(fetchServerAssetById).mockReset();
      vi.mocked(remediateServerPatches).mockReset();
      vi.mocked(fetchSecurityAuditTrail).mockReset();
    });

    it('fetches the fleet once on load, not every few seconds, and again after the refresh interval', async () => {
      vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);

      render(<App />);
      await flush();
      expect(fetchServerAssets).toHaveBeenCalledTimes(1);

      // The page used to ask again every 5 seconds.
      await advance(60 * 1000);
      expect(fetchServerAssets).toHaveBeenCalledTimes(1);

      await advance(ASSET_POLL_INTERVAL_MS - 60 * 1000 - 1);
      expect(fetchServerAssets).toHaveBeenCalledTimes(1);

      await advance(1);
      expect(fetchServerAssets).toHaveBeenCalledTimes(2);
    });

    it('stops asking while the tab is hidden and catches up when it is shown again', async () => {
      vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);

      render(<App />);
      await flush();

      act(() => setTabVisibility('hidden'));
      await advance(ASSET_POLL_INTERVAL_MS * 3);
      expect(fetchServerAssets).toHaveBeenCalledTimes(1);

      act(() => setTabVisibility('visible'));
      await flush();
      expect(fetchServerAssets).toHaveBeenCalledTimes(2);
    });

    it('does not ask again when the tab comes back while its data is still fresh', async () => {
      vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);
      const tenMinutes = 10 * 60 * 1000;

      render(<App />);
      await flush();

      await advance(tenMinutes);
      act(() => setTabVisibility('hidden'));
      await advance(tenMinutes);
      act(() => setTabVisibility('visible'));
      await flush();
      expect(fetchServerAssets).toHaveBeenCalledTimes(1);

      // Twenty minutes of the interval are used up; the rest is still to wait.
      await advance(ASSET_POLL_INTERVAL_MS - 2 * tenMinutes - 1);
      expect(fetchServerAssets).toHaveBeenCalledTimes(1);

      await advance(1);
      expect(fetchServerAssets).toHaveBeenCalledTimes(2);
    });

    it('retries a failed first load after the short retry delay instead of waiting a whole interval', async () => {
      vi.mocked(fetchServerAssets)
        .mockRejectedValueOnce(new Error('Network conflict or gateway timeout.'))
        .mockResolvedValue(mockAssets);

      render(<App />);
      await flush();
      expect(screen.getByText('Error loading telemetry:')).toBeInTheDocument();

      await advance(ERROR_RETRY_INTERVAL_MS - 1);
      expect(fetchServerAssets).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Error loading telemetry:')).toBeInTheDocument();

      await advance(1);
      expect(fetchServerAssets).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Error loading telemetry:')).not.toBeInTheDocument();
      expect(screen.getByText('gsy-fin-prod-01')).toBeInTheDocument();
    });

    it('keeps the error on screen while a retry is still in flight instead of flashing the dashboard', async () => {
      let resolveRetry: (assets: ServerAsset[]) => void = () => {};
      vi.mocked(fetchServerAssets)
        .mockRejectedValueOnce(new Error('Network conflict or gateway timeout.'))
        .mockImplementationOnce(
          () => new Promise<ServerAsset[]>((resolve) => {
            resolveRetry = resolve;
          })
        );

      render(<App />);
      await flush();
      await advance(ERROR_RETRY_INTERVAL_MS);

      expect(fetchServerAssets).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Error loading telemetry:')).toBeInTheDocument();
      expect(screen.queryByText('Total Servers')).not.toBeInTheDocument();

      await act(async () => {
        resolveRetry(mockAssets);
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.queryByText('Error loading telemetry:')).not.toBeInTheDocument();
      expect(screen.getByText('gsy-fin-prod-01')).toBeInTheDocument();
    });

    it('shows a remediation on the grid, the metric cards and the sidebar straight away, without fetching the fleet again', async () => {
      const remediatedAsset: ServerAsset = { ...mockAssets[1], missingPatches: 0, securityStatus: 'Compliant' };
      // The API keeps answering with the old fleet, so only the remediation itself can explain
      // the change on screen.
      vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);
      vi.mocked(fetchServerAssetById).mockResolvedValue(mockAssets[1]);
      vi.mocked(remediateServerPatches).mockResolvedValue(remediatedAsset);

      render(<App />);
      await flush();

      // The metric card is the first element labelled "Missing Patches" (the table header is the second).
      const missingPatchesValue = () => screen.getAllByText('Missing Patches')[0].nextElementSibling;
      expect(missingPatchesValue()).toHaveTextContent('4');
      expect(screen.getByTestId('sidebar-building-building1')).toHaveTextContent('🟡');

      fireEvent.click(screen.getByText('gsy-hr-vm-02'));
      await flush();
      fireEvent.click(screen.getByText('⚡ Execute Active Patch Remediation'));
      await flush();
      expect(remediateServerPatches).toHaveBeenCalledWith('2');
      fireEvent.click(screen.getByText('⬅️ Back to Master Overview'));

      const row = screen.getByText('gsy-hr-vm-02').closest('tr')!;
      expect(within(row).getByText('Compliant')).toBeInTheDocument();
      expect(within(row).queryByText('Vulnerable')).not.toBeInTheDocument();
      expect(missingPatchesValue()).toHaveTextContent('0');
      expect(screen.getByTestId('sidebar-building-building1')).toHaveTextContent('🟢');
      expect(fetchServerAssets).toHaveBeenCalledTimes(1);
    });
  });
});
