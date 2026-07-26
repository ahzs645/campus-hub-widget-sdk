# @firstform/campus-hub-widget-sdk

SDK for building widgets for the Campus Hub Engine.

A widget package can live in this organisation's monorepo or in a repository
you own. The SDK is self-contained: your package installs, typechecks and
builds with the SDK alone — no host engine required.

**Full contract and worked examples: [`docs/authoring-widgets.md`](./docs/authoring-widgets.md).**
Copyable starter: [`examples/widget-package-template`](./examples/widget-package-template).

## Installation

```bash
npm install @firstform/campus-hub-widget-sdk
```

## Usage

A widget is declared in two halves: a cheap **manifest** the host always reads,
and **loaders** for the parts it only needs when a board actually places the
widget.

```ts
// src/my-widget/meta.ts — no component imports, no library imports
import { defineWidget } from '@firstform/campus-hub-widget-sdk';

export default defineWidget({
  manifest: {
    type: 'my-widget',
    name: 'My Widget',
    description: 'A custom widget',
    icon: 'puzzle',
    minW: 2, minH: 2, defaultW: 3, defaultH: 2,
    defaultProps: { label: 'Hello' },
  },
  load: () => import('./MyWidget'),
  loadOptions: () => import('./MyWidgetOptions'),  // omit if using optionsSchema
});
```

```tsx
// src/my-widget/MyWidget.tsx
import type { WidgetComponentProps } from '@firstform/campus-hub-widget-sdk';

export default function MyWidget({ config, theme }: WidgetComponentProps) {
  return <div style={{ color: theme.accent }}>{String(config?.label ?? '')}</div>;
}
```

```ts
// src/index.ts — the entry your package.json marker points at
import { registerWidgetModule } from '@firstform/campus-hub-widget-sdk';
import myWidget from './my-widget/meta';

registerWidgetModule(myWidget);
```

Then declare the package so hosts discover it on install:

```json
{ "campusHub": { "widgets": "./src/index.ts" } }
```

### Why the split

The manifest is loaded by every host that reads the widget catalogue — the
editor palette, template validation — on every page load. Keeping components
behind loaders is what stops a board with no bus widget from downloading a
protobuf runtime.

Converting this project's widgets measured the difference, on a host bundle
that reads the catalogue and renders nothing: **1,672,853 bytes → 81,297
bytes** in the entry chunk.

> **Deprecated:** `registerWidget({ ..., component })` still works and existing
> widgets need no change, but it holds the component in the same module as the
> metadata, so anything reading the catalogue downloads the widget too. Don't
> use it for new widgets. `scripts/convert-widget-to-manifest.mjs` in the cloud
> repo converts an existing one.

## Available exports

### Widget registry
- `defineWidget` — declare a widget as manifest + loaders
- `registerWidgetModule` — register that declaration
- `getWidgetManifest`, `getAllWidgetManifests` — metadata only; never loads widget code
- `getWidget`, `getAllWidgets`, `getWidgetComponent` — full definitions, including components
- `getWidgetLoader`, `getWidgetOptionsLoader`, `getAllWidgetLoaders` — the loaders
- `getWidgetRegistrationKind` — `'lazy'` or `'eager'`; lets a host assert its widgets are code-split
- `registerWidget`, `registerWidgetLoader` — deprecated, see above

### Build-time discovery
- `@firstform/campus-hub-widget-sdk/vite` → `campusHubWidgets()` — Vite plugin
  serving `virtual:campus-hub-widgets`, which imports every installed package
  declaring `campusHub.widgets`

### Types
- `WidgetComponentProps` — props for widget components
- `WidgetOptionsProps` — props for widget option panels
- `WidgetManifestEntry`, `WidgetModule` — the current registration shape
- `WidgetDefinition` — the legacy shape
- `IconName` — union of available icon names

### Hooks
- `useFitScale` / `useAdaptiveFitScale` — scale content to fit container
- `useEvents` — fetch and parse calendar events from JSON/iCal/RSS

### Data utilities
- `fetchJsonWithCache` / `fetchTextWithCache` — cached fetch with stale-while-revalidate
- `buildCacheKey`, `buildProxyUrl`, `isEntryFresh`
- `parseICal`, `parseRss` — feed parsers

### Signaling
- `createSignalingClient` — async; the implementation is provided by the host
  engine and resolved on first call. Its types are declared in the SDK, so a
  widget using it still typechecks standalone.

### UI components
- `AppIcon` — icon component using lucide-react
- `FormInput`, `FormSelect`, `FormSwitch`, `FormStepper` — form controls for option panels

### Primitives

Reusable, themed UI building blocks for widget components. All are optional —
widgets can still use raw elements when they need custom behavior. See
[`docs/widget-primitives.md`](../../docs/widget-primitives.md) for full
documentation with examples.
