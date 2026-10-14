// Test helpers for the Page Visibility API. jsdom reports a tab that is always visible, so
// tests that care about hidden tabs fake it with these.

// Pretends the tab became hidden or visible, and tells the page about it the way a browser does.
export function setTabVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

// Puts jsdom's own behaviour (a visible tab) back. Call it from afterEach.
export function resetTabVisibility(): void {
  Reflect.deleteProperty(document, 'visibilityState');
}
