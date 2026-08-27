import React from 'react';
import type { ServerAsset } from '../types';

export interface MetricCardsProps {
  assets: ServerAsset[];
}

export const MetricCards: React.FC<MetricCardsProps> = ({ assets }) => {
  const totalServers = assets.length;
  const criticalAlerts = assets.filter((asset) => asset.securityStatus === 'Critical').length;
  const totalPatches = assets.reduce((sum, asset) => sum + asset.missingPatches, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
      <div
        style={{
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          padding: '1.25rem',
          borderRadius: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase' }}>Total Servers</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#ffffff' }}>{totalServers}</div>
      </div>

      <div
        style={{
          backgroundColor: '#2d1a1a',
          border: '1px solid #374151',
          padding: '1.25rem',
          borderRadius: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase' }}>Critical Alerts</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#f87171' }}>{criticalAlerts}</div>
      </div>

      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #374151',
          padding: '1.25rem',
          borderRadius: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase' }}>Missing Patches</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: '#60a5fa' }}>{totalPatches}</div>
      </div>
    </div>
  );
};

export default MetricCards;
