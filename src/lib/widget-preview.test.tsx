import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEventsState } from '../hooks/useEvents';
import { registerWidget } from './widget-registry';
import { buildWidgetPreviewProps, WidgetPreviewProvider } from './widget-preview';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('sample previews', () => {
  it('removes saved connections and remote media while preserving presentation settings and local samples', () => {
    const data = {
      title: 'My board', fontSize: 24, apiUrl: 'https://example.edu/live',
      __sourceRef: { sourceId: 'private-source', propName: 'apiUrl' },
      coverUrl: 'https://example.edu/cover.jpg',
      rows: [{ title: 'Edited row', image: 'data:image/svg+xml,sample' }],
      apiKey: 'private-key',
    };
    const preview = buildWidgetPreviewProps({
      defaultProps: { fontSize: 14, color: 'blue' },
      acceptsSources: [{ propName: 'apiUrl', types: ['api'] }],
      previewProps: { mode: 'sample' },
    }, data);

    expect(preview).toEqual({
      title: 'My board', fontSize: 24, color: 'blue',
      rows: [{ title: 'Edited row', image: 'data:image/svg+xml,sample' }],
      mode: 'sample',
    });
    expect(data.apiUrl).toBe('https://example.edu/live');
    expect(data.__sourceRef.sourceId).toBe('private-source');
  });

  it('uses a nested plugin’s own binding and sample overrides in container previews', () => {
    registerWidget({
      type: 'preview-child-connection', name: 'Child', description: '', icon: 'clock',
      minW: 1, minH: 1, defaultW: 1, defaultH: 1, component: () => null,
      acceptsSources: [{ propName: 'station', types: ['api'] }],
      previewProps: { mode: 'sample' },
    });

    const preview = buildWidgetPreviewProps({}, { items: [{
      type: 'preview-child-connection', props: { station: 'station-23', units: 'metric',
        __sourceRef: { sourceId: 'station', propName: 'station' } },
    }] });

    expect(preview).toEqual({ items: [{
      type: 'preview-child-connection', props: { units: 'metric', mode: 'sample' },
    }] });
  });

  it('suppresses event requests even when a plugin passes a configured URL in preview context', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const events = [{ id: 'sample', title: 'Sample campus event' }];
    const { result } = renderHook(() => useEventsState({
      apiUrl: 'https://example.edu/events', defaultEvents: events,
    }), { wrapper: WidgetPreviewProvider });

    expect(result.current).toMatchObject({ events, isDemo: true, loading: false, error: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
