import { CSSProperties } from 'react';
import type { WidgetTheme } from './ThemedContainer';

interface SkeletonProps {
  /** Widget theme for color. If omitted, uses a neutral dark color. */
  theme?: WidgetTheme;
  /** Which theme color for the pulse. Default: 'accent' */
  color?: 'primary' | 'accent';
  /** Hex opacity suffix for the background. Default: '20' */
  opacity?: string;
  /** Tailwind width class. Default: 'w-20' */
  width?: string;
  /** Tailwind height class. Default: 'h-20' */
  height?: string;
  /** Tailwind border-radius class. Default: 'rounded' */
  rounded?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A pulsing loading placeholder. Adapts to theme colors when provided,
 * or falls back to a neutral dark color for non-themed widgets.
 */
export default function Skeleton({
  theme,
  color = 'accent',
  opacity = '20',
  width = 'w-20',
  height = 'h-20',
  rounded = 'rounded',
  className = '',
  style,
}: SkeletonProps) {
  const bg = theme ? `${theme[color]}${opacity}` : '#2A2A2E';

  return (
    <div
      className={`animate-pulse ${width} ${height} ${rounded} ${className}`}
      style={{ backgroundColor: bg, ...style }}
    />
  );
}
