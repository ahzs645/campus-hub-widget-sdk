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
    icon: 'waves',
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
provides — it resolves at runtime and throws a clear error outside a Campus
Hub host. Its types come from the SDK, so it still typechecks standalone.

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
