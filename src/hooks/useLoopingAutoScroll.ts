import { useEffect, useRef, type DependencyList, type RefObject } from 'react';

const START_DELAY_MS = 1800;
const END_PAUSE_MS = 2200;
const TICK_MS = 40;

/** Slowly reveals overflow content on unattended displays, then loops. */
export function useLoopingAutoScroll<T extends HTMLElement>(
  dependencies: DependencyList,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let stopped = false;
    let waitingAtEnd = false;
    let startTimeout = 0;
    let endTimeout = 0;
    let tickInterval = 0;

    const clearTimers = () => {
      window.clearTimeout(startTimeout);
      window.clearTimeout(endTimeout);
      window.clearInterval(tickInterval);
    };

    const start = () => {
      if (stopped || element.scrollHeight - element.clientHeight <= 1) return;
      tickInterval = window.setInterval(() => {
        if (stopped || waitingAtEnd) return;
        const maxScrollTop = element.scrollHeight - element.clientHeight;
        if (maxScrollTop <= 1) {
          element.scrollTop = 0;
          return;
        }

        if (element.scrollTop + 1 >= maxScrollTop) {
          element.scrollTop = maxScrollTop;
          waitingAtEnd = true;
          endTimeout = window.setTimeout(() => {
            if (stopped) return;
            element.scrollTop = 0;
            waitingAtEnd = false;
          }, END_PAUSE_MS);
          return;
        }

        element.scrollTop += 1;
      }, TICK_MS);
    };

    element.scrollTop = 0;
    startTimeout = window.setTimeout(start, START_DELAY_MS);

    return () => {
      stopped = true;
      clearTimers();
    };
    // Callers provide the content-affecting values that restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return ref;
}
