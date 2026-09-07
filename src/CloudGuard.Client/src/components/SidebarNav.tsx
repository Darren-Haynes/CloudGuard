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
  // Local state array tracking which building accordions are expanded/toggled open
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({
    'Building 1': true, // Keep Building 1 open by default for a populated landing state
  });

  const toggleBuilding = (building: string) => {
    setExpandedBuildings((prev) => ({ ...prev, [building]: !prev[building] }));
  };

  // Define our strict architectural infrastructure map baseline configuration
  const infrastructureMap: Record<string, string[]> = {
    'Building 1': ['Room 01', 'Room 02', 'Room 03', 'Room 04', 'Room 05', 'Room 06', 'Room 07'],
    'Building 2': ['Room 01', 'Room 02', 'Room 03'],
    'Building 3': ['Room 01', 'Room 02'],
  };

  // Helper function to extract security status flags and return the correct visual anchor
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
        backgroundColor: '#111827',
        borderRight: '1px solid #374151',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: 'calc(100vh - 4rem)',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', tracking: '0.05em', paddingLeft: '0.5rem' }}>
        Infrastructure Scope
      </div>

      {/* 🌐 VIEW ENTIRE FLEET ROOT LINK */}
      <button
        onClick={() => onSelectScope(null, null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '0.375rem',
          border: '1px solid #374151',
          backgroundColor: selectedBuilding === null ? '#1f2937' : 'transparent',
          color: selectedBuilding === null ? '#ffffff' : '#9ca3af',
          fontWeight: selectedBuilding === null ? 600 : 500,
          fontSize: '0.9rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 150ms ease',
        }}
      >
        <span>🌐 View Entire Fleet</span>
        <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.5rem' }}>({assets.length})</span>
        {getStatusIndicator(assets)}
      </button>

      {/* 🏛️ ACCORDION LIST WRAPPER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Object.entries(infrastructureMap).map(([building, rooms]) => {
          const buildingAssets = assets.filter((a) => a.buildingName === building);
          const isExpanded = !!expandedBuildings[building];

          return (
            <div key={building} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {/* Building Trigger Header Line */}
              <div
                onClick={() => toggleBuilding(building)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.375rem',
                  color: selectedBuilding === building ? '#ffffff' : '#d1d5db',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: selectedBuilding === building && selectedRoom === null ? '#1f2937' : 'transparent',
                  transition: 'background-color 150ms ease',
                }}
              >
                <span style={{ marginRight: '0.5rem', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease', display: 'inline-block', fontSize: '0.75rem' }}>
                  ▶
                </span>
                <span>🏢 {building}</span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.4rem' }}>({buildingAssets.length})</span>
                {getStatusIndicator(buildingAssets)}
              </div>

              {/* Nested Rooms Submenu Items Block */}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', paddingLeft: '1.75rem' }}>
                  {rooms.map((room) => {
                    const roomAssets = buildingAssets.filter((a) => a.serverRoom === room);
                    const isSelected = selectedBuilding === building && selectedRoom === room;

                    return (
                      <button
                        key={room}
                        onClick={() => onSelectScope(building, room)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.25rem',
                          border: 'none',
                          backgroundColor: isSelected ? '#374151' : 'transparent',
                          color: isSelected ? '#ffffff' : '#9ca3af',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <span>🔑 {room}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.35rem' }}>({roomAssets.length})</span>
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
