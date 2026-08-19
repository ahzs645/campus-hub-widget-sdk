import { afterEach, describe, expect, it } from 'vitest';
import {
  REMOTE_WIDGET_RUNTIME_GLOBAL,
  REMOTE_WIDGET_RUNTIME_VERSION,
} from './remote-widget-manifest';
import {
  installRemoteWidgetRuntime,
  loadRemoteWidgetBundle,
  type RemoteWidgetRuntime,
} from './remote-widgets';
import { getWidgetManifest, registerWidgetModule } from './widget-registry';

function runtimeGlobal(): RemoteWidgetRuntime | undefined {
  return (window as unknown as Record<string, RemoteWidgetRuntime | undefined>)[
    REMOTE_WIDGET_RUNTIME_GLOBAL
  ];
}

function pendingScript(): HTMLScriptElement {
  const script = document.head.querySelector('script[src]');
  if (!(script instanceof HTMLScriptElement)) throw new Error('no injected script found');
  return script;
}

/** Act as a loaded bundle would: register through the runtime global. */
function simulateBundle(types: string[]) {
  const runtime = runtimeGlobal();
  if (!runtime) throw new Error('runtime global not installed');
  const sdk = runtime.sdk as unknown as { registerWidgetModule: typeof registerWidgetModule };
  for (const type of types) {
    sdk.registerWidgetModule({
      manifest: {
        type,
        name: type,
        description: 'test remote widget',
        icon: 'clock',
        minW: 1,
        minH: 1,
        defaultW: 2,
        defaultH: 2,
      },
      load: async () => ({ default: () => null }),
    });
  }
}

afterEach(() => {
  for (const script of Array.from(document.head.querySelectorAll('script'))) script.remove();
});

describe('installRemoteWidgetRuntime', () => {
  it('installs the global once and returns the same object after', () => {
    const first = installRemoteWidgetRuntime();
    expect(first.version).toBe(REMOTE_WIDGET_RUNTIME_VERSION);
    expect(runtimeGlobal()).toBe(first);
    expect(installRemoteWidgetRuntime()).toBe(first);
  });

  it("hands bundles the host's live registry", () => {
    const runtime = installRemoteWidgetRuntime();
    const sdk = runtime.sdk as unknown as { registerWidgetModule: typeof registerWidgetModule };
    expect(sdk.registerWidgetModule).toBe(registerWidgetModule);
  });
});

describe('loadRemoteWidgetBundle', () => {
  it('resolves with the types a bundle newly registered', async () => {
    const load = loadRemoteWidgetBundle({ url: 'https://example.com/one/widget.js' });
    const script = pendingScript();
    simulateBundle(['remote-widget-one']);
    script.onload?.(new Event('load'));

    await expect(load).resolves.toEqual(['remote-widget-one']);
    expect(getWidgetManifest('remote-widget-one')).toBeDefined();
    expect(document.head.querySelector('script[src]')).toBeNull();
  });

  it('deduplicates loads by key', async () => {
    const first = loadRemoteWidgetBundle({ url: 'https://example.com/two/widget.js?sig=a', key: 'two@hash' });
    const script = pendingScript();
    simulateBundle(['remote-widget-two']);
    script.onload?.(new Event('load'));
    await first;

    const second = loadRemoteWidgetBundle({ url: 'https://example.com/two/widget.js?sig=b', key: 'two@hash' });
    expect(second).toBe(first);
    expect(document.head.querySelector('script[src]')).toBeNull();
  });

  it('rejects on a load error and forgets the bundle so it can be retried', async () => {
    const failing = loadRemoteWidgetBundle({ url: 'https://example.com/three/widget.js' });
    pendingScript().onerror?.(new Event('error'));
    await expect(failing).rejects.toThrow(/Failed to load/);

    const retry = loadRemoteWidgetBundle({ url: 'https://example.com/three/widget.js' });
    expect(retry).not.toBe(failing);
    const script = pendingScript();
    simulateBundle(['remote-widget-three']);
    script.onload?.(new Event('load'));
    await expect(retry).resolves.toEqual(['remote-widget-three']);
  });
});
