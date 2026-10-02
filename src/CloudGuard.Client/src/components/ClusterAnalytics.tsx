import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { ServerAsset } from '../types';

interface ClusterAnalyticsProps {
  assets: ServerAsset[];
}

// Mirrors the --status-* design tokens defined in index.css
const STATUS_COLORS = {
  Compliant: '#34d399',
  Vulnerable: '#fbbf24',
  Critical: '#f87171',
} as const;

const BUILDINGS = ['Building 1', 'Building 2', 'Building 3', 'Building 4'];

const panelStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  padding: '1.25rem',
  boxShadow: 'var(--shadow)',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const headingStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text-h)',
  margin: '0 0 0.25rem 0',
};

const subheadingStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text)',
  margin: '0 0 1rem 0',
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  borderRadius: '0.375rem',
  color: 'var(--text-h)',
  fontSize: '0.8rem',
};

export const ClusterAnalytics: React.FC<ClusterAnalyticsProps> = ({ assets }) => {
  const complianceData = useMemo(
    () =>
      (['Compliant', 'Vulnerable', 'Critical'] as const).map((status) => ({
        name: status,
        value: assets.filter((a) => a.securityStatus === status).length,
        color: STATUS_COLORS[status],
      })),
    [assets]
  );

  const hardwareData = useMemo(
    () =>
      BUILDINGS.map((building) => {
        const inBuilding = assets.filter((a) => a.buildingName === building);
        const totalCores = inBuilding.reduce((sum, a) => sum + a.cpuCoreCount, 0);
        const totalRam = inBuilding.reduce((sum, a) => sum + a.installedRamGb, 0);
        return {
          building,
          avgCpuCores: inBuilding.length === 0 ? 0 : Number((totalCores / inBuilding.length).toFixed(1)),
          totalRamGb: totalRam,
        };
      }),
    [assets]
  );

  const hasData = assets.length > 0;

  return (
    <section data-testid="cluster-analytics">
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 1rem 0' }}>
        📊 Cluster Analytics
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div style={panelStyle} data-testid="analytics-compliance-panel">
          <h3 style={headingStyle}>Compliance Posture</h3>
          <p style={subheadingStyle}>Server count by security status ({assets.length} total)</p>
          <div style={{ width: '100%', height: 320 }}>
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complianceData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    stroke="var(--card-bg)"
                  >
                    {complianceData.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-h)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>No telemetry available yet.</p>
            )}
          </div>
        </div>

        <div style={panelStyle} data-testid="analytics-hardware-panel">
          <h3 style={headingStyle}>Building Hardware Allocation</h3>
          <p style={subheadingStyle}>Average CPU cores and total installed RAM per building</p>
          <div style={{ width: '100%', height: 320 }}>
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hardwareData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="building" stroke="var(--text)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--text)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: 'var(--text-h)' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Legend />
                  <Bar dataKey="avgCpuCores" name="Avg CPU Cores" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalRamGb" name="Total RAM (GB)" fill="#c084fc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>No telemetry available yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClusterAnalytics;
