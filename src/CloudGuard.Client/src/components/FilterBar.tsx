import React from 'react';

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.375rem',
  border: '1px solid #374151',
  backgroundColor: '#1f2937',
  color: '#f9fafb',
  fontSize: '0.9rem',
  outline: 'none',
};

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}) => {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
      <input
        type="text"
        placeholder="Search servers by name..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          ...inputStyle,
          flex: 1,
        }}
      />
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{
          ...inputStyle,
          cursor: 'pointer',
        }}
      >
        <option value="">All Statuses</option>
        <option value="Compliant">Compliant</option>
        <option value="Vulnerable">Vulnerable</option>
        <option value="Critical">Critical</option>
      </select>
    </div>
  );
};
