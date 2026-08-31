import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterBar } from './FilterBar';

describe('FilterBar Component', () => {
  it('correctly mounts controlled inputs and triggers state modification callbacks', () => {
    // 1. Arrange: Build strict mock tracking spies using Vitest's 'vi' utility
    const onSearchChangeSpy = vi.fn();
    const onOsChangeSpy = vi.fn();
    const onStatusChangeSpy = vi.fn();

    // 2. Act: Mount the controlled component into our virtual browser DOM
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

    // 3. Assert: Validate that our active states are bound to input values correctly
    const searchInput = screen.getByPlaceholderText('Search servers by name...') as HTMLInputElement;
    expect(searchInput.value).toBe('gsy-fin');

    const statusDropdown = screen.getByRole('combobox') as HTMLSelectElement;
    expect(statusDropdown.value).toBe('Critical');

    // 4. Act: Simulate an administrator typing a fresh character into the Server Name search field
    fireEvent.change(searchInput, { target: { value: 'gsy-fin-prod' } });

    // Assert: Verify the primary handler captured the text modification correctly
    expect(onSearchChangeSpy).toHaveBeenCalledWith('gsy-fin-prod');

    // 5. Act: Simulate an administrator typing a fresh character into the OS search field
    const osInput = screen.getByPlaceholderText('Search servers by OS...') as HTMLInputElement;
    fireEvent.change(osInput, { target: { value: 'w' } });

    // Assert: Verify the callback handler intercepted the OS mutation token correctly
    expect(onOsChangeSpy).toHaveBeenCalledWith('w');

    // 6. Act: Simulate an administrator changing the dropdown selection to 'Compliant'
    fireEvent.change(statusDropdown, { target: { value: 'Compliant' } });

    // Assert: Verify the status handler captured the selection modification token correctly
    expect(onStatusChangeSpy).toHaveBeenCalledWith('Compliant');
  });
});
