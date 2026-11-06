# Building a Campus Hub widget

A widget is an ordinary npm package. It can live in this organisation's
monorepo or in a repository you own — the contract is the same either way, and
so is the integration step: the host installs your package and your widget
shows up.

There is a second delivery path that skips the host build entirely: compile
your repo to release assets and let a workspace install them by URL at
runtime. Same authoring API, different shipping — see
[authoring-remote-widgets.md](./authoring-remote-widgets.md).

---

## The contract

A widget package must do three things.

**1. Declare itself in `package.json`.**

```json
{
  "name": "campus-hub-widget-tide-clock",
  "campusHub": { "widgets": "./src/index.ts" },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "@firstform/campus-hub-widget-sdk": "^0.1.0"
  },
  "peerDependenciesMeta": {
    "@firstform/campus-hub-widget-sdk": { "optional": true }
  }
}
```

`campusHub.widgets` points at the module that registers your widgets. The host
scans its dependencies for this field, so nothing else is needed to be found.

**2. Register a manifest plus loaders, never a component directly.**

```ts
// src/tide-clock/meta.ts — no component imports, no library imports
import { defineWidget } from '@firstform/campus-hub-widget-sdk';

export default defineWidget({
  manifest: {
    type: 'tide-clock',            // globally unique; prefix it if unsure
    name: 'Tide Clock',
    description: 'Next high and low tide for a station',
    icon: 'droplets',              // an IconName from the SDK
    minW: 2, minH: 2, defaultW: 3, defaultH: 3,
    defaultProps: { stationId: '', units: 'metric' },
  },
  load: () => import('./TideClock'),
  loadOptions: () => import('./TideClockOptions'),   // omit if using optionsSchema
});
```

```ts
// src/index.ts — the entry your marker points at
import { registerWidgetModule } from '@firstform/campus-hub-widget-sdk';
import tideClock from './tide-clock/meta';

registerWidgetModule(tideClock);
```

**3. Keep the manifest module cheap.** It is loaded by every host that reads
the catalogue — the editor palette, template validation — on every page load.
It must not import your component, or any library your component uses.

---

## Demo, live and unavailable states

Displays run unattended in public. A widget must never present made-up data as
if it were real, so every widget that loads data distinguishes three states:

| State | When | Show |
| --- | --- | --- |
| **Demo** | No source is configured | Built-in sample data, always with a visible "Demo" badge |
| **Live** | A configured source has loaded | That source's data. Keep it as last-good data, keyed by the source, so a failed refresh leaves it on screen (with your error line or "Updated" time) and a config change never shows the previous source's data |
| **Unavailable** | A configured source failed and there is no last-good data | `SourceUnavailable` from `@firstform/campus-hub-widgets-shared` (or an equivalent empty state) — **never** the demo data |

A configured source starts in a loading state, not with demo data. An empty
live result ("no events today") is live data, not a reason to fall back to the
demo set. `useEventsState` implements this contract for calendar feeds and
returns `isDemo`, `loading`, `error` and `lastUpdated`; `fetchJsonWithCache`
reports `stale: true` when it served an expired entry after a failed request.

---

## Shared Sources workflow

Live provider endpoints belong in the host's **Sources** library and source
store. A widget's `defaultProps`, component defaults and gallery presets must
contain only presentation settings and local sample data. Do not silently
choose a real campus, feed, station, API key or location that starts requests.

Declare `acceptsSources` in the manifest. The editor shows saved compatible
sources even when the list is empty, with **Browse source store** and **Add
source** actions supplied by the host. The same flow is available inside
container widgets such as Widget Stack. `matchSource` narrows a provider-specific
adapter; `requires` describes known content requirements. A source whose known
capabilities do not meet a requirement cannot be linked. A source that has not
been probed yet can be selected and assessed normally.

```ts
acceptsSources: [{
  propName: 'feedUrl',
  types: ['feed', 'api'],
  requires: { hasImages: true },
  applySource: (source) => ({ feedUrl: source.url, mode: 'feed' }),
  removeSource: () => ({ mode: 'sample' }),
}]
```

The host wraps the editor in `SourcePickerProvider value={openSourcePicker}`.
Its callback receives a `SourcePickRequest` with `widgetType`, `bindings`, an
optional `initialTab` (`library`, `store`, or `create`) and `onSelect`. It opens
the shared Sources interface and calls `onSelect(savedSource)` only after the
source is saved or imported. Cancelling calls no selection callback and keeps
the widget draft intact. The host continues to enforce normal workspace and
source permissions. Plugins can use `useSourcePicker()` when they need to open
this same interface from their own options; it returns `null` in a standalone
host that has no source library.

Use `matchSourceToBindings`, `applySourceBinding` and `removeSourceBinding` in
host surfaces so compatibility and linking follow one contract. Unlinking
removes both the saved reference and its copied endpoint, then applies the
widget's optional `removeSource` reset. Switching sources retains unrelated
presentation settings and runs the selected binding's `applySource` mapping.
Existing explicitly configured URLs continue to work; selecting a saved source
is what converts that widget to a managed source link.

For a collection, set `multiple: true` and `itemUrlProp` (default `url`). A
custom `applySource` must upsert an item with `id: source._id` into its array;
the default mapping produces `{ id, url }` items. The editor stores every
managed item in `__sourceRefs: [{ sourceId, propName, itemId, urlProp }]`, with
`__sourceRef` retained as the active/latest alias. This lets a source URL change
update one slide or poster after reordering. `getSourceReferences` reads both
forms and ignores references to removed items. Unlinking one source removes
only its managed item and keeps other saved sources and manually authored
items. Collection options editors must preserve each item's stable `id`.

