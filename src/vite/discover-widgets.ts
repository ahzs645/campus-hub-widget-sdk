/**
 * Build-time discovery of Campus Hub widget packages.
 *
 * A widget package opts in from its own package.json:
 *
 * ```json
 * { "name": "campus-hub-widget-tide-clock",
 *   "campusHub": { "widgets": "./dist/widgets.js" } }
 * ```
 *
 * The host installs it and gets it — no edit to a central registration file,
 * no PR against this repo. That is the whole point: a third party can ship a
 * widget from their own repo and `npm i` is the integration step.
 *
 * This plugin walks the host's direct dependencies, keeps the ones carrying
 * that marker, and generates a virtual module that imports each one's entry
 * for side effects. The host imports it once:
 *
 * ```ts
 * import 'virtual:campus-hub-widgets';
 * ```
 *
 * Discovery is deliberately build-time rather than runtime. The generated
 * module is a static list of imports, so the bundler still sees every edge of
 * the graph and can code-split normally — a runtime `import(packageName)` from
 * a dynamic string would defeat that and drag every widget into one chunk.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const VIRTUAL_ID = 'virtual:campus-hub-widgets';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

/** Shape of the `campusHub` block a widget package declares. */
export interface CampusHubPackageMarker {
  /**
   * Module that registers the package's widgets when imported. Relative to the
   * package root, or a subpath the package `exports`.
   */
  widgets: string;
}

export interface DiscoverWidgetsOptions {
  /** Directory holding the host package.json. Defaults to the Vite root. */
  rootDir?: string;
  /**
   * Extra package names to include even without a marker. Useful for
   * first-party packages mid-migration.
   */
  include?: string[];
  /** Package names to skip even if they carry a marker. */
  exclude?: string[];
  /** Log what was discovered. Defaults to true. */
  verbose?: boolean;
}

interface DiscoveredWidgetPackage {
  packageName: string;
  /** The specifier the generated module imports. */
  importSpecifier: string;
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolve a dependency's package.json without importing the package.
 *
 * `require.resolve` on the package name itself runs the `exports` map, which
 * frequently does not expose `./package.json`, so resolve a known-exported
 * entry and walk up to the manifest instead.
 */
function findPackageJson(packageName: string, fromDir: string): string | null {
  const req = createRequire(path.join(fromDir, 'noop.js'));
  try {
    return req.resolve(`${packageName}/package.json`);
  } catch {
    // Fall through — the package likely restricts its exports map.
  }
  try {
    let dir = path.dirname(req.resolve(packageName));
    const segments = packageName.split('/');
    const dirName = segments[segments.length - 1];
    for (let i = 0; i < 8; i += 1) {
      const candidate = path.join(dir, 'package.json');
      const manifest = readJson(candidate);
      if (manifest && typeof manifest.name === 'string') return candidate;
      // Stop climbing once we leave the package directory.
      if (path.basename(dir) === dirName && i > 0) break;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // Unresolvable (optional peer, wrong platform, not installed) — skip it.
  }
  return null;
}

/**
 * Find installed packages that declare Campus Hub widgets.
 *
 * Exported separately from the plugin so the CI guardrail and tests can call
 * it without standing up Vite.
 */
export function discoverWidgetPackages(
  rootDir: string,
  options: Pick<DiscoverWidgetsOptions, 'include' | 'exclude'> = {},
): DiscoveredWidgetPackage[] {
  const hostManifest = readJson(path.join(rootDir, 'package.json'));
  if (!hostManifest) return [];

  const exclude = new Set(options.exclude ?? []);
  const candidates = new Set<string>([
    ...Object.keys((hostManifest.dependencies as Record<string, string>) ?? {}),
    ...Object.keys((hostManifest.devDependencies as Record<string, string>) ?? {}),
    ...(options.include ?? []),
  ]);

  const found: DiscoveredWidgetPackage[] = [];
  for (const packageName of [...candidates].sort()) {
    if (exclude.has(packageName)) continue;

    const manifestPath = findPackageJson(packageName, rootDir);
    if (!manifestPath) continue;
    const manifest = readJson(manifestPath);
    if (!manifest) continue;

    const marker = manifest.campusHub as CampusHubPackageMarker | undefined;
    const forced = options.include?.includes(packageName);
    if (!marker?.widgets && !forced) continue;

    // A marker path is a subpath of the package, not a filesystem path, so the
    // host's bundler resolves it through the package's own exports map.
    const entry = marker?.widgets;
    const importSpecifier = entry && entry !== '.'
      ? `${packageName}/${entry.replace(/^\.\//, '')}`
      : packageName;

    found.push({ packageName, importSpecifier });
  }

  return found;
}

function generateModule(packages: DiscoveredWidgetPackage[]): string {
  if (packages.length === 0) {
    return '// No Campus Hub widget packages discovered.\nexport const discoveredWidgetPackages = [];\n';
  }
  const imports = packages
    .map((pkg) => `import ${JSON.stringify(pkg.importSpecifier)};`)
    .join('\n');
  const names = packages.map((pkg) => JSON.stringify(pkg.packageName)).join(', ');
  return `${imports}\n\nexport const discoveredWidgetPackages = [${names}];\n`;
}

/** Minimal shape of the Vite plugin, typed locally so the SDK need not depend on Vite. */
interface VitePluginLike {
  name: string;
  enforce?: 'pre' | 'post';
  configResolved?: (config: { root: string }) => void;
  resolveId?: (id: string) => string | undefined;
  load?: (id: string) => string | undefined;
}

/**
 * Vite plugin providing `virtual:campus-hub-widgets`.
 *
 * ```ts
 * import { campusHubWidgets } from '@firstform/campus-hub-widget-sdk/vite';
 * export default defineConfig({ plugins: [campusHubWidgets()] });
 * ```
 */
export function campusHubWidgets(options: DiscoverWidgetsOptions = {}): VitePluginLike {
  let rootDir = options.rootDir ?? process.cwd();

  return {
    name: 'campus-hub:discover-widgets',
    enforce: 'pre',
    configResolved(config) {
      if (!options.rootDir) rootDir = config.root;
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return undefined;
      const packages = discoverWidgetPackages(rootDir, options);
      if (options.verbose !== false) {
        const summary = packages.length
          ? packages.map((p) => p.packageName).join(', ')
          : '(none)';
        console.log(`[campus-hub] widget packages discovered: ${summary}`);
      }
      return generateModule(packages);
    },
  };
}

export default campusHubWidgets;
