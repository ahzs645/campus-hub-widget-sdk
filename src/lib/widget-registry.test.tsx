import type { ComponentType } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  defineWidget,
  getAllWidgetManifests,
  getAllWidgets,
  getWidget,
  getWidgetComponent,
  getWidgetLoader,
  getWidgetManifest,
  getWidgetOptionsLoader,
  registerWidget,
  registerWidgetModule,
  type WidgetComponentProps,
  type WidgetManifestEntry,
} from './widget-registry';

const theme = { primary: '#122738', accent: '#f85c14', background: '#0a1620' };

function manifest(type: string, over: Partial<WidgetManifestEntry> = {}): WidgetManifestEntry {
  return {
    type,
    name: `Widget ${type}`,
    description: 'test widget',
    icon: 'clock',
    minW: 1, minH: 1, defaultW: 2, defaultH: 2,
    ...over,
  };
}

function Lit({ config }: WidgetComponentProps) {
  return <div data-testid="lit">{String(config?.label ?? 'lit')}</div>;
}

afterEach(cleanup);

describe('registerWidgetModule', () => {
  it('exposes metadata without invoking the component loader', () => {
    let loaded = 0;
    registerWidgetModule(defineWidget({
      manifest: manifest('mod-meta'),
      load: async () => { loaded += 1; return { default: Lit }; },
    }));

    expect(getWidgetManifest('mod-meta')?.name).toBe('Widget mod-meta');
    expect(getAllWidgetManifests().some((m) => m.type === 'mod-meta')).toBe(true);
    // Reading the catalogue must never pull widget code in.
    expect(loaded).toBe(0);
  });

  it('renders through a loader without the caller providing Suspense', async () => {
    registerWidgetModule(defineWidget({
      manifest: manifest('mod-render'),
      load: async () => ({ default: Lit }),
    }));

    const Component = getWidget('mod-render')!.component;
    render(<Component config={{ label: 'from-loader' }} theme={theme} />);
    await waitFor(() => expect(screen.getByTestId('lit')).toBeTruthy());
    expect(screen.getByText('from-loader')).toBeTruthy();
  });

  it('hands back a stable component identity across calls', () => {
    registerWidgetModule(defineWidget({
      manifest: manifest('mod-stable'),
      load: async () => ({ default: Lit }),
    }));

    // An unstable identity would remount the widget on every render pass.
    expect(getWidget('mod-stable')!.component).toBe(getWidget('mod-stable')!.component);
    expect(getWidget('mod-stable')).toBe(getWidget('mod-stable'));
    expect(getWidgetComponent('mod-stable')).toBe(getWidget('mod-stable')!.component);
  });

  it('exposes an options loader only when one is declared', () => {
    registerWidgetModule(defineWidget({
      manifest: manifest('mod-noopts'),
      load: async () => ({ default: Lit }),
    }));
    registerWidgetModule(defineWidget({
      manifest: manifest('mod-opts'),
      load: async () => ({ default: Lit }),
      loadOptions: async () => ({ default: (() => <div />) as ComponentType<never> as never }),
    }));

    expect(getWidgetOptionsLoader('mod-noopts')).toBeUndefined();
    expect(getWidget('mod-noopts')!.OptionsComponent).toBeUndefined();
    expect(getWidgetOptionsLoader('mod-opts')).toBeTypeOf('function');
    expect(getWidget('mod-opts')!.OptionsComponent).toBeTypeOf('function');
  });

  it('re-registering the same type replaces it and refreshes derived values', () => {
    registerWidgetModule(defineWidget({
      manifest: manifest('mod-replace', { name: 'first' }),
      load: async () => ({ default: Lit }),
    }));
    const before = getWidget('mod-replace')!;

    registerWidgetModule(defineWidget({
      manifest: manifest('mod-replace', { name: 'second' }),
      load: async () => ({ default: Lit }),
    }));

    expect(getWidget('mod-replace')!.name).toBe('second');
    expect(getWidget('mod-replace')).not.toBe(before);
  });
});

describe('registerWidget (legacy)', () => {
  it('still serves metadata and an eager component', () => {
    registerWidget({
      ...manifest('legacy-basic'),
      component: Lit,
    });

    expect(getWidgetManifest('legacy-basic')?.name).toBe('Widget legacy-basic');
    // Eager registration hands back the real component, not a wrapper.
    expect(getWidget('legacy-basic')!.component).toBe(Lit);
    expect(getAllWidgets().some((w) => w.type === 'legacy-basic')).toBe(true);
  });

  it('renders synchronously, with no Suspense round trip', () => {
    registerWidget({ ...manifest('legacy-sync'), component: Lit });
    const Component = getWidget('legacy-sync')!.component;
    render(<Component config={{ label: 'eager' }} theme={theme} />);
    // Present on first paint — no waitFor.
    expect(screen.getByText('eager')).toBeTruthy();
  });

  it('synthesises a loader so displays can treat it like any other widget', async () => {
    registerWidget({ ...manifest('legacy-loader'), component: Lit });
    const loader = getWidgetLoader('legacy-loader');
    expect(loader).toBeTypeOf('function');
    expect((await loader!()).default).toBe(Lit);
  });

  it('does not clobber a real code-split loader registered for the same type', async () => {
    function Split() { return <div data-testid="split">split</div>; }
    registerWidgetModule(defineWidget({
      manifest: manifest('mixed'),
      load: async () => ({ default: Split }),
    }));
    registerWidget({ ...manifest('mixed'), component: Lit });

    // The split loader wins; the legacy call only refreshes metadata.
    expect((await getWidgetLoader('mixed')!()).default).toBe(Split);
  });

  it('keeps a bespoke OptionsComponent reachable', () => {
    function Opts() { return <div data-testid="opts">opts</div>; }
    registerWidget({
      ...manifest('legacy-opts'),
      component: Lit,
      OptionsComponent: Opts as never,
    });
    expect(getWidget('legacy-opts')!.OptionsComponent).toBe(Opts);
  });
});

describe('lookups for unknown types', () => {
  it('return undefined/null rather than throwing', () => {
    expect(getWidget('nope')).toBeUndefined();
    expect(getWidgetManifest('nope')).toBeUndefined();
    expect(getWidgetComponent('nope')).toBeNull();
    expect(getWidgetLoader('nope')).toBeUndefined();
    expect(getWidgetOptionsLoader('nope')).toBeUndefined();
  });
});
