import React from 'react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  osQuery: string;
  onOsQueryChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  osQuery,
  onOsQueryChange,
  statusFilter,
  onStatusChange,
}) => {
  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    border: '1px solid var(--border, #2e303a)',
    backgroundColor: 'var(--card-bg, #1f2028)',
    color: 'var(--text-h, #f3f4f6)',
    fontSize: '0.9rem',
    outline: 'none',
    flex: 1,
    transition: 'all 200ms ease'
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
      <input
        type="text"
        placeholder="Search servers by name..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Search servers by OS..."
        value={osQuery}
        onChange={(e) => onOsQueryChange(e.target.value)}
        style={inputStyle}
      />
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{ ...inputStyle, flex: 'none', cursor: 'pointer' }}
      >
        <option value="">All Statuses</option>
        <option value="Compliant">Compliant</option>
        <option value="Vulnerable">Vulnerable</option>
        <option value="Critical">Critical</option>
      </select>
    </div>
  );
};
