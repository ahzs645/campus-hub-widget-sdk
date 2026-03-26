/**
 * Widget Primitives
 * =================
 * Reusable, themed UI building blocks for widget components.
 * Import from '@firstform/campus-hub-widget-sdk'.
 *
 * All primitives are optional — widgets can still use raw elements
 * when they need custom behavior.
 *
 * CONTAINERS
 *   ThemedContainer  – Background div using theme colors + opacity (w-full h-full overflow-hidden)
 *   DarkContainer    – Hardcoded dark bg (#1B1B1D) + borderRadius for non-themed widgets
 *   ThemedCard       – Rounded card with semi-transparent bg + optional left accent bar
 *   ScrollableList   – Flex-1 vertical scroll container with hidden scrollbar
 *
 * TEXT & LABELS
 *   ThemedText       – Text element with theme color
 *   Badge            – Small label with themed semi-transparent background
 *   SectionHeader    – Bold heading with icon, divider line, and trailing content
 *   IconText         – Horizontal icon + text layout
 *   MarqueeText      – Auto-scrolling text that activates on overflow
 *
 * INDICATORS
 *   DotIndicator     – Round navigation dots (active/inactive)
 *   PillIndicator    – Variable-width bar indicators (active wider than inactive)
 *   ProgressBar      – Thin animated or static progress bar
 *   PulsingDot       – Animated ping dot for live/status indicators
 *
 * FEEDBACK
 *   Skeleton         – Pulsing loading placeholder
 *   FadeOverlay      – Gradient fade edges for scrollable containers
 *
 * DATA DISPLAY
 *   StatDisplay      – Big number + unit + label metric display
 *
 * OPTIONS PANELS
 *   OptionsPanel     – Root wrapper for widget options (space-y-6, max-w-xl)
 *   OptionsSection   – Section with title + optional border divider
 *   OptionsPreview   – Preview block at bottom of options panel
 */

export { default as ThemedContainer, type WidgetTheme } from './ThemedContainer';
export { default as ThemedText } from './ThemedText';
export { default as ThemedCard } from './ThemedCard';
export { default as Badge } from './Badge';
export { default as ProgressBar } from './ProgressBar';
export { default as DotIndicator } from './DotIndicator';
export { default as SectionHeader } from './SectionHeader';
export { default as ScrollableList } from './ScrollableList';
export { default as PulsingDot } from './PulsingDot';
export { default as IconText } from './IconText';
export { OptionsPanel, OptionsSection, OptionsPreview } from './OptionsSection';
export { default as PillIndicator } from './PillIndicator';
export { default as MarqueeText } from './MarqueeText';
export { default as DarkContainer } from './DarkContainer';
export { default as FadeOverlay } from './FadeOverlay';
export { default as Skeleton } from './Skeleton';
export { default as StatDisplay } from './StatDisplay';
