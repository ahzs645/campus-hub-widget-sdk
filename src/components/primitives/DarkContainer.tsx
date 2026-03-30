import { CSSProperties, HTMLAttributes, forwardRef } from 'react';

interface DarkContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Background color. Default: '#1B1B1D' */
  bg?: string;
  /** Border radius in px. Default: 22 */
  radius?: number;
  style?: CSSProperties;
}

/**
 * A dark-themed container used by fun/game/info widgets that have their
 * own visual identity independent of the widget theme. Applies
 * `w-full h-full overflow-hidden` with a dark background and rounded corners.
 *
 * Reads the CSS custom property `--widget-theme-tint` (set by the display
 * renderer or gallery) to overlay a subtle theme-colored tint, keeping
 * DarkContainer widgets visually cohesive with the active color scheme
 * without requiring each widget to pass a `theme` prop.
 */
const DarkContainer = forwardRef<HTMLDivElement, DarkContainerProps>(
  ({ bg = '#1B1B1D', radius = 22, className = '', style, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`w-full h-full overflow-hidden ${className}`}
        style={{
          backgroundColor: bg,
          backgroundImage: 'linear-gradient(var(--widget-theme-tint, transparent), var(--widget-theme-tint, transparent))',
          borderRadius: radius,
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

DarkContainer.displayName = 'DarkContainer';
export default DarkContainer;
