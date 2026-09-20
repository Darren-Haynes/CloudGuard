import React, { useState, useEffect } from 'react';
import type { ServerAsset } from '../types';
import { fetchServerAssetById, remediateServerPatches } from '../services/api';

interface ServerDetailProps {
  assetId: string;
  theme: 'light' | 'dark';      // 👈 Add theme tracker prop
  onToggleTheme: () => void;    // 👈 Add toggle callback prop
  onBack: () => void;
}

export const ServerDetail: React.FC<ServerDetailProps> = ({ assetId, theme, onToggleTheme, onBack }) => {
  const [asset, setAsset] = useState<ServerAsset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isRemediating, setIsRemediating] = useState<boolean>(false);

  useEffect(() => {
    async function loadAsset() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchServerAssetById(assetId);
        setAsset(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to query telemetry.');
      } finally {
        setIsLoading(false);
      }
    }
    loadAsset();
  }, [assetId]);

  if (isLoading) return <p style={{ color: 'var(--text)', padding: '2rem' }}>Querying deep telemetry matrix...</p>;
  if (error || !asset) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#2d1a1a', border: '1px solid #7f1d1d', borderRadius: '0.375rem', color: '#f87171', marginBottom: '1rem' }}>
          <strong>Telemetry Link Error:</strong> {error || 'Hardware node missing.'}
        </div>
        <button onClick={onBack} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-h)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
          ⬅️ Return to Fleet Dashboard
        </button>
      </div>
    );
  }

  const getAgeStatus = (months: number) => {
    if (months >= 36) return { color: '#f87171', text: '⚠️ Replace Immediately (Lifecycle Expired)' };
    if (months >= 24) return { color: '#fbbf24', text: '🟡 Approaching Refresh Target' };
    return { color: '#34d399', text: '🟢 Health Nominal' };
  };

  const handleRemediation = async () => {
    try {
      setIsRemediating(true);
      const updatedAsset = await remediateServerPatches(assetId);
      setAsset(updatedAsset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute active patch remediation sequence.');
    } finally {
      setIsRemediating(false);
    }
  };

  return (
    <div style={{ padding: '2rem 1.5rem', width: '100%', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'system-ui, sans-serif' }}>

      {/* 🖨️ PRINT LAYOUT OPTIMIZATION STYLES */}
      <style>{`
        @media print {
          aside,
          .sd-print-hide {
            display: none !important;
          }

          .sd-print-expand {
            width: 100% !important;
            max-width: 100% !important;
            grid-template-columns: 1fr !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      {/* HEADER SECTION */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <button onClick={onBack} className="sd-print-hide" style={{ backgroundColor: 'transparent', color: 'var(--text)', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
            ⬅️ Back to Master Overview
          </button>
          <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-h)' }}>🖥️ {asset.serverName}</h2>
          <p style={{ color: 'var(--text)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            📍 {asset.buildingName} ➔ {asset.serverRoom} | OS: <code style={{ fontSize: '0.85rem' }}>{asset.operatingSystem}</code>
          </p>
        </div>

        {/* 🛠️ CONTEXTUAL DETAIL CONTROLS GROUP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'right' }}>

          {/* 📥 MULTI-FORMAT EXPORT AUDIT REPORT CONTROL */}
          <div className="sd-print-hide" style={{ position: 'relative' }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title="Export Server Report"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--card-bg, #1f2028)',
                color: 'var(--text-h, #f3f4f6)',
                border: '1px solid var(--border, #2e303a)',
                padding: '0.625rem 1rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 150ms ease',
              }}
            >
              📥 Export Server Report
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  minWidth: '240px',
                  backgroundColor: 'var(--card-bg, #1f2028)',
                  border: '1px solid var(--border, #2e303a)',
                  borderRadius: '0.375rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  zIndex: 50,
                  overflow: 'hidden',
                  textAlign: 'left',
                }}
              >
                <div
                  onClick={() => {
                    window.location.href = `http://localhost:5003/api/asset/${assetId}/export/text`;
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-h)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  📄 Download Plain Text (.txt)
                </div>
                <div
                  onClick={() => {
                    window.print();
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-h)',
                    cursor: 'pointer',
                  }}
                >
                  🖨️ Print Secure PDF (.pdf)
                </div>
              </div>
            )}
          </div>

          {/* INTERACTIVE COMPONENT THEME TOGGLE */}
          <button
            onClick={onToggleTheme}
            title="Toggle Application Theme"
            className="sd-print-hide"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--card-bg, #1f2028)',
              color: 'var(--text-h, #f3f4f6)',
              border: '1px solid var(--border, #2e303a)',
              padding: '0.625rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '1.1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'all 150ms ease',
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text)', textTransform: 'uppercase', fontWeight: 600 }}>Up-time Metrics</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399', marginTop: '0.25rem' }}>
              {Math.floor(asset.uptimeSeconds / 86400)}d {Math.floor((asset.uptimeSeconds % 86400) / 3600)}h active
            </div>
          </div>
        </div>
      </header>

      {/* 🛡️ PATCH POSTURE CONTEXTUAL ACTION BANNER */}
      {asset.securityStatus === 'Compliant' ? (
        <div
          className="sd-print-hide"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid #34d399',
            borderRadius: '0.5rem',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
          }}
        >
          <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.95rem' }}>
            🟢 Perimeter Guard Status: Fully Patched & Compliant. Node integrity verified.
          </span>
        </div>
      ) : (
        <div
          className="sd-print-hide"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid #fbbf24',
            borderRadius: '0.5rem',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.95rem' }}>
            🛡️ Outstanding Vulnerability Drift Detected ({asset.missingPatches} Patches Missing)
          </span>
          <button
            onClick={handleRemediation}
            disabled={isRemediating}
            style={{
              backgroundColor: '#fbbf24',
              color: '#1f2028',
              border: 'none',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              cursor: isRemediating ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              opacity: isRemediating ? 0.7 : 1,
              transition: 'all 150ms ease',
            }}
          >
            {isRemediating ? '⏳ Remediating…' : '⚡ Execute Active Patch Remediation'}
          </button>
        </div>
      )}

      {/* THREE-COLUMN LAYOUT */}
      <div className="sd-print-expand" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* ALLOCATION MATRIX */}
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-h)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>🏎️ Allocation Matrix</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div><span style={{ color: 'var(--text)' }}>CPU Allocation:</span> <strong style={{ color: 'var(--text-h)' }}>{asset.cpuCoreCount} Physical Cores</strong></div>
            <div><span style={{ color: 'var(--text)' }}>Installed Memory:</span> <strong style={{ color: 'var(--text-h)' }}>{asset.installedRamGb} GB DDR4</strong></div>
            <div><span style={{ color: 'var(--text)' }}>Available Memory:</span> <strong style={{ color: '#34d399' }}>{asset.freeRamGb} GB Free</strong></div>
            <div><span style={{ color: 'var(--text)' }}>Network IP Address:</span> <strong style={{ color: 'var(--text-h)' }}>{asset.ipAddress}</strong></div>
            <div><span style={{ color: 'var(--text)' }}>Hardware MAC Line:</span> <strong style={{ color: 'var(--text-h)', fontFamily: 'monospace' }}>{asset.macAddress}</strong></div>
          </div>
        </div>

        {/* COMPONENT WEAR */}
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-h)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>⏳ Component Asset Wear (Age)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)' }}>Processor Node:</span>
                <strong style={{ color: 'var(--text-h)' }}>{asset.cpuAgeMonths} Months Old</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: getAgeStatus(asset.cpuAgeMonths).color, marginTop: '0.15rem' }}>{getAgeStatus(asset.cpuAgeMonths).text}</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)' }}>RAM Containers:</span>
                <strong style={{ color: 'var(--text-h)' }}>{asset.ramAgeMonths} Months Old</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: getAgeStatus(asset.ramAgeMonths).color, marginTop: '0.15rem' }}>{getAgeStatus(asset.ramAgeMonths).text}</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text)' }}>Solid-State Disk:</span>
                <strong style={{ color: 'var(--text-h)' }}>{asset.diskAgeMonths} Months Old</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: getAgeStatus(asset.diskAgeMonths).color, marginTop: '0.15rem' }}>{getAgeStatus(asset.diskAgeMonths).text}</div>
            </div>
          </div>
        </div>

        {/* TIME-SERIES LOAD */}
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-h)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>📊 Rolling Compute Load Metrics</h3>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', color: 'var(--text-h)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                <th style={{ padding: '4px 0', fontSize: '0.75rem' }}>Duration</th>
                <th style={{ padding: '4px 0', fontSize: '0.75rem' }}>Avg CPU</th>
                <th style={{ padding: '4px 0', fontSize: '0.75rem' }}>Avg RAM</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 0', color: 'var(--text)' }}>24 Hours</td>
                <td>{asset.avgCpuLoad24H}%</td>
                <td>{asset.avgRamLoad24H}%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 0', color: 'var(--text)' }}>1 Week</td>
                <td>{asset.avgCpuLoad1W}%</td>
                <td>{asset.avgRamLoad1W}%</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: 'var(--text)' }}>1 Month</td>
                <td>{asset.avgCpuLoad1M}%</td>
                <td>{asset.avgRamLoad1M}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TERMINAL AUDIT MATRIX */}
      <div className="sd-print-expand" style={{ backgroundColor: '#0d1117', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1.5rem', fontFamily: 'var(--mono)', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #21262d', paddingBottom: '0.5rem' }}>
          <span style={{ color: '#58a6ff', fontWeight: 600, fontSize: '0.95rem' }}>🛡️ Security Audit Log Terminal Trail (Last 5 Commands)</span>
          <span style={{ color: '#8b949e', fontSize: '0.75rem' }}>Format: {asset.operatingSystem.startsWith('Windows') ? 'PowerShell Kernel' : 'Bash / POSIX Subshell'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#c9d1d9', lineHeight: '1.5' }}>
          {asset.lastShellCommands.split('\n').map((cmd, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ color: '#8b949e', userSelect: 'none' }}>[{idx + 1}] darren@{asset.serverName.split('-')[0]}:~$</span>
              <span style={{ color: '#f0883e' }}>{cmd}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
