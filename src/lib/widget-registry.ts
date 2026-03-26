// Widget Registry - Central hub for all widget types
import { ComponentType } from 'react';
import type { IconName } from './icon-names';

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
}

export type SourceType = 'image' | 'video' | 'embed' | 'feed' | 'document' | 'calendar';

export interface SourceBinding {
  /** Which prop receives the source URL (e.g. 'url', 'feedUrl') */
  propName: string;
  /** Accepted source types */
  types: SourceType[];
  /** Whether this prop accepts multiple sources (e.g. slideshow slides) */
  multiple?: boolean;
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
  OptionsComponent?: ComponentType<WidgetOptionsProps>;
  defaultProps?: Record<string, unknown>;
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
