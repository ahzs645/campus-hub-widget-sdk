import { CSSProperties, useRef } from 'react';
import type { WidgetTheme } from './ThemedContainer';

interface ProgressBarProps {
  theme: WidgetTheme;
  /** Animation duration in seconds for infinite linear progress. Omit for a static bar. */
  durationSeconds?: number;
  /** Static progress value 0-1. Ignored when durationSeconds is set. */
  value?: number;
  /** CSS animation name. Default: 'events-progress' */
  animationName?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A thin themed progress bar. Supports both animated (infinite ticker-style)
 * and static (value-based) modes.
 */
export default function ProgressBar({
  theme,
  durationSeconds,
  value,
  animationName = 'events-progress',
  className = '',
  style,
}: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const isAnimated = durationSeconds != null;

  return (
    <div
      className={`h-1 rounded-full overflow-hidden ${className}`}
      style={{ backgroundColor: `${theme.accent}15`, ...style }}
    >
      <div
        ref={barRef}
        className="h-full rounded-full"
        style={{
          backgroundColor: `${theme.accent}60`,
          ...(isAnimated
            ? { animation: `${animationName} ${durationSeconds}s linear infinite` }
            : { width: `${(value ?? 0) * 100}%`, transition: 'width 300ms ease' }),
        }}
      />
    </div>
  );
}
