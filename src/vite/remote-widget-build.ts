/**
 * Vite configuration for building a *remote* widget bundle — the release
 * format installed at runtime, as opposed to the `campusHub.widgets` package
 * marker resolved by the host's bundler (see ./discover-widgets.ts).
 *
 * A widget repository's whole vite.config.ts is typically:
 *
 * ```ts
 * import { defineConfig } from 'vite';
 * import { remoteWidgetBuild } from '@firstform/campus-hub-widget-sdk/vite-remote';
 *
 * export default defineConfig(remoteWidgetBuild({
 *   entry: 'src/index.ts',
 *   manifest: {
 *     id: 'authorclock',
 *     name: 'Author Clock',
 *     widgetTypes: ['authorclock'],
 *   },
 * }));
 * ```
 *
 * `vite build` then emits `dist/widget.js` (an IIFE with react and the SDK
 * external, resolved from the host's runtime global) and `dist/manifest.json`
 * — the two files a GitHub Actions release publishes and a host installs.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  REMOTE_WIDGET_EXTERNALS,
  REMOTE_WIDGET_FORMAT_VERSION,
  REMOTE_WIDGET_RUNTIME_VERSION,
  validateRemoteWidgetManifest,
  type RemoteWidgetManifest,
} from '../lib/remote-widget-manifest';

export const REMOTE_WIDGET_BUNDLE_FILENAME = 'widget.js';
export const REMOTE_WIDGET_MANIFEST_FILENAME = 'manifest.json';

export interface RemoteWidgetBuildOptions {
  /** Widget entry module — imports the SDK and registers widget modules. */
  entry: string;
  /** Manifest fields. `version` defaults to the repo's package.json version. */
  manifest: Pick<RemoteWidgetManifest, 'id' | 'name' | 'widgetTypes'> &
    Partial<Pick<RemoteWidgetManifest, 'version' | 'description' | 'author' | 'homepage'>>;
  /** Directory holding the widget repo's package.json. Defaults to cwd. */
  rootDir?: string;
  /** Output directory. Defaults to 'dist'. */
  outDir?: string;
}

/** Minimal shapes of the Vite config, typed locally so the SDK need not depend on Vite. */
interface VitePluginLike {
  name: string;
  generateBundle: (
    this: { emitFile: (file: { type: 'asset'; fileName: string; source: string }) => unknown },
  ) => void;
}

interface RemoteWidgetViteConfigLike {
  define: Record<string, string>;
  build: {
    outDir: string;
    emptyOutDir: boolean;
    lib: {
      entry: string;
      formats: ['iife'];
      name: string;
      fileName: () => string;
    };
    rollupOptions: {
      external: string[];
      output: {
        globals: Record<string, string>;
        inlineDynamicImports: boolean;
      };
    };
  };
  plugins: VitePluginLike[];
}

/**
 * Build the manifest a release publishes, resolving `version` from the repo's
 * package.json when not given. Throws on an invalid result so a bad id or
 * type list fails the build, not the eventual install.
 */
export function buildRemoteWidgetManifest(
  options: RemoteWidgetBuildOptions,
): RemoteWidgetManifest {
  let version = options.manifest.version;
  if (!version) {
    const packageJsonPath = path.join(options.rootDir ?? process.cwd(), 'package.json');
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: unknown };
    if (typeof parsed.version !== 'string' || parsed.version === '') {
      throw new Error(
        `remoteWidgetBuild: no manifest.version given and no version in ${packageJsonPath}`,
      );
    }
    version = parsed.version;
  }

  const result = validateRemoteWidgetManifest({
    formatVersion: REMOTE_WIDGET_FORMAT_VERSION,
    runtime: REMOTE_WIDGET_RUNTIME_VERSION,
    bundle: REMOTE_WIDGET_BUNDLE_FILENAME,
    ...options.manifest,
    version,
  });
  if (result.manifest === undefined) {
    throw new Error(`remoteWidgetBuild: invalid manifest — ${result.error}`);
  }
  return result.manifest;
}

/** Vite config for a remote widget repository. Pass to `defineConfig`. */
export function remoteWidgetBuild(options: RemoteWidgetBuildOptions): RemoteWidgetViteConfigLike {
  const manifest = buildRemoteWidgetManifest(options);

  return {
    // Bundles are always production builds: the runtime global provides the
    // production react, so a dev-mode bundle would crash resolving jsxDEV.
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: options.outDir ?? 'dist',
      emptyOutDir: true,
      lib: {
        entry: options.entry,
        formats: ['iife'],
        // Registration happens via SDK side effects; the IIFE's own export
        // object is unused, but Rollup requires it to have a name.
        name: '__campusHubRemoteWidget',
        fileName: () => REMOTE_WIDGET_BUNDLE_FILENAME,
      },
      rollupOptions: {
        external: [...Object.keys(REMOTE_WIDGET_EXTERNALS)],
        output: {
          globals: { ...REMOTE_WIDGET_EXTERNALS },
          inlineDynamicImports: true,
        },
      },
    },
    plugins: [
      {
        name: 'campus-hub:remote-widget-manifest',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: REMOTE_WIDGET_MANIFEST_FILENAME,
            source: JSON.stringify(manifest, null, 2) + '\n',
          });
        },
      },
    ],
  };
}

export default remoteWidgetBuild;
