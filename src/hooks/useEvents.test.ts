import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEvents } from './useEvents';

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
