import { useEffect, useRef } from 'react';

// Keeps data fresh without wasting requests.
//
// `load` runs once as soon as the component mounts, then again whenever its data is
// `intervalMs` old. It must resolve to true when the refresh worked and to false when it
// failed (a load that throws counts as failed). After a failure the next attempt comes after
// `retryMs` instead, so one bad response does not stay on screen for a whole interval.
//
// While the browser tab is hidden no timer is armed at all, so a forgotten background tab
// costs nothing. When the tab is shown again the next load happens at once if the data is
// already older than the interval, and at the original due time otherwise.
//
// Loads never overlap: the next one is only scheduled after the current one has finished.
// Changing `intervalMs` or `retryMs` restarts polling (including a fresh load), so pass
// constants.
export default function usePolling(
  load: () => Promise<boolean>,
  intervalMs: number,
  retryMs: number = intervalMs,
): void {
  // Always call the newest `load` without restarting the timer whenever the caller re-renders.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let isActive = true;
    let isRunning = false; // a load is in flight
    let dueAt = 0; // when the next load is due, as a Date.now() timestamp
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const isTabHidden = () => document.visibilityState === 'hidden';

    const clearTimer = () => {
      clearTimeout(timerId);
      timerId = undefined;
    };

    // Arms a timer for the moment the next load is due. A hidden tab gets none, and neither
    // does a load that is still running (it schedules the next one itself when it finishes).
    function scheduleNext() {
      clearTimer();
      if (!isActive || isRunning || isTabHidden()) return;
      timerId = setTimeout(runLoad, Math.max(0, dueAt - Date.now()));
    }

    async function runLoad() {
      isRunning = true;

      let succeeded = false;
      try {
        succeeded = await loadRef.current();
      } catch {
        // A load that throws is treated like one that reported failure.
      }

      isRunning = false;
      dueAt = Date.now() + (succeeded ? intervalMs : retryMs);
      scheduleNext();
    }

    const handleVisibilityChange = () => {
      if (isTabHidden()) clearTimer();
      else scheduleNext();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void runLoad();

    return () => {
      isActive = false;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, retryMs]);
}
