import { CSSProperties, HTMLAttributes } from 'react';
import type { WidgetTheme } from './ThemedContainer';

interface ThemedCardProps extends HTMLAttributes<HTMLDivElement> {
  theme: WidgetTheme;
  /** Background opacity suffix. Default: '50' */
  bgOpacity?: string;
  /** Show a colored accent bar on the left. Default: true */
  accentBar?: boolean;
  /** Color of the accent bar. Falls back to theme.accent */
  accentBarColor?: string;
  style?: CSSProperties;
}

/**
 * A card container with semi-transparent themed background and an optional
 * left accent bar. Common pattern across EventsList, Weather detail items, etc.
 */
export default function ThemedCard({
  theme,
  bgOpacity = '50',
  accentBar = true,
  accentBarColor,
  className = '',
  style,
  children,
  ...rest
}: ThemedCardProps) {
  return (
    <div
      className={`p-5 ${accentBar ? 'pl-8' : ''} rounded-xl overflow-hidden relative ${className}`}
      style={{ backgroundColor: `${theme.primary}${bgOpacity}`, ...style }}
      {...rest}
    >
      {accentBar && (
        <div
          className="absolute left-3 top-4 bottom-4 w-1 rounded-full"
          style={{ backgroundColor: accentBarColor ?? theme.accent }}
        />
      )}
      {children}
    </div>
  );
}
