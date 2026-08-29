import React, { useState, useEffect } from 'react';
import type { ServerAsset } from './types';
import { DashboardTable } from './components/DashboardTable';
import { FilterBar } from './components/FilterBar';
import { MetricCards } from './components/MetricCards';
import { fetchServerAssets } from './services/api';

export const App: React.FC = () => {
  const [assets, setAssets] = useState<ServerAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [osQuery, setOsQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

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

    // 1. Initial run sets isLoading to true
    loadAssets(true);

    // 2. Background polling bypasses isLoading entirely
    const intervalId = setInterval(() => {
      loadAssets(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.serverName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesOs = asset.operatingSystem
      .toLowerCase()
      .includes(osQuery.toLowerCase());
    const matchesStatus =
      statusFilter === '' || asset.securityStatus === statusFilter;
    return matchesSearch && matchesOs && matchesStatus;
  });

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#f9fafb', // Kept your white color fix for dark mode!
            margin: '0 0 0.5rem 0',
          }}
        >
          CloudGuard Infrastructure Dashboard
        </h1>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>
          Real-time security status and patch compliance across monitored servers.
        </p>
      </header>

      <main>
        {isLoading ? (
          <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>
            Querying telemetry data...
          </p>
        ) : error !== null ? (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.375rem',
              color: '#991b1b',
              fontSize: '0.95rem',
            }}
          >
            <strong>Error loading telemetry:</strong> {error}
          </div>
        ) : (
          <>
            <MetricCards assets={assets} />
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
  );
};

export default App;
