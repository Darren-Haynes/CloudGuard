import React from 'react';
import type { ServerAsset } from '../types';

interface MetricCardsProps {
  assets: ServerAsset[];
}

export const MetricCards: React.FC<MetricCardsProps> = ({ assets }) => {
  const totalServers = assets.length;
  const criticalAlerts = assets.filter((a) => a.securityStatus === 'Critical').length;
  const totalMissingPatches = assets.reduce((sum, a) => sum + a.missingPatches, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>

      {/* CARD 1: TOTAL SERVERS */}
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '0.5rem', boxShadow: 'var(--shadow)', transition: 'all 200ms ease' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          Total Servers
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-h)' }}>
          {totalServers}
        </div>
      </div>

      {/* CARD 2: CRITICAL ALERTS */}
      <div style={{
        backgroundColor: criticalAlerts > 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--card-bg)',
        border: criticalAlerts > 0 ? '1px solid #7f1d1d' : '1px solid var(--border)',
        padding: '1.25rem',
        borderRadius: '0.5rem',
        boxShadow: 'var(--shadow)',
        transition: 'all 200ms ease'
      }}>
        <div style={{ fontSize: '0.8rem', color: criticalAlerts > 0 ? '#f87171' : 'var(--text)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          Critical Alerts
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: criticalAlerts > 0 ? '#f87171' : 'var(--text-h)' }}>
          {criticalAlerts}
        </div>
      </div>

      {/* CARD 3: MISSING PATCHES */}
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '0.5rem', boxShadow: 'var(--shadow)', transition: 'all 200ms ease' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          Missing Patches
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', color: totalMissingPatches > 0 ? '#60a5fa' : 'var(--text-h)' }}>
          {totalMissingPatches}
        </div>
      </div>

    </div>
  );
};
