// Widget Registry - Central hub for all widget types
import { ComponentType, createElement, lazy, Suspense } from 'react';
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

/**
 * Everything about a widget except its React components.
 *
 * This is the half the host always needs: the editor palette, template
 * validation, and default props all read it, on every page load. It must stay
 * cheap — no React components, no heavy library imports, nothing that pulls a
 * charting or protobuf library into the entry bundle.
 *
 * The components live behind loaders on {@link WidgetModule} so they are
 * fetched only by a display that actually places the widget.
 */
export interface WidgetManifestEntry {
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

/**
 * A widget as authored: cheap manifest plus lazy loaders for the expensive
 * parts. This is what {@link defineWidget} produces and what a widget package
 * exports.
 */
export interface WidgetModule {
  manifest: WidgetManifestEntry;
  /** Loads the display component. Called the first time a board renders it. */
  load: () => Promise<{ default: ComponentType<WidgetComponentProps> }>;
  /**
   * Loads the bespoke options UI, if the widget has one. Editor-only, so a
   * display never pays for it. Prefer `optionsSchema` for new widgets.
   */
  loadOptions?: () => Promise<{ default: ComponentType<WidgetOptionsProps> }>;
}

/**
 * Identity helper that gives a widget package a typed, greppable declaration
 * site. Use it in a module that imports no components:
 *
 * ```ts
 * export default defineWidget({
 *   manifest: { type: 'bus-connection', name: 'Bus Connection', ... },
 *   load: () => import('./BusConnection'),
 *   loadOptions: () => import('./BusConnectionOptions'),
 * });
 * ```
 */
export function defineWidget(module: WidgetModule): WidgetModule {
  return module;
}

/**
 * @deprecated Prefer {@link WidgetModule} via {@link defineWidget}. Registering
 * a definition forces the component into whatever bundle reads the metadata,
 * which for the host means every display downloads every widget.
 */
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

// --- Registries -------------------------------------------------------------
//
// Metadata and components are stored apart so a host can read the whole
// catalogue without pulling a single widget's code. Legacy `registerWidget`
// callers populate both sides at once; `registerWidgetModule` callers leave the
// component side as loaders until something actually renders the widget.

type WidgetLoader = () => Promise<{ default: ComponentType<WidgetComponentProps> }>;
type WidgetOptionsLoader = () => Promise<{ default: ComponentType<WidgetOptionsProps> }>;

const manifestRegistry = new Map<string, WidgetManifestEntry>();
const loaderRegistry = new Map<string, WidgetLoader>();
const optionsLoaderRegistry = new Map<string, WidgetOptionsLoader>();
const eagerComponents = new Map<string, ComponentType<WidgetComponentProps>>();
const eagerOptions = new Map<string, ComponentType<WidgetOptionsProps>>();

// Derived values are cached so repeated reads hand back the same object and
// component identities. Without this, a caller doing
// `const C = getWidget(t).component` inside render would remount the widget on
// every pass.
const definitionCache = new Map<string, WidgetDefinition>();
const lazyComponentCache = new Map<string, ComponentType<WidgetComponentProps>>();
const lazyOptionsCache = new Map<string, ComponentType<WidgetOptionsProps>>();

function invalidate(type: string): void {
  definitionCache.delete(type);
  lazyComponentCache.delete(type);
  lazyOptionsCache.delete(type);
}

/**
 * Wrap a loader as a plain component that suspends on its own, so callers can
 * render it without knowing it is lazy and without providing a boundary.
 */
function suspending<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  const Lazy = lazy(load);
  return (props: P) => createElement(Suspense, { fallback: null }, createElement(Lazy, props));
}

/** Register a widget authored as a manifest plus loaders. Preferred. */
export function registerWidgetModule(module: WidgetModule): void {
  const { manifest, load, loadOptions } = module;
  manifestRegistry.set(manifest.type, manifest);
  loaderRegistry.set(manifest.type, load);
  if (loadOptions) optionsLoaderRegistry.set(manifest.type, loadOptions);
  invalidate(manifest.type);
}

