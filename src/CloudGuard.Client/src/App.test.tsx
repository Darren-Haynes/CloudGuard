import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from './App';
import { fetchServerAssets } from './services/api';
import type { ServerAsset } from './types';

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
      buildingName: 'Building 1',
      serverRoom: 'Room 01',
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
});
