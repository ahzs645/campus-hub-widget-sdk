import { CSSProperties, ReactNode } from 'react';
import type { WidgetTheme } from './ThemedContainer';

interface SectionHeaderProps {
  theme: WidgetTheme;
  /** Header text */
  title: string;
  /** Optional icon element rendered before the title */
  icon?: ReactNode;
  /** Show a fading divider line after the title. Default: true */
  divider?: boolean;
  /** Optional content rendered on the right side (e.g. page counter) */
  trailing?: ReactNode;
  /** HTML heading level class. Default: 'text-3xl' */
  size?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A section header with icon, title, optional divider line, and trailing content.
 * Used at the top of EventsList, SimpleTable, NewsTicker label areas, etc.
 */
export default function SectionHeader({
  theme,
  title,
  icon,
  divider = true,
  trailing,
  size = 'text-3xl',
  className = '',
  style,
}: SectionHeaderProps) {
  return (
    <h3
      className={`flex-shrink-0 ${size} font-bold flex items-center gap-4 ${className}`}
      style={{ color: theme.accent, ...style }}
    >
      {icon}
      <span className="font-display">{title}</span>
      {divider && (
        <div className="flex-1 h-px ml-2" style={{ backgroundColor: `${theme.accent}30` }} />
      )}
      {trailing}
    </h3>
  );
}
