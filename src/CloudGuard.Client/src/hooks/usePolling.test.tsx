import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePolling from './usePolling';
import { resetTabVisibility, setTabVisibility } from '../test/tabVisibility';

const INTERVAL_MS = 1000;
const RETRY_MS = 100;

// Moves the fake clock forward and lets the promises that were waiting on it finish.
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

// A load that keeps running until the test decides how it ends.
function createPendingLoad() {
  let finish: (succeeded: boolean) => void = () => {};
  const load = vi.fn(
    () => new Promise<boolean>((resolve) => {
      finish = resolve;
    })
  );
  return { load, finish: (succeeded: boolean) => finish(succeeded) };
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetTabVisibility();
    vi.restoreAllMocks();
  });

  it('loads once as soon as it mounts', () => {
    const load = vi.fn().mockResolvedValue(true);

    renderHook(() => usePolling(load, INTERVAL_MS));

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads again every interval while the tab is visible, and not before', async () => {
    const load = vi.fn().mockResolvedValue(true);
    renderHook(() => usePolling(load, INTERVAL_MS));
    await advance(0);

    await advance(INTERVAL_MS - 1);
    expect(load).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(2);

    await advance(INTERVAL_MS - 1);
    expect(load).toHaveBeenCalledTimes(2);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('retries after the shorter retry delay when a load reports failure, then returns to the normal interval', async () => {
    const load = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    renderHook(() => usePolling(load, INTERVAL_MS, RETRY_MS));
    await advance(0);

    await advance(RETRY_MS - 1);
    expect(load).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(2);

    // The retry worked, so the next load is a full interval away.
    await advance(INTERVAL_MS - 1);
    expect(load).toHaveBeenCalledTimes(2);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('treats a load that throws as a failure and retries it', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValue(true);
    renderHook(() => usePolling(load, INTERVAL_MS, RETRY_MS));
    await advance(0);

    expect(load).toHaveBeenCalledTimes(1);

    await advance(RETRY_MS);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('waits a full interval after a failure when no retry delay is given', async () => {
    const load = vi.fn().mockResolvedValue(false);
    renderHook(() => usePolling(load, INTERVAL_MS));
    await advance(0);

    await advance(INTERVAL_MS - 1);
    expect(load).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('arms no timer and makes no requests while the tab is hidden', async () => {
    const load = vi.fn().mockResolvedValue(true);
    renderHook(() => usePolling(load, INTERVAL_MS));
    await advance(0);
    expect(vi.getTimerCount()).toBe(1);

    setTabVisibility('hidden');

    expect(vi.getTimerCount()).toBe(0);
    await advance(INTERVAL_MS * 10);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads at once when a tab comes back after its data went stale', async () => {
    const load = vi.fn().mockResolvedValue(true);
    renderHook(() => usePolling(load, INTERVAL_MS));
    await advance(0);

    setTabVisibility('hidden');
    await advance(INTERVAL_MS * 2.5);
    expect(load).toHaveBeenCalledTimes(1);

    setTabVisibility('visible');
    await advance(0);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('waits out the rest of the interval when a tab comes back while its data is still fresh', async () => {
    const load = vi.fn().mockResolvedValue(true);
    renderHook(() => usePolling(load, INTERVAL_MS));
    await advance(0);

    await advance(300);
    setTabVisibility('hidden');
    await advance(100);
    setTabVisibility('visible'); // 400 ms in: the next load is still 600 ms away

    await advance(0);
    expect(load).toHaveBeenCalledTimes(1);

    await advance(599);
    expect(load).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('still loads once when it mounts in a hidden tab, then waits for the tab to be shown', async () => {
    setTabVisibility('hidden');
    const load = vi.fn().mockResolvedValue(true);
    renderHook(() => usePolling(load, INTERVAL_MS));
    await advance(0);

    expect(load).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    await advance(500);
    setTabVisibility('visible'); // the data is 500 ms old, so 500 ms remain
    await advance(499);
    expect(load).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('never starts a second load while one is still running', async () => {
    const { load, finish } = createPendingLoad();
    renderHook(() => usePolling(load, INTERVAL_MS));
    expect(load).toHaveBeenCalledTimes(1);

    // Hiding and showing the tab mid-load must not arm a timer or start a second request.
    setTabVisibility('hidden');
    setTabVisibility('visible');
    expect(vi.getTimerCount()).toBe(0);
    await advance(INTERVAL_MS * 5);
    expect(load).toHaveBeenCalledTimes(1);

    // The interval is counted from when the load finished.
    finish(true);
    await advance(INTERVAL_MS - 1);
    expect(load).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('arms no timer when a load finishes after the tab was hidden, and resumes when it is shown', async () => {
    const { load, finish } = createPendingLoad();
    renderHook(() => usePolling(load, INTERVAL_MS));

    setTabVisibility('hidden');
    finish(true);
    await advance(0);

    expect(vi.getTimerCount()).toBe(0);
    await advance(INTERVAL_MS * 5);
    expect(load).toHaveBeenCalledTimes(1);

    // The data is now older than the interval, so showing the tab loads again straight away.
    setTabVisibility('visible');
    expect(vi.getTimerCount()).toBe(1);
    await advance(0);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('stops polling and clears its timer when it unmounts', async () => {
    const load = vi.fn().mockResolvedValue(true);
    const { unmount } = renderHook(() => usePolling(load, INTERVAL_MS));
    await advance(0);
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
    await advance(INTERVAL_MS * 5);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not schedule anything when a load finishes after it unmounted', async () => {
    const { load, finish } = createPendingLoad();
    const { unmount } = renderHook(() => usePolling(load, INTERVAL_MS));

    unmount();
    finish(true);
    await advance(0);

    expect(vi.getTimerCount()).toBe(0);
    await advance(INTERVAL_MS * 5);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('removes its visibility listener when it unmounts', () => {
    const addListener = vi.spyOn(document, 'addEventListener');
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => usePolling(vi.fn().mockResolvedValue(true), INTERVAL_MS));

    const added = addListener.mock.calls.find(([type]) => type === 'visibilitychange');
    expect(added).toBeDefined();

    unmount();

    expect(removeListener).toHaveBeenCalledWith('visibilitychange', added![1]);
  });

  it('calls the newest load function without restarting when the caller re-renders', async () => {
    const first = vi.fn().mockResolvedValue(true);
    const second = vi.fn().mockResolvedValue(true);
    const { rerender } = renderHook(({ load }) => usePolling(load, INTERVAL_MS), {
      initialProps: { load: first },
    });
    await advance(0);

    rerender({ load: second });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    await advance(INTERVAL_MS);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('starts over with a fresh load when the interval changes', async () => {
    const load = vi.fn().mockResolvedValue(true);
    const { rerender } = renderHook(({ intervalMs }) => usePolling(load, intervalMs), {
      initialProps: { intervalMs: INTERVAL_MS },
    });
    await advance(0);

    rerender({ intervalMs: 5000 });
    await advance(0);
    expect(load).toHaveBeenCalledTimes(2);

    // The old 1000 ms timer is gone: the next load is 5000 ms after the restart.
    await advance(4999);
    expect(load).toHaveBeenCalledTimes(2);

    await advance(1);
    expect(load).toHaveBeenCalledTimes(3);
  });
});