## Sample previews

Options and gallery previews show local fake data. The engine calls
`buildWidgetPreviewProps(manifest, data)` and wraps the widget in
`WidgetPreviewProvider`. The helper preserves presentation settings, removes
saved source references, binding inputs and remote URLs, and recursively
handles child widget configurations. It does not mutate the saved widget.
Optional manifest `previewProps` can supply fake records or select a sample
mode; keep all sample images inline or bundled locally.

Widgets that construct requests from non-URL settings must also use
`useWidgetPreview()` to skip polling, media playback, subscriptions and other
connections. For example, a weather widget must not construct a live URL from
coordinates while in sample mode. `useEventsState` already respects this
context. Normal display rendering and the configured editor canvas keep using
their selected sources. A failed configured source still shows last-good data
or an unavailable state, never invented measurements.

These preview helpers do not sandbox arbitrary plugin code. Plugins are
responsible for making their sample path free of network requests. External
embed/audio/video widgets use the engine's static preview card until they have
an explicit local sample representation.

---

## Host-managed source references

For a widget that reads normalized data from the host, an `acceptsSources`
binding can set `mode: 'reference'`. The editor then stores
`__sourceRef: { sourceId, propName, mode: 'reference' }` without copying the
provider URL into props. `propName` remains the binding's stable identifier.
Use `applySource` for other safe configuration defaults. The host must authorize
the source ID and return only the fields the widget needs; a source reference
does not itself grant access. Omit `mode` for existing URL-based bindings.

## Why the split matters

`registerWidget` (the old API) takes the metadata and the component in one
object. That means anything reading the metadata also pulls in the component
and everything it imports.

Converting one widget in this repo measured the difference. A host bundle that
only reads the catalogue and renders nothing:

| | entry chunk |
|---|---|
| before, `registerWidget` | 591.32 kB |
| after, `registerWidgetModule` | **16.68 kB** |

The 566 kB of protobuf runtime, zip decoder, bitmap font and LED renderer moved
into a chunk that downloads only when a board actually places that widget. With
one widget it is a nice saving. With fifty, it is the difference between a TV
that boots and one that does not.

`registerWidget` still works and existing widgets need no change — but new
widgets should not use it.

---

## Where dependencies go

| Kind | Where | Why |
|---|---|---|
| `react`, `lucide-react`, the SDK | `peerDependencies` (SDK also `peerDependenciesMeta.optional`) | The host supplies one copy. A second React breaks hooks. |
| Libraries only your widget uses (`chart.js`, `qrcode`, …) | `dependencies` | One declaration site, hoisted by the host's installer. |
| Anything large used on one code path | `dependencies` **+ `await import()` inside the component** | Keeps it out of your widget's own chunk until the path runs. |

Do **not** re-declare a dependency in a parent or host manifest. Two
declarations with different ranges make the installer produce two copies, and
the nested one wins for your package — the change you thought you shipped
silently does not run.

The SDK is self-contained: it has no runtime or type dependency on the host
engine, so your package installs, typechecks and builds with the SDK alone.
The one exception is `createSignalingClient`, whose implementation the host
provides: the host engine calls `registerSignalingImplementation` when it
loads, and `createSignalingClient` rejects with a clear error outside a Campus
Hub host. Its types come from the SDK, so it still typechecks standalone.

Widget `type`s share one registry. The last `registerWidgetModule` call for a
type wins; replacing a type with a different loader logs a warning unless the
caller passes `{ replace: true }`, which hosts use for deliberate overrides.

---

## Local development against a host

The SDK is a peer dependency: your package never installs its own copy. To work
against a real host, link your package into it.

```bash
# in your widget repo
npm link

# in the host app
npm link campus-hub-widget-tide-clock
npm run dev
```

The host's Vite plugin picks it up on the next start. To go the other way and
develop against unpublished SDK changes, `npm link` the SDK into your widget
repo too.

**Do not run `npm install` inside a checked-out submodule of the host.** It
creates a nested `node_modules` that shadows the host's copies for your package
only, which produces failures that look impossible — the host has one version
installed, your code sees another.

---

## Shipping

Any specifier npm understands works, because discovery keys off the installed
package, not where it came from:

```jsonc
// registry
"campus-hub-widget-tide-clock": "^1.2.0"

// a git repo, pinned to a commit so installs stay reproducible
"campus-hub-widget-tide-clock": "git+https://github.com/you/tide-clock.git#<sha>"
```

If you ship from git and your `main`/`types` point into a build directory that
is gitignored, add `"prepare": "npm run build"`. npm runs `prepare` for git
installs; it does **not** run `prepublishOnly`. Without it the installed
package is empty.

---

## Checklist

- [ ] `campusHub.widgets` in `package.json`
- [ ] Manifest module imports no components and no libraries
- [ ] `type` is unique across every widget the host might install
- [ ] React and the SDK are peer dependencies, not dependencies
- [ ] Widget-specific libraries are dependencies of *this* package only
- [ ] `prepare` script if shipping from git with a gitignored build directory
- [ ] Renders correctly at its `minW`/`minH` — boards are laid out on a 12×8 grid
- [ ] No network calls without a timeout; displays run unattended for months
- [ ] Demo data only when unconfigured, with a Demo badge; a configured source that fails shows last-good data or `SourceUnavailable`
- [ ] Live endpoints are saved sources, never widget defaults or sample presets
- [ ] `acceptsSources` describes every supported source input; provider mappings and unlink resets are declared together
- [ ] Sample previews skip requests, media playback and subscriptions, including nested children

