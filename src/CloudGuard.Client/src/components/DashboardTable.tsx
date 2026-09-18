import React, { useState } from 'react';
import type { ServerAsset } from '../types';

interface DashboardTableProps {
  assets: ServerAsset[];
}

type SortField = 'serverName' | 'operatingSystem' | 'missingPatches';
type SortDirection = 'asc' | 'desc';

export const DashboardTable: React.FC<DashboardTableProps> = ({ assets }) => {
  const [sortField, setSortField] = useState<SortField>('serverName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'missingPatches') {
      comparison = a.missingPatches - b.missingPatches;
    } else {
      comparison = a[sortField].localeCompare(b[sortField]);
    }
    if (sortDirection === 'desc') comparison *= -1;
    if (comparison === 0) return a.serverName.localeCompare(b.serverName);
    return comparison;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const thStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--sidebar-bg, #16171d)',
    color: 'var(--text, #9ca3af)',
    fontWeight: 600,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '2px solid var(--border, #2e303a)',
    zIndex: 10
  };

  return (
    <div
      style={{
        width: '100%',
        maxHeight: '600px',
        overflowY: 'auto',
        border: '1px solid var(--border, #2e303a)',
        borderRadius: '0.5rem',
        backgroundColor: 'var(--card-bg, #1f2028)',
        boxShadow: 'var(--shadow)'
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            <th onClick={() => handleSort('serverName')} style={thStyle}>Server Name{getSortIcon('serverName')}</th>
            <th onClick={() => handleSort('operatingSystem')} style={thStyle}>OS{getSortIcon('operatingSystem')}</th>
            <th onClick={() => handleSort('missingPatches')} style={thStyle}>Missing Patches{getSortIcon('missingPatches')}</th>
            <th style={{ ...thStyle, cursor: 'default' }}>Security Status</th>
            <th style={{ ...thStyle, cursor: 'default' }}>Last Audited</th>
          </tr>
        </thead>
        <tbody>
          {sortedAssets.map((asset) => (
            <tr key={asset.id} style={{ borderBottom: '1px solid var(--border, #2e303a)', backgroundColor: 'var(--card-bg, #1f2028)' }}>
              <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: 'var(--text-h, #f3f4f6)' }}>{asset.serverName}</td>
              <td style={{ padding: '1rem 1.25rem', color: 'var(--text, #9ca3af)' }}>{asset.operatingSystem}</td>
              <td style={{ padding: '1rem 1.25rem', color: 'var(--text, #9ca3af)' }}>{asset.missingPatches}</td>
              <td style={{ padding: '1rem 1.25rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: asset.securityStatus === 'Critical' ? 'var(--status-critical-bg)' : asset.securityStatus === 'Vulnerable' ? 'var(--status-vulnerable-bg)' : 'var(--status-compliant-bg)',
                  color: asset.securityStatus === 'Critical' ? '#f87171' : asset.securityStatus === 'Vulnerable' ? '#fbbf24' : '#34d399',
                  border: `1px solid ${asset.securityStatus === 'Critical' ? '#7f1d1d' : asset.securityStatus === 'Vulnerable' ? '#78350f' : '#064e3b'}`
                }}>
                  {asset.securityStatus}
                </span>
              </td>
              <td style={{ padding: '1rem 1.25rem', color: 'var(--text, #9ca3af)', fontSize: '0.85rem' }}>
                {new Date(asset.lastAuditedAt).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
