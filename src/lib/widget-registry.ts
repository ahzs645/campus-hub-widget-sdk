// Widget Registry - Central hub for all widget types
import { ComponentType } from 'react';
import type { IconName } from './icon-names';
import type { WidgetOptionsSchema } from './options-schema';
import type { SourceCapabilities, SourceRequirement } from './source-capabilities';

export interface WidgetComponentProps {
  config?: Record<string, unknown>;
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  corsProxy?: string;
}

export interface WidgetOptionsProps {
  data: Record<string, unknown>;
  onChange: (newData: Record<string, unknown>) => void;
  /**
   * The library source currently linked to this widget via `__sourceRef`, when
   * one is selected. Resolved by the editor so options UIs can show the linked
   * source's name and capabilities (e.g. the Poster Carousel's Data Source
   * section) without querying the source list themselves.
   */
  linkedSource?: LinkedSource;
}

export type WidgetDefaultPropsFactory = () => Record<string, unknown>;

export type SourceType =
  | 'api'
  | 'image'
  | 'video'
  | 'embed'
  | 'feed'
  | 'document'
  | 'calendar'
  | 'canva'
  | 'powerpoint'
  | 'google-sheets'
  | 'google-slides'
  | 'google-calendar'
  | 'youtube'
  | 'google-drive'
  | 'powerbi'
  | 'unsplash'
  | 'vimeo';

export interface LinkedSource {
  _id: string;
  presetId?: string;
  name: string;
  url: string;
  sourceType: SourceType;
  description?: string;
  metadata?: {
    provider?: string;
    thumbnailUrl?: string;
  };
  /** Persisted/derived content-shape snapshot, when available. */
  capabilities?: SourceCapabilities;
}

export interface SourceBinding {
  /** Which prop receives the source URL (e.g. 'url', 'feedUrl') */
  propName: string;
  /** Accepted source types */
  types: SourceType[];
  /** Whether this prop accepts multiple sources (e.g. slideshow slides) */
  multiple?: boolean;
  /**
   * Capabilities this binding needs from a source (e.g. `{ hasImages: true }`).
   * Sources that don't meet this are still shown in the picker, greyed with a
   * reason, rather than hidden.
   */
  requires?: SourceRequirement;
  /** Short hint shown under the picker, e.g. "Needs images for the carousel". */
  capabilityHint?: string;
  /** Optional source filter for narrowing picker results. */
  matchSource?: (source: LinkedSource) => boolean;
  /** Optional widget-specific mapping when linking a source. */
  applySource?: (
    source: LinkedSource,
    currentData: Record<string, unknown>,
  ) => Record<string, unknown>;
  /** Label for the action that removes the linked source. */
  unlinkLabel?: string;
  /**
   * Widget-specific state to apply when a source is removed. For example, a
   * feed-backed carousel can switch back to its manually-managed posters.
   */
  removeSource?: (
    currentData: Record<string, unknown>,
  ) => Record<string, unknown>;
}

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  icon: IconName;
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
  defaultW: number;
  defaultH: number;
  tags?: string[];
  component: ComponentType<WidgetComponentProps>;
  /**
   * Bespoke options UI. Takes precedence over `optionsSchema` when both are
   * set. Prefer `optionsSchema` for new widgets.
   */
  OptionsComponent?: ComponentType<WidgetOptionsProps>;
  /**
   * Declarative options schema. When present (and no OptionsComponent), the
   * editor auto-renders the options form via SchemaOptionsForm, and the
   * template linter checks its `required` fields.
   */
  optionsSchema?: WidgetOptionsSchema;
  defaultProps?: Record<string, unknown>;
  createDefaultProps?: WidgetDefaultPropsFactory;
  /** Source types this widget can consume. Omit = no source picker shown. */
  acceptsSources?: SourceBinding[];
}

// Widget registry - widgets register themselves here
const registry: Map<string, WidgetDefinition> = new Map();

export function registerWidget(definition: WidgetDefinition): void {
  registry.set(definition.type, definition);
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return registry.get(type);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}

export function buildWidgetInitialProps(
  definition: Pick<WidgetDefinition, 'defaultProps' | 'createDefaultProps'>,
): Record<string, unknown> {
  return {
    ...(definition.defaultProps ?? {}),
    ...(definition.createDefaultProps?.() ?? {}),
  };
}

export function getWidgetComponent(type: string): ComponentType<WidgetComponentProps> | null {
  const widget = registry.get(type);
  return widget?.component ?? null;
}

// --- Lazy loader registry ---

type WidgetLoader = () => Promise<{ default: ComponentType<WidgetComponentProps> }>;
const loaderRegistry = new Map<string, WidgetLoader>();

export function registerWidgetLoader(type: string, loader: WidgetLoader): void {
  loaderRegistry.set(type, loader);
}

export function getWidgetLoader(type: string): WidgetLoader | undefined {
  return loaderRegistry.get(type);
}

export function getAllWidgetLoaders(): Map<string, WidgetLoader> {
  return loaderRegistry;
}
