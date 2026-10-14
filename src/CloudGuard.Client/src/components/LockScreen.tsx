import React, { useState } from 'react';
import { login } from '../services/auth';

interface LockScreenProps {
  onUnlocked: () => void;
  // Shown above the form, for example when a session has just ended.
  notice?: string;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlocked, notice }) => {
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || password === '') return;

    setIsSubmitting(true);
    setError(null);
    try {
      await login(password);
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        padding: '1.5rem',
        boxSizing: 'border-box',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '24rem',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          boxShadow: 'var(--shadow)',
          padding: '2rem',
          boxSizing: 'border-box',
          textAlign: 'left',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 0.5rem 0' }}>
          🛡️ CloudGuard
        </h1>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
          This dashboard is private. Enter the access password to continue.
        </p>

        {notice && (
          <p
            role="status"
            style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--status-vulnerable-text)' }}
          >
            {notice}
          </p>
        )}

        <label
          htmlFor="cloudguard-access-password"
          style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: '0.375rem' }}
        >
          Access password
        </label>
        <input
          id="cloudguard-access-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0.625rem 0.75rem',
            backgroundColor: 'var(--bg)',
            color: 'var(--text-h)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            marginBottom: '1rem',
          }}
        />

        {error !== null && (
          <div
            role="alert"
            style={{
              marginBottom: '1rem',
              padding: '0.625rem 0.75rem',
              backgroundColor: 'var(--status-critical-bg)',
              border: '1px solid var(--status-critical-border)',
              borderRadius: '0.375rem',
              color: 'var(--status-critical-text)',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || password === ''}
          style={{
            width: '100%',
            padding: '0.625rem 1rem',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: isSubmitting || password === '' ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || password === '' ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
};

export default LockScreen;
