# Shipping a widget as a remote bundle

The [package contract](./authoring-widgets.md) makes a widget an npm dependency:
the host installs it, its bundler discovers it, and it ships inside the host's
own build. That is the right default — but it means every new widget needs a
host rebuild and redeploy.

A **remote widget** removes the host from the loop. Your repository builds two
release assets:

```
manifest.json   what the widget is — id, name, version, widget types
widget.js       the code — one IIFE with react and the SDK left external
```

A workspace operator pastes your release URL into their settings, the backend
fetches and stores both files in the workspace, and every display and editor in
that workspace loads the stored bundle at runtime. GitHub Actions builds it;
`npm i` never happens; the host's deploy pipeline is not involved.

Everything else is unchanged: you still write `defineWidget` +
`registerWidgetModule`, the same manifest fields, the same `optionsSchema` or
options component, the same primitives and hooks. At runtime your bundle's
`import { … } from '@firstform/campus-hub-widget-sdk'` resolves to the host's
*live* SDK — same registry singleton, same React — so a remote widget is
indistinguishable from a first-party one once registered.

## Which contract do I want?

| | npm package | remote bundle |
|---|---|---|
| Integration step | host adds a dependency, rebuilds | operator pastes a URL |
| Ships new versions | with the host's deploys | with your releases, per workspace |
| Code splitting | host's bundler, per widget | one file, loaded per workspace |
| Styling | host Tailwind available | **inline styles only** |
| Trust required | host developer | workspace admin |

Both run unsandboxed in the host page. A remote widget is remote in delivery,
not in privilege — operators must only install sources they trust.

## The build

The SDK ships the whole Vite config. Your `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { remoteWidgetBuild } from '@firstform/campus-hub-widget-sdk/vite-remote';

export default defineConfig(remoteWidgetBuild({
  entry: 'src/index.ts',
  manifest: {
    id: 'authorclock',                 // stable; reinstalls with the same id upgrade in place
    name: 'Author Clock',
    widgetTypes: ['authorclock'],      // every type your entry registers
    description: 'A literary clock.',
    homepage: 'https://github.com/you/authorclock',
    // version defaults to your package.json version
  },
}));
```

`vite build` emits `dist/widget.js` and `dist/manifest.json`. The helper leaves
`react`, `react/jsx-runtime`, `react-dom` and the SDK external, mapped to a
window global (`CampusHubWidgetRuntime`) the host installs before loading your
bundle — see `remote-widget-manifest.ts` for the exact contract and its
version. It also pins `process.env.NODE_ENV` to production: the host shares its
production React, so a dev-mode bundle (which calls `jsxDEV`) cannot run.

Dependency placement changes from the package contract: with no host installer
in the picture, *everything* your widget uses beyond react and the SDK gets
**bundled into widget.js**. Declare react, react-dom and the SDK as
`devDependencies` (they are compile-time only), and anything else as regular
`dependencies` — Rollup inlines them.

## Constraints that differ from package widgets

- **Inline styles only.** The host compiles Tailwind over code it can see at
  build time; your classes won't be in its CSS. SDK primitives are fine — their
  classes ship with the host.
- **One file.** Dynamic `import()` works but is inlined, so `load:` still
  defers *evaluation*, not download. Keep bundles lean; a display fetches the
  whole file before your widget first renders.
- **No `react-dom/client`.** The host owns the React root. Portals via
  `react-dom` are available.
- **`type` collisions are refused at install time** within a workspace, and
  first registration wins warnings in the console — prefix your types if the
  name is generic.

## Releasing from GitHub Actions

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*']
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            dist/widget.js
            dist/manifest.json
```

Tag `v0.2.0`, push the tag, and the release assets appear at a stable URL:

```
https://github.com/<owner>/<repo>/releases/latest/download/manifest.json
```

That URL — or just `<owner>/<repo>` — is what an operator installs from
(Settings → Workspace → Installed widgets). The backend stores your files in
the workspace at install time, so displays keep working if your repo later
disappears; "Update" refetches from the same URL.

## Testing the bundle like the host loads it

Because the runtime contract is one window global, an integration test needs no
host checkout:

```ts
import * as react from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as reactDom from 'react-dom';
import * as sdk from '@firstform/campus-hub-widget-sdk';

(globalThis as Record<string, unknown>).CampusHubWidgetRuntime =
  { version: 1, react, jsxRuntime, reactDom, sdk };
new Function(readFileSync('dist/widget.js', 'utf8'))();

expect(sdk.getWidgetManifest('authorclock')).toBeDefined();
```

Then load and render the component with your test renderer of choice. The
first remote widget, [authorclock](https://github.com/ahzs645/authorclock),
does exactly this and is the working reference for the whole setup.

## Checklist

- [ ] `remoteWidgetBuild` is the vite config; `manifest.widgetTypes` lists every registered type
- [ ] react, react-dom, SDK in `devDependencies`; everything else bundles
- [ ] Inline styles only — no Tailwind classes of your own
- [ ] Component parses `config` defensively; renders sensibly with `{}` and at `minW`×`minH`
- [ ] Bundle test proves registration through the runtime global
- [ ] Release workflow publishes `widget.js` + `manifest.json` on tags
- [ ] No network calls without a timeout; displays run unattended for months
