import React, { useState, useEffect } from 'react';
import type { ServerAsset } from './types';
import { DashboardTable } from './components/DashboardTable';
import { FilterBar } from './components/FilterBar';
import { MetricCards } from './components/MetricCards';
import { SidebarNav } from './components/SidebarNav';
import { fetchServerAssets } from './services/api';

export const App: React.FC = () => {
  const [assets, setAssets] = useState<ServerAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Controlled Filter Input States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [osQuery, setOsQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 👇 NEW ARCHITECTURAL SCOPING STATES
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAssets(isInitialLoad: boolean) {
      try {
        if (isInitialLoad) {
          setIsLoading(true);
        }
        setError(null);
        const data = await fetchServerAssets();
        if (isMounted) {
          setAssets(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to connect to security telemetry service.'
          );
        }
      } finally {
        if (isMounted && isInitialLoad) {
          setIsLoading(false);
        }
      }
    }

    loadAssets(true);

    const intervalId = setInterval(() => {
      loadAssets(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleSelectScope = (building: string | null, room: string | null) => {
    setSelectedBuilding(building);
    setSelectedRoom(room);
  };

  // 1. First Tier Filter: Scope entire asset array by active Sidebar Room
  const scopedAssets = assets.filter((asset) => {
    const matchesBuilding = selectedBuilding === null || asset.buildingName === selectedBuilding;
    const matchesRoom = selectedRoom === null || asset.serverRoom === selectedRoom;
    return matchesBuilding && matchesRoom;
  });

  // 2. Second Tier Filter: Apply Controlled Input Box text searches onto the scoped subset
  const filteredAssets = scopedAssets.filter((asset) => {
    const matchesSearch = asset.serverName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOs = asset.operatingSystem.toLowerCase().includes(osQuery.toLowerCase());
    const matchesStatus = statusFilter === '' || asset.securityStatus === statusFilter;
    return matchesSearch && matchesOs && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#111827' }}>

      {/* 🧭 LEFT SIDEBAR PANEL COMPONENT CONTAINER */}
      <SidebarNav
        assets={assets}
        selectedBuilding={selectedBuilding}
        selectedRoom={selectedRoom}
        onSelectScope={handleSelectScope}
      />

      {/* 🖥️ MAIN CONTENT BODY ACCORDION VIEWPORT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            maxWidth: '1200px',
            width: '92%',
            margin: '0 auto',
            padding: '2rem 1.5rem',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <header style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f9fafb', margin: '0 0 0.5rem 0' }}>
              CloudGuard Infrastructure Dashboard
            </h1>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.95rem' }}>
              Active Environment: {selectedBuilding === null ? 'All Buildings' : selectedBuilding}
              {selectedRoom !== null && ` ➔ ${selectedRoom}`}
            </p>
          </header>

          <main>
            {isLoading ? (
              <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>Querying telemetry data...</p>
            ) : error !== null ? (
              <div style={{ padding: '1rem 1.25rem', backgroundColor: '#2d1a1a', border: '1px solid #7f1d1d', borderRadius: '0.375rem', color: '#f87171', fontSize: '0.95rem' }}>
                <strong>Error loading telemetry:</strong> {error}
              </div>
            ) : (
              <>
                {/* Metric Cards dynamically aggregate the SCOPED asset array on the fly! */}
                <MetricCards assets={scopedAssets} />

                <FilterBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  osQuery={osQuery}
                  onOsQueryChange={setOsQuery}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                />

                <DashboardTable assets={filteredAssets} />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
