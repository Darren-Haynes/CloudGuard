import React, { useState, useEffect } from 'react';
import type { ServerAsset } from './types';
import { DashboardTable } from './components/DashboardTable';
import { FilterBar } from './components/FilterBar';
import { MetricCards } from './components/MetricCards';
import { SidebarNav } from './components/SidebarNav';
import { ServerDetail } from './components/ServerDetail';
import { fetchServerAssets } from './services/api';
import useDebounce from './hooks/useDebounce';

export const App: React.FC = () => {
  const [assets, setAssets] = useState<ServerAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Controlled Filter Input States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [osQuery, setOsQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Asynchronous Search Throttlers
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedOsQuery = useDebounce(osQuery, 300);

  // Structural Scope Navigation States
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Deep Dive Viewport State
  const [activeServerId, setActiveServerId] = useState<string | null>(null);

  // Active Accessibility Theme Tracker
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Synchronize theme configuration changes straight to the browser document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    let isMounted = true;

    async function loadAssets(isInitialLoad: boolean) {
      try {
        if (isInitialLoad) setIsLoading(true);
        setError(null);
        const data = await fetchServerAssets();
        if (isMounted) setAssets(data);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to connect to security telemetry service.');
        }
      } finally {
        if (isMounted && isInitialLoad) setIsLoading(false);
      }
    }

    loadAssets(true);
    const intervalId = setInterval(() => { loadAssets(false); }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleSelectScope = (building: string | null, room: string | null) => {
    setSelectedBuilding(building);
    setSelectedRoom(room);

    // 🔥 SNAP BACK TO DASHBOARD VIEWPORT: Resets the deep dive view instantly on sidebar click!
    setActiveServerId(null);
  };

  const scopedAssets = assets.filter((asset) => {
    const matchesBuilding = selectedBuilding === null || asset.buildingName === selectedBuilding;
    const matchesRoom = selectedRoom === null || asset.serverRoom === selectedRoom;
    return matchesBuilding && matchesRoom;
  });

  const filteredAssets = scopedAssets.filter((asset) => {
    const matchesSearch = asset.serverName.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    const matchesOs = asset.operatingSystem.toLowerCase().includes(debouncedOsQuery.toLowerCase());
    const matchesStatus = statusFilter === '' || asset.securityStatus === statusFilter;
    return matchesSearch && matchesOs && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', transition: 'all 200ms ease', width: '100%', boxSizing: 'border-box' }}>

      <SidebarNav
        assets={assets}
        selectedBuilding={selectedBuilding}
        selectedRoom={selectedRoom}
        onSelectScope={handleSelectScope}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '1200px', width: '92%', margin: '0 auto', padding: '2rem 1.5rem' }}>

          {/* CONTEXTUAL HEADER GATE */}
          {activeServerId === null && (
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 0.5rem 0', lineHeight: '1.2', letterSpacing: 'normal' }}>
                  CloudGuard Infrastructure Dashboard
                </h1>
                <p style={{ color: 'var(--text)', margin: 0, fontSize: '0.95rem' }}>
                  Active Environment: {selectedBuilding === null ? 'All Buildings' : selectedBuilding}
                  {selectedRoom !== null && ` ➔ ${selectedRoom}`}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <button
                  onClick={toggleTheme}
                  title="Toggle Application Theme"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-h)',
                    border: '1px solid var(--border)',
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

                <button
                  onClick={() => {
                    const baseUrl = 'http://localhost:5003/api/asset/export';
                    const params = new URLSearchParams();
                    if (selectedBuilding) params.append('building', selectedBuilding);
                    if (selectedRoom) params.append('room', selectedRoom);

                    const downloadUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
                    window.location.href = downloadUrl;
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.625rem 1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  📥 Download Audit Report
                </button>
              </div>
            </header>
          )}

          <main>
            {isLoading ? (
              <p style={{ color: 'var(--text)', fontSize: '0.95rem' }}>Querying telemetry data...</p>
            ) : error !== null ? (
              <div style={{ padding: '1rem 1.25rem', backgroundColor: '#2d1a1a', border: '1px solid #7f1d1d', borderRadius: '0.375rem', color: '#f87171', fontSize: '0.95rem' }}>
                <strong>Error loading telemetry:</strong> {error}
              </div>
            ) : activeServerId !== null ? (
              <ServerDetail
                assetId={activeServerId}
                theme={theme}
                onToggleTheme={toggleTheme}
                onBack={() => setActiveServerId(null)}
              />
            ) : (
              <>
                <MetricCards assets={scopedAssets} />

                <FilterBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  osQuery={osQuery}
                  onOsQueryChange={setOsQuery}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                />

                <DashboardTable assets={filteredAssets} onSelectServer={setActiveServerId} />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
