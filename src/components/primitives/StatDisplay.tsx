import { CSSProperties, ReactNode } from 'react';

interface StatDisplayProps {
  /** The primary value (number, formatted string, etc.) */
  value: ReactNode;
  /** Optional unit or suffix rendered smaller next to the value */
  unit?: ReactNode;
  /** Label or description below the value */
  label?: ReactNode;
  /** Secondary text below the label */
  sublabel?: ReactNode;
  /** Optional icon or visual rendered beside the value */
  icon?: ReactNode;
  /** Layout direction. Default: 'vertical' */
  direction?: 'vertical' | 'horizontal';
  /** Tailwind text size for the value. Default: 'text-5xl' */
  valueSize?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A large stat/metric display with value, optional unit, label, and icon.
 * Common in environment widgets (Weather temperature, AQI value) and
 * info widgets (crypto price, exchange rate).
 */
export default function StatDisplay({
  value,
  unit,
  label,
  sublabel,
  icon,
  direction = 'vertical',
  valueSize = 'text-5xl',
  className = '',
  style,
}: StatDisplayProps) {
  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className={`flex ${isHorizontal ? 'items-center gap-4' : 'flex-col items-center gap-2'} ${className}`}
      style={style}
    >
      {icon}
      <div className={!isHorizontal ? 'text-center' : ''}>
        <div className={`${valueSize} font-bold text-white leading-tight`}>
          {value}
          {unit && <span className="text-2xl font-normal text-white/70 ml-1">{unit}</span>}
        </div>
        {label && <div className="text-lg text-white/70">{label}</div>}
        {sublabel && <div className="text-sm text-white/50 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}
