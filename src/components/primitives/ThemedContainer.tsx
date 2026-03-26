import { CSSProperties, HTMLAttributes, forwardRef } from 'react';

export interface WidgetTheme {
  primary: string;
  accent: string;
  background: string;
}

interface ThemedContainerProps extends HTMLAttributes<HTMLDivElement> {
  theme: WidgetTheme;
  /** Which theme color to use for the background. Default: 'primary' */
  color?: 'primary' | 'accent' | 'background';
  /** Hex opacity suffix (e.g. '20', '50', 'FF'). Default: no suffix (solid) */
  opacity?: string;
  /** Additional inline styles merged with the themed background */
  style?: CSSProperties;
}

/**
 * A themed container div with a background color derived from the widget theme.
 * Applies `w-full h-full overflow-hidden` by default — override via className.
 */
const ThemedContainer = forwardRef<HTMLDivElement, ThemedContainerProps>(
  ({ theme, color = 'primary', opacity, className = '', style, children, ...rest }, ref) => {
    const base = theme[color];
    const bg = opacity ? `${base}${opacity}` : base;

    return (
      <div
        ref={ref}
        className={`w-full h-full overflow-hidden ${className}`}
        style={{ backgroundColor: bg, ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

ThemedContainer.displayName = 'ThemedContainer';
export default ThemedContainer;
