import { ReactNode } from 'react';
import { useWidgetOptionsSurface } from '../../lib/widget-options-surface';

interface OptionsSectionProps {
  /** Section heading text */
  title: string;
  /** Whether to show a top border divider. First section typically has none. */
  divider?: boolean;
  children: ReactNode;
}

/**
 * A section within a widget options panel. Renders a heading with
 * consistent styling and an optional top border divider.
 *
 * Usage:
 * ```tsx
 * <OptionsPanel>
 *   <OptionsSection title="Data Source">
 *     <FormInput ... />
 *   </OptionsSection>
 *   <OptionsSection title="Display" divider>
 *     <FormSwitch ... />
 *   </OptionsSection>
 * </OptionsPanel>
 * ```
 */
export function OptionsSection({ title, divider = false, children }: OptionsSectionProps) {
  return (
    <div className={`space-y-4${divider ? ' border-t border-[color:var(--ui-item-border)] pt-6' : ''}`}>
      <h3 className="font-semibold text-[var(--ui-text)] text-center">{title}</h3>
      {children}
    </div>
  );
}

interface OptionsPanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * Root wrapper for a widget options panel. Provides consistent spacing
 * and max-width. Contains OptionsSection children.
 */
export function OptionsPanel({ children, className = '' }: OptionsPanelProps) {
  return (
    <div className={`space-y-6 w-full max-w-xl mx-auto ${className}`}>
      {children}
    </div>
  );
}

interface OptionsPreviewProps {
  /** Preview section heading. Default: 'Preview' */
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Preview section at the bottom of an options panel.
 */
export function OptionsPreview({ title = 'Preview', children, className = '' }: OptionsPreviewProps) {
  const surface = useWidgetOptionsSurface();

  if (surface === 'gallery') {
    return null;
  }

  return (
    <div className="border-t border-[color:var(--ui-item-border)] pt-6">
      <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">{title}</h4>
      <div className={`bg-[var(--ui-item-bg)] rounded-xl p-6 flex flex-col items-center ${className}`}>
        {children}
      </div>
    </div>
  );
}
