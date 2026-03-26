import type { WidgetTheme } from './ThemedContainer';

interface DotIndicatorProps {
  theme: WidgetTheme;
  /** Total number of dots */
  count: number;
  /** Currently active dot index */
  active: number;
  /** Called when a dot is clicked */
  onSelect?: (index: number) => void;
  className?: string;
}

/**
 * Navigation dots with active/inactive states. Common across paginated
 * and ticker-style widgets (EventsList, Countdown, NewsTicker, etc.).
 */
export default function DotIndicator({
  theme,
  count,
  active,
  onSelect,
  className = '',
}: DotIndicatorProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-all duration-300"
          style={{
            backgroundColor: i === active ? theme.accent : `${theme.accent}30`,
            transform: i === active ? 'scale(1.3)' : 'scale(1)',
          }}
          onClick={() => onSelect?.(i)}
        />
      ))}
    </div>
  );
}
