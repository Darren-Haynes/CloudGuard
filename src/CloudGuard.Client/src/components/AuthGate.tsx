import React, { useEffect, useState } from 'react';
import { LOGIN_REQUIRED } from '../config';
import { hasValidSession, onUnauthorized } from '../services/auth';
import { LockScreen } from './LockScreen';

interface AuthGateProps {
  children: React.ReactNode;
}

// Shows the lock screen instead of the app until the visitor has unlocked it.
//
// The children are not mounted while locked, so the dashboard makes no requests (and its
// polling timers do not run) until a password has been accepted. The lock comes back whenever
// the API rejects the token, which also covers a local build pointed at a protected API.
export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !LOGIN_REQUIRED || hasValidSession());
  const [notice, setNotice] = useState<string | undefined>(undefined);

  useEffect(() => {
    return onUnauthorized(() => {
      setNotice('Your session has ended. Please unlock again.');
      setIsUnlocked(false);
    });
  }, []);

  if (!isUnlocked) {
    return (
      <LockScreen
        notice={notice}
        onUnlocked={() => {
          setNotice(undefined);
          setIsUnlocked(true);
        }}
      />
    );
  }

  return <>{children}</>;
};

export default AuthGate;
