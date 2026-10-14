import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLedger } from './AuditLedger';
import { fetchSecurityAuditTrail } from '../services/api';
import { AUDIT_POLL_INTERVAL_MS } from '../config';
import { resetTabVisibility, setTabVisibility } from '../test/tabVisibility';
import type { AuditLogEntry } from '../types';

vi.mock('../services/api', () => ({
  fetchSecurityAuditTrail: vi.fn(),
}));

const entry = (id: string, overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id,
  username: 'anonymous-operator',
  userRole: 'Guest-Clearance',
  action: 'GET',
  endpointPath: '/api/asset',
  payloadData: '',
  isSuccess: true,
  timestamp: '2026-01-15T10:30:00Z',
  ...overrides,
});

// Lets pending promises settle without moving the fake clock.
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe('AuditLedger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(fetchSecurityAuditTrail).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetTabVisibility();
  });

  it('shows a loading message, then the entries newest first', async () => {
    vi.mocked(fetchSecurityAuditTrail).mockResolvedValue([
      entry('old', { endpointPath: '/api/asset/older', timestamp: '2026-01-15T09:00:00Z' }),
      entry('new', { endpointPath: '/api/asset/newer', timestamp: '2026-01-15T11:00:00Z' }),
    ]);

    render(<AuditLedger />);
    expect(screen.getByText('Querying audit ledger...')).toBeInTheDocument();

    await flush();

    expect(screen.queryByText('Querying audit ledger...')).not.toBeInTheDocument();
    const rows = screen.getAllByTestId('audit-ledger-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('/api/asset/newer');
    expect(rows[1]).toHaveTextContent('/api/asset/older');
  });

  it('shows an empty-ledger message when nothing has been recorded', async () => {
    vi.mocked(fetchSecurityAuditTrail).mockResolvedValue([]);

    render(<AuditLedger />);
    await flush();

    expect(screen.getByText('No security events have been recorded yet.')).toBeInTheDocument();
  });

  it('says it refreshes automatically instead of claiming to be live', async () => {
    vi.mocked(fetchSecurityAuditTrail).mockResolvedValue([entry('a')]);

    render(<AuditLedger />);
    await flush();

    expect(screen.getByText(/1 event · refreshes automatically/)).toBeInTheDocument();
    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  });

  it('pluralises the event count', async () => {
    vi.mocked(fetchSecurityAuditTrail).mockResolvedValue([entry('a'), entry('b')]);

    render(<AuditLedger />);
    await flush();

    expect(screen.getByText(/2 events · refreshes automatically/)).toBeInTheDocument();
  });

  it('fetches once when it opens, then again only once per refresh interval', async () => {
    vi.mocked(fetchSecurityAuditTrail).mockResolvedValue([entry('a')]);

    render(<AuditLedger />);
    await flush();
    expect(fetchSecurityAuditTrail).toHaveBeenCalledTimes(1);

    await advance(AUDIT_POLL_INTERVAL_MS - 1);
    expect(fetchSecurityAuditTrail).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(fetchSecurityAuditTrail).toHaveBeenCalledTimes(2);
  });

  it('picks up new entries on a refresh without showing the loading message again', async () => {
    vi.mocked(fetchSecurityAuditTrail)
      .mockResolvedValueOnce([entry('a')])
      .mockResolvedValue([entry('a'), entry('b', { endpointPath: '/api/asset/fresh' })]);

    render(<AuditLedger />);
    await flush();
    expect(screen.getAllByTestId('audit-ledger-row')).toHaveLength(1);

    await advance(AUDIT_POLL_INTERVAL_MS);

    expect(screen.getAllByTestId('audit-ledger-row')).toHaveLength(2);
    expect(screen.getByText('/api/asset/fresh')).toBeInTheDocument();
    expect(screen.queryByText('Querying audit ledger...')).not.toBeInTheDocument();
  });

  it('stops fetching while the tab is hidden and refreshes when it is shown again', async () => {
    vi.mocked(fetchSecurityAuditTrail).mockResolvedValue([entry('a')]);

    render(<AuditLedger />);
    await flush();

    act(() => setTabVisibility('hidden'));
    await advance(AUDIT_POLL_INTERVAL_MS * 10);
    expect(fetchSecurityAuditTrail).toHaveBeenCalledTimes(1);

    act(() => setTabVisibility('visible'));
    await flush();
    expect(fetchSecurityAuditTrail).toHaveBeenCalledTimes(2);
  });

  it('stops fetching once the ledger is closed', async () => {
    vi.mocked(fetchSecurityAuditTrail).mockResolvedValue([entry('a')]);

    const { unmount } = render(<AuditLedger />);
    await flush();

    unmount();
    await advance(AUDIT_POLL_INTERVAL_MS * 5);

    expect(fetchSecurityAuditTrail).toHaveBeenCalledTimes(1);
  });

  it('shows the error from a failed first load and recovers on the next refresh', async () => {
    vi.mocked(fetchSecurityAuditTrail)
      .mockRejectedValueOnce(new Error('Audit logging subsystem database connection timed out.'))
      .mockResolvedValue([entry('a', { endpointPath: '/api/asset/recovered' })]);

    render(<AuditLedger />);
    await flush();

    expect(screen.getByText('Error loading audit ledger:')).toBeInTheDocument();
    expect(screen.getByText(/Audit logging subsystem database connection timed out\./)).toBeInTheDocument();

    await advance(AUDIT_POLL_INTERVAL_MS);

    expect(screen.queryByText('Error loading audit ledger:')).not.toBeInTheDocument();
    expect(screen.getByText('/api/asset/recovered')).toBeInTheDocument();
  });

  it('keeps the entries already on screen when a later refresh fails', async () => {
    vi.mocked(fetchSecurityAuditTrail)
      .mockResolvedValueOnce([entry('a', { endpointPath: '/api/asset/kept' })])
      .mockRejectedValue(new Error('Gateway timeout.'));

    render(<AuditLedger />);
    await flush();

    await advance(AUDIT_POLL_INTERVAL_MS);

    expect(screen.getByText('Error loading audit ledger:')).toBeInTheDocument();
    expect(screen.getByText('/api/asset/kept')).toBeInTheDocument();
  });

  it('falls back to a generic message when the failure carries no message', async () => {
    vi.mocked(fetchSecurityAuditTrail).mockRejectedValue('boom');

    render(<AuditLedger />);
    await flush();

    expect(screen.getByText(/Failed to query immutable security audit ledger records\./)).toBeInTheDocument();
  });
});
