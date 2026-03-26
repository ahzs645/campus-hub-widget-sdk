import { CSSProperties, HTMLAttributes } from 'react';
import type { WidgetTheme } from './ThemedContainer';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  theme: WidgetTheme;
  /** Background opacity suffix. Default: '20' */
  bgOpacity?: string;
  /** Use accent color for bg + text, or primary. Default: 'accent' */
  color?: 'accent' | 'primary';
  /** Pill-shaped (rounded-full) vs subtle (rounded). Default: false */
  pill?: boolean;
  style?: CSSProperties;
}

/**
 * A small badge/label with themed semi-transparent background.
 * Used for date badges, category labels, status indicators, etc.
 */
export default function Badge({
  theme,
  bgOpacity = '20',
  color = 'accent',
  pill = false,
  className = '',
  style,
  children,
  ...rest
}: BadgeProps) {
  const base = theme[color];
  return (
    <span
      className={`px-3 py-1 font-bold ${pill ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ backgroundColor: `${base}${bgOpacity}`, color: base, ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}
