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

  // 👇 ADDED TO COVER LINES 31-32 (API ERROR HANDLING PATH)
  it('gracefully handles telemetry fetching exceptions and renders a red alert card', async () => {
    vi.mocked(fetchServerAssets).mockRejectedValue(new Error('Network conflict or gateway timeout.'));

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Error loading telemetry:')).toBeInTheDocument();
    expect(screen.getByText('Network conflict or gateway timeout.')).toBeInTheDocument();
  });

  // 👇 HIGHLY OPTIMIZED UNMOUNT INTERCEPTOR FOR LINE 50
  it('clears active polling timers and updates mounting flags on component unmount', async () => {
    vi.mocked(fetchServerAssets).mockResolvedValue(mockAssets);
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    // 1. Render under standard real-time clocks
    const { unmount } = render(<App />);

    // 2. Wait for async layout mounting to clear out naturally
    await waitFor(() => {
      expect(screen.queryByText('Querying telemetry data...')).not.toBeInTheDocument();
    });

    // 3. Swap in fake timers safely now that async layout tasks are done
    vi.useFakeTimers();

    // 4. Force the dashboard to tear down, executing your line 50 cleanup hook!
    unmount();

    // 5. Advance timers to thoroughly flush out any pending intervals
    await vi.advanceTimersByTimeAsync(5000);

    // 6. Assert the cleanup routine accurately intercepted the teardown event
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
    vi.useRealTimers(); // Restore real-world baseline clocks cleanly
  });
});
