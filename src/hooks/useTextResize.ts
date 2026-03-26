'use client';
import { useCallback, useEffect, useRef } from 'react';

interface TextResizeResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  childRef: React.RefObject<HTMLDivElement | null>;
  resizeText: () => void;
}

/**
 * Automatically resizes text to fill available container space using binary
 * search to find the optimal font size.  O(log n) layout reflows instead of
 * the naive O(n) approach.
 *
 * Attach `containerRef` to the bounding element and `childRef` to the text
 * wrapper inside it.  The hook sets `fontSize` on the container as a
 * percentage (1 %–2000 %) so all nested text scales proportionally.
 *
 * Ported from Concerto's useTextResize composable, adapted for React.
 */
export function useTextResize(): TextResizeResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLDivElement>(null);

  const resizeText = useCallback(() => {
    const container = containerRef.current;
    const child = childRef.current;
    if (!container || !child) return;

    const fieldHeight = container.offsetHeight;
    if (fieldHeight === 0) return;

    const MIN_FONT_SIZE = 1;
    const MAX_FONT_SIZE = 2000;
    let lo = MIN_FONT_SIZE;
    let hi = MAX_FONT_SIZE;
    let best = MIN_FONT_SIZE;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      container.style.fontSize = `${mid}%`;

      if (container.scrollHeight <= fieldHeight) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    container.style.fontSize = `${best}%`;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resizeText();

    const ro = new ResizeObserver(resizeText);
    ro.observe(container);

    // Also watch nearest grid-stack-item ancestor for style mutations
    const gsItem = container.closest('.grid-stack-item');
    let mo: MutationObserver | undefined;
    if (gsItem) {
      mo = new MutationObserver(resizeText);
      mo.observe(gsItem, { attributes: true, attributeFilter: ['style'] });
    }

    return () => {
      ro.disconnect();
      mo?.disconnect();
    };
  }, [resizeText]);

  return { containerRef, childRef, resizeText };
}
