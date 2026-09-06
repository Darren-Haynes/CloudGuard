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

  // Advanced Sorting Logic with Secondary Alphabetical Tie-Breaker
  const sortedAssets = [...assets].sort((a, b) => {
    let comparison = 0;

    if (sortField === 'missingPatches') {
      comparison = a.missingPatches - b.missingPatches;
    } else {
      comparison = a[sortField].localeCompare(b[sortField]);
    }

    // Invert the result if sorting in descending order
    if (sortDirection === 'desc') {
      comparison *= -1;
    }

    // 💡 Secondary Tie-Breaker: If values are identical, sort alphabetically by server name
    if (comparison === 0) {
      return a.serverName.localeCompare(b.serverName);
    }

    return comparison;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // Shared sticky header column style block
  const thStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    backgroundColor: '#111827', // Crisp solid dark background blocks row text bleeding
    color: '#9ca3af',
    fontWeight: 600,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '2px solid #374151',
    zIndex: 10
  };

  return (
    <div
      style={{
        width: '100%',
        maxHeight: '600px',        // Locks page layout length perfectly
        overflowY: 'auto',         // Enables clean local inertia scrolling inside the box
        border: '1px solid #374151',
        borderRadius: '0.5rem',
        backgroundColor: '#1f2937', // Dark theme background pairing
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            <th onClick={() => handleSort('serverName')} style={thStyle}>
              Server Name{getSortIcon('serverName')}
            </th>
            <th onClick={() => handleSort('operatingSystem')} style={thStyle}>
              OS{getSortIcon('operatingSystem')}
            </th>
            <th onClick={() => handleSort('missingPatches')} style={thStyle}>
              Missing Patches{getSortIcon('missingPatches')}
            </th>
            <th style={{ ...thStyle, cursor: 'default' }}>Security Status</th>
            <th style={{ ...thStyle, cursor: 'default' }}>Last Audited</th>
          </tr>
        </thead>
        <tbody>
          {sortedAssets.map((asset) => (
            <tr
              key={asset.id}
              style={{
                borderBottom: '1px solid #374151',
                backgroundColor: '#1f2937',
                transition: 'background-color 150ms ease'
              }}
            >
              <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#f3f4f6' }}>
                {asset.serverName}
              </td>
              <td style={{ padding: '1rem 1.25rem', color: '#d1d5db' }}>
                {asset.operatingSystem}
              </td>
              <td style={{ padding: '1rem 1.25rem', color: '#d1d5db' }}>
                {asset.missingPatches}
              </td>
              <td style={{ padding: '1rem 1.25rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: asset.securityStatus === 'Critical' ? '#2d1a1a' : asset.securityStatus === 'Vulnerable' ? '#2e251a' : '#1a2e22',
                    color: asset.securityStatus === 'Critical' ? '#f87171' : asset.securityStatus === 'Vulnerable' ? '#fbbf24' : '#34d399',
                    border: `1px solid ${asset.securityStatus === 'Critical' ? '#7f1d1d' : asset.securityStatus === 'Vulnerable' ? '#78350f' : '#064e3b'}`
                  }}
                >
                  {asset.securityStatus}
                </span>
              </td>
              <td style={{ padding: '1rem 1.25rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                {new Date(asset.lastAuditedAt).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
