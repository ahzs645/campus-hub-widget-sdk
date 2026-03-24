# @firstform/campus-hub-widget-sdk

SDK for building widgets for the Campus Hub Engine.

## Installation

```bash
npm install @firstform/campus-hub-widget-sdk
```

## Usage

```tsx
import {
  registerWidget,
  type WidgetComponentProps,
  type WidgetOptionsProps,
  registerWidgetLoader,
} from '@firstform/campus-hub-widget-sdk';

function MyWidget({ config, theme }: WidgetComponentProps) {
  return <div style={{ color: theme.accent }}>Hello Widget!</div>;
}

registerWidget({
  type: 'my-widget',
  name: 'My Widget',
  description: 'A custom widget',
  icon: 'puzzle',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: MyWidget,
});

// Register a lazy loader for display mode
registerWidgetLoader('my-widget', () => import('./MyWidget'));
```

## Available Exports

### Widget Registry
- `registerWidget` — Register a widget definition
- `registerWidgetLoader` — Register a lazy loader for display mode
- `getWidget`, `getAllWidgets`, `getWidgetComponent` — Query the registry
- `getWidgetLoader`, `getAllWidgetLoaders` — Query lazy loaders

### Types
- `WidgetComponentProps` — Props interface for widget components
- `WidgetOptionsProps` — Props interface for widget option panels
- `WidgetDefinition` — Shape of a widget registration
- `IconName` — Union type of available icon names

### Hooks
- `useFitScale` / `useAdaptiveFitScale` — Scale content to fit container
- `useEvents` — Fetch and parse calendar events from JSON/iCal/RSS

### Data Utilities
- `fetchJsonWithCache` / `fetchTextWithCache` — Cached fetch with stale-while-revalidate
- `buildCacheKey`, `buildProxyUrl`, `isEntryFresh`
- `parseICal`, `parseRss` — Feed parsers

### UI Components
- `AppIcon` — Icon component using lucide-react
- `FormInput`, `FormSelect`, `FormSwitch`, `FormStepper` — Form components for widget option panels
