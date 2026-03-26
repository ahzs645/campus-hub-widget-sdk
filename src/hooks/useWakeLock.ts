'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface WakeLockResult {
  /** Whether the wake lock is currently held */
  isActive: boolean;
  /** Whether the browser supports the Screen Wake Lock API */
  isSupported: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Manually acquire the wake lock */
  acquire: () => Promise<void>;
  /** Manually release the wake lock */
  release: () => Promise<void>;
}

/**
 * Manages the Screen Wake Lock API to prevent the display from dimming or
 * turning off.  Essential for kiosk / digital-signage deployments.
 *
 * Automatically acquires the lock on mount and re-acquires it whenever the
 * page returns to the foreground (the browser releases wake locks when the
 * tab is hidden).
 *
 * Ported from Concerto's useWakeLock composable, adapted for React.
 */
export function useWakeLock(): WakeLockResult {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    setError(null);
    if (!supported) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      lockRef.current = sentinel;
      setIsActive(true);

      sentinel.addEventListener('release', () => {
        setIsActive(false);
      });
    } catch (err) {
      setError((err as Error).message);
      setIsActive(false);
    }
  }, [supported]);

  const release = useCallback(async () => {
    if (lockRef.current) {
      try {
        await lockRef.current.release();
      } catch {
        // ignore
      }
      lockRef.current = null;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    acquire();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      } else {
        setIsActive(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      release();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [acquire, release]);

  return { isActive, isSupported: supported, error, acquire, release };
}
