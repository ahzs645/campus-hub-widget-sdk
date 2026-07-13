import { useEffect, useState } from 'react';

const SETTLE_BUFFER_MS = 100;

/**
 * Tracks whether a CSS transition kicked off by `value` changing has finished.
 * Returns false while the transition is in flight, then true once
 * `durationMs` (plus a small buffer) has elapsed.
 *
 * Rotating widgets use this to keep `data-layout-diagnostic-ignore` on an
 * incoming slide until it has fully slid into the widget bounds — editor
 * layout diagnostics measure at transition start, so an unguarded incoming
 * slide is still off-screen and gets flagged as clipped. Removing the
 * attribute after settling triggers a re-measure, so genuine overflow is
 * still detected.
 */
export function useTransitionSettled(value: unknown, durationMs = 500): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);
    const timer = window.setTimeout(
      () => setSettled(true),
      durationMs + SETTLE_BUFFER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [value, durationMs]);

  return settled;
}
