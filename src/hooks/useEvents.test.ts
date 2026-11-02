import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEvents, useEventsState, type CalendarEvent } from './useEvents';

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

const jsonResponse = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('useEvents (JSON source)', () => {
  it('follows pagination past pages that hold only past events', async () => {
    const pages: Record<string, unknown> = {
      '1': {
        events: [
          { id: 'past-1', title: 'Past one', startDate: iso(-10), endDate: iso(-10) },
          { id: 'past-2', title: 'Past two', startDate: iso(-5), endDate: iso(-5) },
        ],
        pagination: { hasMore: true, nextPage: 2 },
      },
      '2': {
        events: [{ id: 'next', title: 'Upcoming', startDate: iso(3), endDate: iso(3) }],
        eventMetadata: { next: { location: 'Winter Garden' } },
        pagination: { hasMore: false, nextPage: null },
      },
    };
    const fetchMock = vi.fn((input: string) =>
      jsonResponse(pages[new URL(input).searchParams.get('page') ?? '1']),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useEvents({
        apiUrl: 'https://example.test/wp-json/unbc-events/v1/events?paging-test=1',
        useCorsProxy: false,
      }),
    );

    await waitFor(() => expect(result.current.map(e => e.id)).toEqual(['next']));
    expect(result.current[0].location).toBe('Winter Garden');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('page=2');
  });

  it('keeps events in progress and stops paging once maxItems are found', async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse({
        events: [
          { id: 'ended', title: 'Ended', startDate: iso(-3), endDate: iso(-2) },
          { id: 'ongoing', title: 'Ongoing', startDate: iso(-2), endDate: iso(2) },
          { id: 'soon', title: 'Soon', startDate: iso(1), endDate: iso(1) },
        ],
        pagination: { hasMore: true, nextPage: 2 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useEvents({
        apiUrl: 'https://example.test/wp-json/unbc-events/v1/events?ongoing-test=1',
        maxItems: 2,
        useCorsProxy: false,
      }),
    );

    await waitFor(() => expect(result.current.map(e => e.id)).toEqual(['ongoing', 'soon']));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('useEventsState (demo / live / unavailable)', () => {
  const demo: CalendarEvent[] = [{ id: 'demo', title: 'Sample event' }];

  it('shows default events as demo only when no source is configured', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useEventsState({ defaultEvents: demo }));
    expect(result.current).toMatchObject({ events: demo, isDemo: true, loading: false, error: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never shows default events for a configured source that fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    const { result } = renderHook(() =>
      useEventsState({
        apiUrl: 'https://example.test/events?failing=1',
        defaultEvents: demo,
        useCorsProxy: false,
      }),
    );
    expect(result.current).toMatchObject({ events: [], isDemo: false, loading: true });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);

    const legacy = renderHook(() =>
      useEvents({ apiUrl: 'https://example.test/events?failing=1', defaultEvents: demo, useCorsProxy: false }),
    );
    expect(legacy.result.current).toEqual([]);
  });

  it('reports a feed that is not a list as an error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ unexpected: true })));
    const { result } = renderHook(() =>
      useEventsState({ apiUrl: 'https://example.test/events?not-a-list=1', useCorsProxy: false }),
    );
    await waitFor(() => expect(result.current.error).toMatch(/list of events/));
    expect(result.current.events).toEqual([]);
  });

  it('keeps last-good events when a later refresh fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let fail = false;
      vi.stubGlobal('fetch', vi.fn(() =>
        fail
          ? Promise.reject(new Error('refresh failed'))
          : jsonResponse({ events: [{ id: 'live', title: 'Live', startDate: iso(1), endDate: iso(1) }] }),
      ));
      const { result } = renderHook(() =>
        useEventsState({
          apiUrl: 'https://example.test/events?last-good=1',
          defaultEvents: demo,
          cacheTtlSeconds: 0,
          pollIntervalMs: 1_000,
          useCorsProxy: false,
        }),
      );
      await waitFor(() => expect(result.current.events.map(e => e.id)).toEqual(['live']));
      expect(result.current.lastUpdated).toBeInstanceOf(Date);

      fail = true;
      localStorage.clear();
      await vi.advanceTimersByTimeAsync(1_100);
      await waitFor(() => expect(result.current.error).toBeTruthy());
      expect(result.current.events.map(e => e.id)).toEqual(['live']);
      expect(result.current.isDemo).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
