import { CSSProperties, ReactNode } from 'react';

interface IconTextProps {
  /** Icon element (e.g. <AppIcon />, <svg />) */
  icon: ReactNode;
  /** Gap between icon and text. Default: '1.5' */
  gap?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Horizontal flex layout pairing an icon with text content.
 * Ensures consistent alignment across widgets.
 */
export default function IconText({
  icon,
  gap = '1.5',
  className = '',
  style,
  children,
}: IconTextProps) {
  return (
    <div className={`flex items-center gap-${gap} ${className}`} style={style}>
      {icon}
      {children}
    </div>
  );
}
