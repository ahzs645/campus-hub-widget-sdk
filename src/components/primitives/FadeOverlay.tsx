import type { WidgetTheme } from './ThemedContainer';

interface FadeOverlayProps {
  theme: WidgetTheme;
  /** Show top fade. Default: true */
  top?: boolean;
  /** Show bottom fade. Default: true */
  bottom?: boolean;
  /** Height of the fade gradient. Default: 'h-6' */
  height?: string;
  /** Fallback background color if theme.background is empty. Default: '#1a1a2e' */
  fallback?: string;
}

/**
 * Gradient fade overlays for the top and/or bottom edges of a scrollable
 * container. Place inside a `relative` parent alongside the scrollable content.
 */
export default function FadeOverlay({
  theme,
  top = true,
  bottom = true,
  height = 'h-6',
  fallback = '#1a1a2e',
}: FadeOverlayProps) {
  const bg = theme.background || fallback;

  return (
    <>
      {top && (
        <div
          className={`absolute top-0 left-0 right-0 ${height} pointer-events-none z-10`}
          style={{ background: `linear-gradient(to bottom, ${bg}, transparent)` }}
        />
      )}
      {bottom && (
        <div
          className={`absolute bottom-0 left-0 right-0 ${height} pointer-events-none z-10`}
          style={{ background: `linear-gradient(to top, ${bg}, transparent)` }}
        />
      )}
    </>
  );
}
