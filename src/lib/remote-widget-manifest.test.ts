import { describe, expect, it } from 'vitest';
import {
  REMOTE_WIDGET_FORMAT_VERSION,
  REMOTE_WIDGET_RUNTIME_VERSION,
  validateRemoteWidgetManifest,
} from './remote-widget-manifest';

function valid() {
  return {
    formatVersion: REMOTE_WIDGET_FORMAT_VERSION,
    id: 'authorclock',
    name: 'Author Clock',
    version: '0.1.0',
    widgetTypes: ['authorclock'],
    bundle: 'widget.js',
    runtime: REMOTE_WIDGET_RUNTIME_VERSION,
  };
}

describe('validateRemoteWidgetManifest', () => {
  it('accepts a minimal valid manifest', () => {
    const result = validateRemoteWidgetManifest(valid());
    expect(result.error).toBeUndefined();
    expect(result.manifest).toMatchObject({ id: 'authorclock', widgetTypes: ['authorclock'] });
  });

  it('accepts and passes through optional descriptive fields', () => {
    const result = validateRemoteWidgetManifest({
      ...valid(),
      description: 'A literary clock',
      author: 'ahzs645',
      homepage: 'https://github.com/ahzs645/authorclock',
    });
    expect(result.manifest?.homepage).toBe('https://github.com/ahzs645/authorclock');
  });

  it.each([
    ['not an object', 'nope'],
    ['wrong formatVersion', { ...valid(), formatVersion: 99 }],
    ['uppercase id', { ...valid(), id: 'AuthorClock' }],
    ['empty name', { ...valid(), name: '  ' }],
    ['empty widgetTypes', { ...valid(), widgetTypes: [] }],
    ['non-string widget type', { ...valid(), widgetTypes: [42] }],
    ['bundle with a path', { ...valid(), bundle: '../evil.js' }],
    ['bundle without .js', { ...valid(), bundle: 'widget.wasm' }],
    ['non-integer runtime', { ...valid(), runtime: 1.5 }],
  ])('rejects %s', (_label, raw) => {
    expect(validateRemoteWidgetManifest(raw).error).toBeTruthy();
  });

  it('rejects a bundle built against a newer runtime than this host', () => {
    const result = validateRemoteWidgetManifest({
      ...valid(),
      runtime: REMOTE_WIDGET_RUNTIME_VERSION + 1,
    });
    expect(result.error).toMatch(/requires host runtime/);
  });
});
