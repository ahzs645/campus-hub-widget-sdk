import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { campusHubWidgets, discoverWidgetPackages, VIRTUAL_ID } from './discover-widgets';

const roots: string[] = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

/** Build a throwaway host project with the given installed packages. */
function makeHost(
  hostDeps: Record<string, string>,
  installed: Record<string, Record<string, unknown>>,
): string {
  const root = mkdtempSync(path.join(tmpdir(), 'campushub-discover-'));
  roots.push(root);
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'host', dependencies: hostDeps }),
  );

  for (const [name, manifest] of Object.entries(installed)) {
    const dir = path.join(root, 'node_modules', ...name.split('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name, version: '1.0.0', main: 'index.js', ...manifest }),
    );
    writeFileSync(path.join(dir, 'index.js'), 'module.exports = {};');
  }
  return root;
}

describe('discoverWidgetPackages', () => {
  it('finds packages carrying a campusHub marker and ignores the rest', () => {
    const root = makeHost(
      { 'widget-a': '1.0.0', lodash: '1.0.0', 'widget-b': '1.0.0' },
      {
        'widget-a': { campusHub: { widgets: './dist/widgets.js' } },
        lodash: {},
        'widget-b': { campusHub: { widgets: './dist/widgets.js' } },
      },
    );

    expect(discoverWidgetPackages(root).map((p) => p.packageName)).toEqual([
      'widget-a', 'widget-b',
    ]);
  });

  it('turns the marker into a package subpath, not a filesystem path', () => {
    const root = makeHost(
      { 'widget-a': '1.0.0' },
      { 'widget-a': { campusHub: { widgets: './dist/widgets.js' } } },
    );
    // Must stay a bare specifier so the host bundler resolves it through the
    // package's exports map.
    expect(discoverWidgetPackages(root)[0].importSpecifier).toBe('widget-a/dist/widgets.js');
  });

  it('imports the package root when the marker is "."', () => {
    const root = makeHost(
      { 'widget-a': '1.0.0' },
      { 'widget-a': { campusHub: { widgets: '.' } } },
    );
    expect(discoverWidgetPackages(root)[0].importSpecifier).toBe('widget-a');
  });

  it('handles scoped package names', () => {
    const root = makeHost(
      { '@acme/widget-c': '1.0.0' },
      { '@acme/widget-c': { campusHub: { widgets: './dist/widgets.js' } } },
    );
    expect(discoverWidgetPackages(root)[0].importSpecifier)
      .toBe('@acme/widget-c/dist/widgets.js');
  });

  it('honours include and exclude', () => {
    const root = makeHost(
      { 'widget-a': '1.0.0', plain: '1.0.0' },
      { 'widget-a': { campusHub: { widgets: './w.js' } }, plain: {} },
    );

    expect(discoverWidgetPackages(root, { exclude: ['widget-a'] })).toEqual([]);
    expect(discoverWidgetPackages(root, { include: ['plain'] }).map((p) => p.packageName))
      .toEqual(['plain', 'widget-a']);
  });

  it('skips declared-but-not-installed dependencies instead of throwing', () => {
    const root = makeHost({ ghost: '1.0.0', 'widget-a': '1.0.0' }, {
      'widget-a': { campusHub: { widgets: './w.js' } },
    });
    expect(discoverWidgetPackages(root).map((p) => p.packageName)).toEqual(['widget-a']);
  });

  it('finds the marker even when the package restricts its exports map', () => {
    // A package with `exports` that omits ./package.json is the common case
    // that naive require.resolve(name + '/package.json') fails on.
    const root = makeHost(
      { 'widget-strict': '1.0.0' },
      {
        'widget-strict': {
          exports: { '.': './index.js' },
          campusHub: { widgets: './dist/widgets.js' },
        },
      },
    );
    expect(discoverWidgetPackages(root).map((p) => p.packageName)).toEqual(['widget-strict']);
  });

  it('returns nothing for a host with no package.json', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'campushub-empty-'));
    roots.push(root);
    expect(discoverWidgetPackages(root)).toEqual([]);
  });
});

describe('campusHubWidgets plugin', () => {
  const load = (root: string) => {
    const plugin = campusHubWidgets({ rootDir: root, verbose: false });
    const resolved = plugin.resolveId!(VIRTUAL_ID)!;
    return plugin.load!(resolved)!;
  };

  it('generates static side-effect imports so the bundler keeps code-splitting', () => {
    const root = makeHost(
      { 'widget-a': '1.0.0' },
      { 'widget-a': { campusHub: { widgets: './dist/widgets.js' } } },
    );
    const code = load(root);

    expect(code).toContain('import "widget-a/dist/widgets.js";');
    // A dynamic import from a computed string would flatten every widget into
    // one chunk, so assert we never emit one.
    expect(code).not.toContain('import(');
  });

  it('emits a valid empty module when nothing is installed', () => {
    const root = makeHost({}, {});
    const code = load(root);
    expect(code).toContain('discoveredWidgetPackages = []');
  });

  it('ignores ids other than the virtual one', () => {
    const plugin = campusHubWidgets({ rootDir: '/tmp', verbose: false });
    expect(plugin.resolveId!('react')).toBeUndefined();
    expect(plugin.load!('react')).toBeUndefined();
  });
});
