import React from 'react';
import type { ServerAsset } from '../types';

interface DashboardTableProps {
  assets: ServerAsset[];
}

const getBadgeStyles = (status: ServerAsset['securityStatus']): {
  backgroundColor: string;
  color: string;
  borderColor: string;
  symbol: string;
} => {
  switch (status) {
    case 'Compliant':
      return {
        backgroundColor: '#e6f4ea',
        color: '#137333',
        borderColor: '#ceead6',
        symbol: '●',
      };
    case 'Vulnerable':
      return {
        backgroundColor: '#fef7e0',
        color: '#b06000',
        borderColor: '#feefc3',
        symbol: '▲',
      };
    case 'Critical':
      return {
        backgroundColor: '#fce8e6',
        color: '#c5221f',
        borderColor: '#fad2cf',
        symbol: '✖',
      };
  }
};

export const DashboardTable: React.FC<DashboardTableProps> = ({ assets }) => {
  return (
    <div style={{ width: '100%', overflowX: 'auto', margin: '1rem 0' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '0.9rem',
          textAlign: 'left',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#555' }}>Server Name</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#555' }}>OS</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#555' }}>Missing Patches</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#555' }}>Security Status</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#555' }}>Last Audited</th>
          </tr>
        </thead>
        <tbody>
          {assets.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                No server assets found.
              </td>
            </tr>
          ) : (
            assets.map((asset, index) => {
              const badge = getBadgeStyles(asset.securityStatus);
              const isEven = index % 2 === 0;

              return (
                <tr
                  key={asset.id}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: isEven ? '#ffffff' : '#fafafa',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#222' }}>
                    {asset.serverName}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>{asset.operatingSystem}</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>{asset.missingPatches}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: badge.backgroundColor,
                        color: badge.color,
                        border: `1px solid ${badge.borderColor}`,
                      }}
                    >
                      <span style={{ fontSize: '0.7rem' }}>{badge.symbol}</span>
                      {asset.securityStatus}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#666' }}>
                    {new Date(asset.lastAuditedAt).toLocaleString()}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
