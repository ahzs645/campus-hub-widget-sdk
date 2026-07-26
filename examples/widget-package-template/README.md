# campus-hub-widget-hello

Starter template for a Campus Hub widget that lives in its own repository.

Copy this directory, rename the package, and replace `hello-campus` with your
widget. The full contract is in
[`docs/authoring-widgets.md`](../../docs/authoring-widgets.md).

## What to look at

- `package.json` — the `campusHub.widgets` marker is what makes the host find
  this package. React and the SDK are peer dependencies so the host provides
  one copy of each.
- `src/hello-campus/meta.ts` — metadata and loaders. Imports no components and
  no libraries, so a host can read it without downloading the widget.
- `src/hello-campus/HelloCampus.tsx` — the component, reached only through
  `load()`.

## Hooking it up

```bash
npm link                                   # in this repo
npm link campus-hub-widget-hello           # in the host app
```

Restart the host's dev server. No edit to any registration file in the host.