/**
 * @deprecated Use {@link registerWidgetModule} with {@link defineWidget}. This
 * form holds the component in the same module as the metadata, so every host
 * that reads the catalogue also downloads the widget.
 */
export function registerWidget(definition: WidgetDefinition): void {
  const { component, OptionsComponent, ...manifest } = definition;
  manifestRegistry.set(manifest.type, manifest);
  eagerComponents.set(manifest.type, component);
  if (OptionsComponent) eagerOptions.set(manifest.type, OptionsComponent);
  // Don't clobber a real code-split loader if the package registered one.
  if (!loaderRegistry.has(manifest.type)) {
    loaderRegistry.set(manifest.type, async () => ({ default: component }));
  }
  invalidate(manifest.type);
}

function resolveComponent(type: string): ComponentType<WidgetComponentProps> | undefined {
  const eager = eagerComponents.get(type);
  if (eager) return eager;
  const cached = lazyComponentCache.get(type);
  if (cached) return cached;
  const loader = loaderRegistry.get(type);
  if (!loader) return undefined;
  const wrapped = suspending(loader);
  lazyComponentCache.set(type, wrapped);
  return wrapped;
}

function resolveOptions(type: string): ComponentType<WidgetOptionsProps> | undefined {
  const eager = eagerOptions.get(type);
  if (eager) return eager;
  const cached = lazyOptionsCache.get(type);
  if (cached) return cached;
  const loader = optionsLoaderRegistry.get(type);
  if (!loader) return undefined;
  const wrapped = suspending(loader);
  lazyOptionsCache.set(type, wrapped);
  return wrapped;
}

/**
 * Full definition, including components.
 *
 * Reading `.component` or `.OptionsComponent` off the result is what forces a
 * code-split widget to load, so editor surfaces should use this and displays
 * should go through the loader registry instead.
 */
export function getWidget(type: string): WidgetDefinition | undefined {
  const cached = definitionCache.get(type);
  if (cached) return cached;

  const manifest = manifestRegistry.get(type);
  if (!manifest) return undefined;
  const component = resolveComponent(type);
  if (!component) return undefined;

  const options = resolveOptions(type);
  const definition: WidgetDefinition = {
    ...manifest,
    component,
    ...(options ? { OptionsComponent: options } : {}),
  };
  definitionCache.set(type, definition);
  return definition;
}

export function getAllWidgets(): WidgetDefinition[] {
  return [...manifestRegistry.keys()]
    .map((type) => getWidget(type))
    .filter((definition): definition is WidgetDefinition => definition !== undefined);
}

/** Metadata only — never causes a widget's code to load. */
export function getWidgetManifest(type: string): WidgetManifestEntry | undefined {
  return manifestRegistry.get(type);
}

/** Metadata for every registered widget. Safe to call on a display. */
export function getAllWidgetManifests(): WidgetManifestEntry[] {
  return Array.from(manifestRegistry.values());
}

export function buildWidgetInitialProps(
  definition: Pick<WidgetManifestEntry, 'defaultProps' | 'createDefaultProps'>,
): Record<string, unknown> {
  return {
    ...(definition.defaultProps ?? {}),
    ...(definition.createDefaultProps?.() ?? {}),
  };
}

export function getWidgetComponent(type: string): ComponentType<WidgetComponentProps> | null {
  return resolveComponent(type) ?? null;
}

// --- Lazy loader registry ---

/**
 * @deprecated Register the loader together with its metadata via
 * {@link registerWidgetModule}.
 */
export function registerWidgetLoader(type: string, loader: WidgetLoader): void {
  loaderRegistry.set(type, loader);
  invalidate(type);
}

export function getWidgetLoader(type: string): WidgetLoader | undefined {
  return loaderRegistry.get(type);
}

export function getAllWidgetLoaders(): Map<string, WidgetLoader> {
  return loaderRegistry;
}

export function getWidgetOptionsLoader(type: string): WidgetOptionsLoader | undefined {
  return optionsLoaderRegistry.get(type);
}
