import { CSSProperties, HTMLAttributes } from 'react';
import type { WidgetTheme } from './ThemedContainer';

type TextElement = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';

interface ThemedTextProps extends HTMLAttributes<HTMLElement> {
  theme: WidgetTheme;
  /** Which theme color to use. Default: 'accent' */
  color?: 'primary' | 'accent' | 'background' | 'white';
  /** Hex opacity suffix appended to the color (e.g. '70', 'CC'). Ignored when color='white'. */
  opacity?: string;
  /** HTML element to render. Default: 'span' */
  as?: TextElement;
  style?: CSSProperties;
}

/**
 * Renders themed text using widget theme colors.
 * For white with opacity, use Tailwind classes like `text-white/70` via className instead.
 */
export default function ThemedText({
  theme,
  color = 'accent',
  opacity,
  as: Tag = 'span',
  className = '',
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const base = color === 'white' ? '#ffffff' : theme[color];
  const textColor = opacity && color !== 'white' ? `${base}${opacity}` : base;

  return (
    <Tag className={className} style={{ color: textColor, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
