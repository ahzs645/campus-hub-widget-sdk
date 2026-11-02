/**
 * Host-side runtime for remote widget bundles.
 *
 * A remote widget bundle (see remote-widget-manifest.ts) is an IIFE compiled
 * with react and this SDK left external, mapped to expressions on a window
 * global. This module provides that global — sharing the host's react
 * instance and its live registry singleton — and loads bundles by script
 * injection. A loaded bundle runs `registerWidgetModule(...)` exactly like a
 * first-party widget package; from the registry's point of view the two are
 * indistinguishable.
 *
 * Trust model: a remote bundle executes in the host page with full DOM
 * access, exactly like discovered widget packages (ADR-14). Installing one is
 * an operator-level trust decision; nothing here sandboxes it.
 */
import * as react from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as reactDom from 'react-dom';
import {
  REMOTE_WIDGET_RUNTIME_GLOBAL,
  REMOTE_WIDGET_RUNTIME_VERSION,
} from './remote-widget-manifest';
import { getAllWidgetManifests } from './widget-registry';

// The whole SDK, handed to bundles as their `@firstform/campus-hub-widget-sdk`
// import. A namespace import of our own barrel is a cycle, but a benign one:
// it is only dereferenced inside installRemoteWidgetRuntime(), long after both
// modules have finished evaluating.
import * as sdk from '../index';

export interface RemoteWidgetRuntime {
  /** {@link REMOTE_WIDGET_RUNTIME_VERSION} this host provides. */
  version: number;
  react: typeof react;
  jsxRuntime: typeof jsxRuntime;
  reactDom: typeof reactDom;
  /** The host's live SDK module — including its registry singleton. */
  sdk: typeof sdk;
}

/**
 * Install the window global remote bundles resolve their externals against.
 * Idempotent; browser-only (callers on the server must defer to an effect).
 */
export function installRemoteWidgetRuntime(): RemoteWidgetRuntime {
  if (typeof window === 'undefined') {
    throw new Error('installRemoteWidgetRuntime is browser-only — call it from an effect');
  }
  const holder = window as unknown as Record<string, RemoteWidgetRuntime | undefined>;
  const existing = holder[REMOTE_WIDGET_RUNTIME_GLOBAL];
  if (existing) return existing;
  const runtime: RemoteWidgetRuntime = {
    version: REMOTE_WIDGET_RUNTIME_VERSION,
    react,
    jsxRuntime,
    reactDom,
    sdk,
  };
  holder[REMOTE_WIDGET_RUNTIME_GLOBAL] = runtime;
  return runtime;
}

export interface LoadRemoteWidgetBundleOptions {
  /** URL of the stored widget.js bundle. */
  url: string;
  /**
   * Load-once key. Defaults to the URL; pass something content-addressed
   * (e.g. `${id}@${bundleHash}`) when URLs are unstable, so re-renders and
   * signed-URL rotation don't reload an already-registered bundle.
   */
  key?: string;
}

const loadedBundles = new Map<string, Promise<string[]>>();

/**
 * Load a remote widget bundle by script injection, installing the runtime
 * global first. Resolves with the widget types the bundle registered — new
 * types and types it replaced. Loading is deduplicated by `key`; a failed load
 * is forgotten so it can be retried. The last registration of a type wins
 * (see `registerWidgetModule`), so an upgraded bundle loaded within one
 * session replaces the earlier version, like the reload that normally follows.
 */
export function loadRemoteWidgetBundle(
  options: LoadRemoteWidgetBundleOptions,
): Promise<string[]> {
  const key = options.key ?? options.url;
  const pending = loadedBundles.get(key);
  if (pending) return pending;

  const load = new Promise<string[]>((resolve, reject) => {
    installRemoteWidgetRuntime();
    const before = new Map(getAllWidgetManifests().map((m) => [m.type, m]));

    const script = document.createElement('script');
    script.src = options.url;
    script.async = true;
    script.onload = () => {
      script.remove();
      // A type counts as registered by this bundle when it is new, or when its
      // manifest object changed (the bundle replaced it, e.g. an upgrade).
      const registered: string[] = [];
      for (const manifest of getAllWidgetManifests()) {
        if (before.get(manifest.type) !== manifest) registered.push(manifest.type);
      }
      if (registered.length === 0) {
        console.warn(
          `Remote widget bundle registered no widget types (not a widget bundle?): ${options.url}`,
        );
      }
      resolve(registered);
    };
    script.onerror = () => {
      script.remove();
      loadedBundles.delete(key);
      reject(new Error(`Failed to load remote widget bundle: ${options.url}`));
    };
    document.head.appendChild(script);
  });

  loadedBundles.set(key, load);
  return load;
}
