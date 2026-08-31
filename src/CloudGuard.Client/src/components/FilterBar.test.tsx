import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterBar } from './FilterBar';

describe('FilterBar Component', () => {
  it('correctly mounts controlled inputs and triggers state modification callbacks', () => {
    const onSearchChangeSpy = vi.fn();
    const onOsChangeSpy = vi.fn();
    const onStatusChangeSpy = vi.fn();

    render(
      <FilterBar
        searchQuery="gsy-fin"
        onSearchChange={onSearchChangeSpy}
        osQuery=""
        onOsQueryChange={onOsChangeSpy}
        statusFilter="Critical"
        onStatusChange={onStatusChangeSpy}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search servers by name...') as HTMLInputElement;
    expect(searchInput.value).toBe('gsy-fin');

    const statusDropdown = screen.getByRole('combobox') as HTMLSelectElement;
    expect(statusDropdown.value).toBe('Critical');

    const osInput = screen.getByPlaceholderText('Search servers by OS...') as HTMLInputElement;
    fireEvent.change(osInput, { target: { value: 'w' } });

    expect(onOsChangeSpy).toHaveBeenCalledWith('w');
  });
});
