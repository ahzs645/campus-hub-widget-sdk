import { HTMLAttributes } from 'react';

interface ScrollableListProps extends HTMLAttributes<HTMLDivElement> {
  /** Gap between items (Tailwind spacing). Default: '3' */
  gap?: string;
}

/**
 * A flex-1 vertical scrollable container with hidden scrollbar.
 * Wraps a list of items with consistent spacing.
 */
export default function ScrollableList({
  gap = '3',
  className = '',
  children,
  ...rest
}: ScrollableListProps) {
  return (
    <div
      className={`flex-1 space-y-${gap} overflow-y-auto min-h-0 hide-scrollbar pr-1 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
