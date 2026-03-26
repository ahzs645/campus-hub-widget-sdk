import type { WidgetTheme } from './ThemedContainer';

interface PulsingDotProps {
  theme: WidgetTheme;
  /** Which theme color for the dot. Default: 'accent' */
  color?: 'primary' | 'accent';
  /** Dot size class. Default: 'h-3 w-3' */
  size?: string;
  className?: string;
}

/**
 * An animated pulsing dot indicator (ping + solid dot).
 * Used in NewsTicker "Breaking" label, live status indicators, etc.
 */
export default function PulsingDot({
  theme,
  color = 'accent',
  size = 'h-3 w-3',
  className = '',
}: PulsingDotProps) {
  const dotColor = theme[color];
  return (
    <span className={`relative flex ${size} ${className}`}>
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75`}
        style={{ backgroundColor: dotColor }}
      />
      <span
        className={`relative inline-flex rounded-full ${size}`}
        style={{ backgroundColor: dotColor }}
      />
    </span>
  );
}
