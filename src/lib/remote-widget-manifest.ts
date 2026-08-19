/**
 * The remote widget release format.
 *
 * A remote widget is a widget compiled *outside* the host — typically by
 * GitHub Actions in the author's own repository — into two release assets:
 *
 *   manifest.json   this file's {@link RemoteWidgetManifest} shape
 *   widget.js       an IIFE bundle with react and the SDK left external
 *
 * The host installs it at runtime: an operator points their workspace at the
 * manifest URL, the backend fetches and stores both files, and displays load
 * the stored bundle through {@link loadRemoteWidgetBundle}. Nothing about the
 * widget is known at the host's build time — that is the difference from the
 * `campusHub.widgets` package marker, which is resolved by the host's bundler.
 *
 * This module is dependency-free on purpose: the backend that validates a
 * fetched manifest and the Vite helper that emits one both import it, and
 * neither can afford to drag react (or the rest of the SDK) along.
 */

/**
 * Version of the *release format* — the manifest shape and the two-asset
 * layout. Bump only on incompatible changes to either.
 */
export const REMOTE_WIDGET_FORMAT_VERSION = 1;

/**
 * Version of the *host runtime contract* — the global object a bundle's
 * externals resolve against (see {@link REMOTE_WIDGET_EXTERNALS}). A manifest
 * declares the version it was built against in `runtime`; a host refuses
 * bundles built against a newer contract than it provides.
 */
export const REMOTE_WIDGET_RUNTIME_VERSION = 1;

/**
 * Name of the window global the host installs before loading a bundle. Holds
 * the shared react instance and the host's live SDK module, so a bundle joins
 * the host's registry and React tree instead of shipping its own.
 */
export const REMOTE_WIDGET_RUNTIME_GLOBAL = 'CampusHubWidgetRuntime';

/**
 * Import specifiers a remote widget bundle must leave external, and the
 * global-scope expression each one resolves to at runtime. Passed verbatim to
 * Rollup's `output.globals` by the build helper; provided on `window` by
 * `installRemoteWidgetRuntime()` in the host.
 */
export const REMOTE_WIDGET_EXTERNALS: Readonly<Record<string, string>> = {
  react: `${REMOTE_WIDGET_RUNTIME_GLOBAL}.react`,
  'react/jsx-runtime': `${REMOTE_WIDGET_RUNTIME_GLOBAL}.jsxRuntime`,
  'react-dom': `${REMOTE_WIDGET_RUNTIME_GLOBAL}.reactDom`,
  '@firstform/campus-hub-widget-sdk': `${REMOTE_WIDGET_RUNTIME_GLOBAL}.sdk`,
};

/** `manifest.json` — the release asset describing a remote widget bundle. */
export interface RemoteWidgetManifest {
  /** {@link REMOTE_WIDGET_FORMAT_VERSION} the release was produced under. */
  formatVersion: number;
  /**
   * Stable identifier for the widget package, unique within a workspace.
   * Lowercase letters, digits and hyphens; starts with a letter or digit.
   * Reinstalling a manifest with the same id upgrades in place.
   */
  id: string;
  /** Human-readable name shown in the installed-widgets list. */
  name: string;
  /** Release version, normally the repo's package.json version. */
  version: string;
  /** Registry `type` strings the bundle registers. Shown before install. */
  widgetTypes: string[];
  /** Bundle filename, resolved relative to the manifest's own URL. */
  bundle: string;
  /** {@link REMOTE_WIDGET_RUNTIME_VERSION} the bundle was built against. */
  runtime: number;
  description?: string;
  author?: string;
  /** Project page, normally the source repository. */
  homepage?: string;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TYPE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Validate an untrusted parsed `manifest.json`. Returns the typed manifest,
 * or the first problem found — phrased for an operator reading an install
 * error, not for a stack trace.
 */
export function validateRemoteWidgetManifest(
  raw: unknown,
): { manifest: RemoteWidgetManifest; error?: undefined } | { manifest?: undefined; error: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { error: 'manifest.json must be a JSON object' };
  }
  const m = raw as Record<string, unknown>;

  if (m.formatVersion !== REMOTE_WIDGET_FORMAT_VERSION) {
    return {
      error: `Unsupported formatVersion ${JSON.stringify(m.formatVersion)} — this host supports ${REMOTE_WIDGET_FORMAT_VERSION}`,
    };
  }
  if (typeof m.id !== 'string' || !ID_PATTERN.test(m.id)) {
    return { error: '"id" must be 1-64 lowercase letters, digits or hyphens' };
  }
  if (typeof m.name !== 'string' || m.name.trim() === '' || m.name.length > 100) {
    return { error: '"name" must be a non-empty string of at most 100 characters' };
  }
  if (typeof m.version !== 'string' || m.version.trim() === '' || m.version.length > 50) {
    return { error: '"version" must be a non-empty string' };
  }
  if (
    !Array.isArray(m.widgetTypes) ||
    m.widgetTypes.length === 0 ||
    !m.widgetTypes.every((t): t is string => typeof t === 'string' && TYPE_PATTERN.test(t))
  ) {
    return {
      error: '"widgetTypes" must list at least one type of lowercase letters, digits or hyphens',
    };
  }
  if (
    typeof m.bundle !== 'string' ||
    !/^[\w][\w.-]*\.js$/.test(m.bundle)
  ) {
    return { error: '"bundle" must be a plain .js filename next to the manifest' };
  }
  if (typeof m.runtime !== 'number' || !Number.isInteger(m.runtime) || m.runtime < 1) {
    return { error: '"runtime" must be a positive integer' };
  }
  if (m.runtime > REMOTE_WIDGET_RUNTIME_VERSION) {
    return {
      error: `Bundle requires host runtime ${m.runtime}, but this host provides ${REMOTE_WIDGET_RUNTIME_VERSION} — update the host or build against an older SDK`,
    };
  }
  for (const key of ['description', 'author', 'homepage'] as const) {
    if (m[key] !== undefined && typeof m[key] !== 'string') {
      return { error: `"${key}" must be a string when present` };
    }
  }

  return {
    manifest: {
      formatVersion: REMOTE_WIDGET_FORMAT_VERSION,
      id: m.id,
      name: m.name.trim(),
      version: m.version.trim(),
      widgetTypes: m.widgetTypes,
      bundle: m.bundle,
      runtime: m.runtime,
      description: typeof m.description === 'string' ? m.description : undefined,
      author: typeof m.author === 'string' ? m.author : undefined,
      homepage: typeof m.homepage === 'string' ? m.homepage : undefined,
    },
  };
}
