import React, { useState } from 'react';
import type { ServerAsset } from '../types';

interface SidebarNavProps {
  assets: ServerAsset[];
  selectedBuilding: string | null;
  selectedRoom: string | null;
  onSelectScope: (building: string | null, room: string | null) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  assets,
  selectedBuilding,
  selectedRoom,
  onSelectScope,
}) => {
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({
    'Building 1': true,
  });

  const toggleBuilding = (building: string) => {
    setExpandedBuildings((prev) => ({ ...prev, [building]: !prev[building] }));
  };

  const infrastructureMap: Record<string, string[]> = {
    'Building 1': ['Room 01', 'Room 02', 'Room 03', 'Room 04', 'Room 05', 'Room 06', 'Room 07'],
    'Building 2': ['Room 01', 'Room 02', 'Room 03'],
    'Building 3': ['Room 01', 'Room 02'],
    'Building 4': ['Room 01', 'Room 02'], // 💡 Add Building 4 sandbox rooms!
  };

  const getStatusIndicator = (filteredAssets: ServerAsset[]) => {
    if (filteredAssets.length === 0) return null;
    const statuses = filteredAssets.map((a) => a.securityStatus);
    if (statuses.includes('Critical')) return <span style={{ color: '#f87171', marginLeft: 'auto' }}>🔴</span>;
    if (statuses.includes('Vulnerable')) return <span style={{ color: '#fbbf24', marginLeft: 'auto' }}>🟡</span>;
    return <span style={{ color: '#34d399', marginLeft: 'auto' }}>🟢</span>;
  };

  return (
    <aside
      style={{
        width: '280px',
        backgroundColor: 'var(--sidebar-bg, #16171d)',
        borderRight: '1px solid var(--border, #2e303a)',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: 'calc(100vh - 4rem)',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        transition: 'all 200ms ease'
      }}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text, #9ca3af)', textTransform: 'uppercase', paddingLeft: '0.5rem' }}>
        Infrastructure Scope
      </div>

      <button
        onClick={() => onSelectScope(null, null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '0.375rem',
          border: '1px solid var(--border, #2e303a)',
          backgroundColor: selectedBuilding === null ? 'var(--card-bg, #1f2028)' : 'transparent',
          color: selectedBuilding === null ? 'var(--text-h, #f3f4f6)' : 'var(--text, #9ca3af)',
          fontWeight: selectedBuilding === null ? 600 : 500,
          fontSize: '0.9rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 200ms ease',
        }}
      >
        <span>🌐 View Entire Fleet</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text, #9ca3af)', marginLeft: '0.5rem' }}>({assets.length})</span>
        {getStatusIndicator(assets)}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Object.entries(infrastructureMap).map(([building, rooms]) => {
          const buildingAssets = assets.filter((a) => a.buildingName === building);
          const isExpanded = !!expandedBuildings[building];

          return (
            <div key={building} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div
                // 👇 UNIQUE DATA ATTRIBUTE ASSIGNED FOR HIGH-PERFORMANCE PLAYWRIGHT GRAPHICS LOGGING
                data-testid={`sidebar-building-${building.replace(/\s+/g, '').toLowerCase()}`}
                onClick={() => {
                  // 🔥 CONTEXT CONTROL BUNDLE: Toggle accordion visuals AND filter table simultaneously!
                  toggleBuilding(building);
                  onSelectScope(building, null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.375rem',
                  color: selectedBuilding === building ? 'var(--text-h, #f3f4f6)' : 'var(--text, #9ca3af)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: selectedBuilding === building && selectedRoom === null ? 'var(--card-bg, #1f2028)' : 'transparent',
                  transition: 'all 200ms ease',
                }}
              >
                <span style={{ marginRight: '0.5rem', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease', display: 'inline-block', fontSize: '0.75rem' }}>
                  ▶
                </span>
                <span>🏢 {building}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text, #9ca3af)', marginLeft: '0.4rem' }}>({buildingAssets.length})</span>
                {getStatusIndicator(buildingAssets)}
              </div>

              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', paddingLeft: '1.75rem' }}>
                  {rooms.map((room) => {
                    const roomAssets = buildingAssets.filter((a) => a.serverRoom === room);
                    const isSelected = selectedBuilding === building && selectedRoom === room;

                    return (
                      <button
                        key={room}
                        onClick={(e) => {
                          // Stop bubble propagation to prevent firing parent building container click behaviors
                          e.stopPropagation();
                          onSelectScope(building, room);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.25rem',
                          border: 'none',
                          backgroundColor: isSelected ? 'var(--border, #2e303a)' : 'transparent',
                          color: isSelected ? 'var(--text-h, #f3f4f6)' : 'var(--text, #9ca3af)',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 200ms ease',
                        }}
                      >
                        <span>🔑 {room}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text, #9ca3af)', marginLeft: '0.35rem' }}>({roomAssets.length})</span>
                        {getStatusIndicator(roomAssets)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
