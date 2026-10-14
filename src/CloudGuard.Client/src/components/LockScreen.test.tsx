import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockScreen } from './LockScreen';
import { login } from '../services/auth';

vi.mock('../services/auth', () => ({
  login: vi.fn(),
}));

describe('LockScreen', () => {
  const onUnlocked = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const typePassword = (value: string) =>
    fireEvent.change(screen.getByLabelText('Access password'), { target: { value } });

  it('shows a labelled password field and a disabled Unlock button until something is typed', () => {
    render(<LockScreen onUnlocked={onUnlocked} />);

    const input = screen.getByLabelText('Access password');
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeDisabled();

    typePassword('hunter2');
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeEnabled();
  });

  it('does not submit an empty password', () => {
    render(<LockScreen onUnlocked={onUnlocked} />);

    fireEvent.submit(screen.getByRole('button', { name: 'Unlock' }).closest('form')!);

    expect(login).not.toHaveBeenCalled();
  });

  it('logs in with the typed password and reports success', async () => {
    vi.mocked(login).mockResolvedValue(undefined);
    render(<LockScreen onUnlocked={onUnlocked} />);

    typePassword('hunter2');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith('hunter2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error and stays locked when the password is wrong', async () => {
    vi.mocked(login).mockRejectedValue(new Error('Incorrect password.'));
    render(<LockScreen onUnlocked={onUnlocked} />);

    typePassword('nope');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password.');
    expect(onUnlocked).not.toHaveBeenCalled();
    // The form is usable again for another try.
    expect(screen.getByLabelText('Access password')).toBeEnabled();
  });

  it('falls back to a generic message for a non-Error failure', async () => {
    vi.mocked(login).mockRejectedValue('boom');
    render(<LockScreen onUnlocked={onUnlocked} />);

    typePassword('x');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not unlock');
  });

  it('is disabled and ignores repeat submits while a login is in flight', async () => {
    let finish: () => void = () => {};
    vi.mocked(login).mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    render(<LockScreen onUnlocked={onUnlocked} />);

    typePassword('hunter2');
    const form = screen.getByRole('button', { name: 'Unlock' }).closest('form')!;
    fireEvent.submit(form);

    expect(await screen.findByRole('button', { name: 'Unlocking…' })).toBeDisabled();
    expect(screen.getByLabelText('Access password')).toBeDisabled();
    fireEvent.submit(form);
    expect(login).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });

  it('clears an earlier error when trying again', async () => {
    vi.mocked(login).mockRejectedValueOnce(new Error('Incorrect password.')).mockResolvedValueOnce(undefined);
    render(<LockScreen onUnlocked={onUnlocked} />);

    typePassword('nope');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await screen.findByRole('alert');

    typePassword('right');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => expect(onUnlocked).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the notice when one is given', () => {
    render(<LockScreen onUnlocked={onUnlocked} notice="Your session has ended." />);

    expect(screen.getByRole('status')).toHaveTextContent('Your session has ended.');
  });
});
