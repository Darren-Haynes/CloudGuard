import React, { useEffect, useState } from 'react';
import type { AuditLogEntry } from '../types';
import { fetchSecurityAuditTrail } from '../services/api';

const POLL_INTERVAL_MS = 5000;

const formatUtcTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')} UTC`;
};

const headerCellStyle: React.CSSProperties = {
  padding: '0.625rem 0.75rem',
  textAlign: 'left',
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

const cellStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.8rem',
  color: 'var(--text-h)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

export const AuditLedger: React.FC = () => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTrail(isInitialLoad: boolean) {
      try {
        const data = await fetchSecurityAuditTrail();
        if (!isMounted) return;
        setEntries(data);
        setError(null);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to query immutable security audit ledger records.');
        }
      } finally {
        if (isMounted && isInitialLoad) setIsLoading(false);
      }
    }

    loadTrail(true);
    const intervalId = setInterval(() => { loadTrail(false); }, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Newest events first
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <section data-testid="audit-ledger">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
          🛡️ System Audit Ledger
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
          {sortedEntries.length} {sortedEntries.length === 1 ? 'event' : 'events'} · live
        </span>
      </div>

      {error !== null && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem', backgroundColor: '#2d1a1a', border: '1px solid #7f1d1d', borderRadius: '0.375rem', color: '#f87171', fontSize: '0.875rem' }}>
          <strong>Error loading audit ledger:</strong> {error}
        </div>
      )}

      {isLoading ? (
        <p style={{ color: 'var(--text)', fontSize: '0.95rem' }}>Querying audit ledger...</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--card-bg)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Timestamp (UTC)</th>
                <th style={headerCellStyle}>Username</th>
                <th style={headerCellStyle}>Role</th>
                <th style={headerCellStyle}>Action</th>
                <th style={headerCellStyle}>Path</th>
                <th style={headerCellStyle}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...cellStyle, textAlign: 'center', color: 'var(--text)' }}>
                    No security events have been recorded yet.
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry) => (
                  <tr key={entry.id} data-testid="audit-ledger-row">
                    <td style={cellStyle}>{formatUtcTimestamp(entry.timestamp)}</td>
                    <td style={cellStyle}>{entry.username}</td>
                    <td style={cellStyle}>{entry.userRole}</td>
                    <td style={cellStyle}>{entry.action}</td>
                    <td style={cellStyle}>{entry.endpointPath}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: entry.isSuccess ? '#34d399' : '#f87171' }}>
                      {entry.isSuccess ? 'Success' : 'Failure'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AuditLedger;
