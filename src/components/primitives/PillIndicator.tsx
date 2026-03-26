import type { WidgetTheme } from './ThemedContainer';

interface PillIndicatorProps {
  theme: WidgetTheme;
  /** Total number of pills */
  count: number;
  /** Currently active pill index */
  active: number;
  /** Called when a pill is clicked */
  onSelect?: (index: number) => void;
  /** Active pill width in px. Default: 20 */
  activeWidth?: number;
  /** Inactive pill width in px. Default: 8 */
  inactiveWidth?: number;
  /** Inactive pill color. Default: 'rgba(255,255,255,0.3)' */
  inactiveColor?: string;
  className?: string;
}

/**
 * Variable-width pill indicator for carousels and paginated content.
 * Active pill is wider than inactive pills. Used in ClubSpotlight,
 * Confessions, Countdown, ExchangeRate, etc.
 */
export default function PillIndicator({
  theme,
  count,
  active,
  onSelect,
  activeWidth = 20,
  inactiveWidth = 8,
  inactiveColor = 'rgba(255,255,255,0.3)',
  className = '',
}: PillIndicatorProps) {
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          className="h-1.5 rounded-full transition-all duration-300 shrink-0"
          style={{
            width: i === active ? activeWidth : inactiveWidth,
            backgroundColor: i === active ? theme.accent : inactiveColor,
          }}
          onClick={() => onSelect?.(i)}
        />
      ))}
    </div>
  );
}
