import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSourceAdapter,
  normalizeSourcePayload,
  parseRockGymProOccupancy,
  parseUNBCRooftopWeather,
  parseUNBCReleases,
} from './source-adapters';

const RELEASE_HTML = `
  <div class="article-item">
    <div class="article-item--col1">
      <a href="/our-stories/story/unbc-professor-receives-polar-medal-advancing-understanding-canadas-north-and-arctic">
        <img src="/sites/default/files/styles/featured/public/2026-06/polar-medal.jpg.webp" />
      </a>
    </div>
    <div class="article-item--col2">
      <h2 id="unbc-professor-receives-polar-medal-for-advancing-understanding">
        <a href="/our-stories/story/unbc-professor-receives-polar-medal-advancing-understanding-canadas-north-and-arctic" rel="bookmark">
          <span class="field field--name-title">UNBC Professor receives Polar Medal for advancing understanding of Canada&#039;s North and the Arctic</span>
        </a>
      </h2>
      <div class="field field--name-field-date"><time datetime="2026-06-30T12:00:00Z">Jun 30, 2026</time></div>
    </div>
  </div>
`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UNBC releases source adapter', () => {
  it('parses the current h2 Drupal markup and decodes title entities', () => {
    const items = parseUNBCReleases(RELEASE_HTML, {
      maxItems: 5,
      imageQuality: 'original',
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "UNBC Professor receives Polar Medal for advancing understanding of Canada's North and the Arctic",
      subtitle: 'Jun 30, 2026',
      imageUrl: 'https://www.unbc.ca/sites/default/files/2026-06/polar-medal.jpg',
      fallbackImageUrl: 'https://www.unbc.ca/sites/default/files/styles/featured/public/2026-06/polar-medal.jpg.webp',
      url: 'https://www.unbc.ca/our-stories/story/unbc-professor-receives-polar-medal-advancing-understanding-canadas-north-and-arctic',
    });
  });

  it('honours thumbnail image quality', () => {
    const [item] = parseUNBCReleases(RELEASE_HTML, {
      maxItems: 1,
      imageQuality: 'thumbnail',
    });

    expect(item.imageUrl).toBe('https://www.unbc.ca/sites/default/files/styles/featured/public/2026-06/polar-medal.jpg.webp');
    expect(item.fallbackImageUrl).toBeUndefined();
  });

  it('resolves the adapter from the source URL and returns normalized records', () => {
    const normalized = normalizeSourcePayload({
      url: 'https://www.unbc.ca/our-stories/releases',
      rawText: RELEASE_HTML,
    });

    expect(normalized?.adapterId).toBe('unbc-news-releases');
    expect(normalized?.items).toHaveLength(1);
    expect(normalized?.items[0]).toMatchObject({
      title: expect.any(String),
      imageUrl: expect.stringContaining('https://www.unbc.ca/'),
      date: 'Jun 30, 2026',
    });
  });

  it('supports server runtimes without DOMParser', () => {
    vi.stubGlobal('DOMParser', undefined);

    const [item] = parseUNBCReleases(RELEASE_HTML);

    expect(item).toMatchObject({
      title: "UNBC Professor receives Polar Medal for advancing understanding of Canada's North and the Arctic",
      date: 'Jun 30, 2026',
      imageUrl: 'https://www.unbc.ca/sites/default/files/2026-06/polar-medal.jpg',
    });
  });
});

describe('UNBC rooftop weather source adapter', () => {
  it('normalizes the latest station table row into canonical weather fields', () => {
    const html = [
      '<tr><td>2026-07-23 08:00:00<td>1<td>12.5<td>8.1<td>74<td>950.1<td>1012.4<td>2.5<td>2.1<td>180<td>0.2<td>4.8<td>0.0<td>220',
      '<tr><td>2026-07-23 08:01:00<td>2<td>12.7<td>8.2<td>73<td>950.2<td>1012.5<td>2.7<td>2.2<td>182<td>0.2<td>5.1<td>0.1<td>230',
    ].join('\n');

    expect(parseUNBCRooftopWeather(html)).toEqual({
      kind: 'weather-observation',
      observedAt: '2026-07-23 08:01:00',
      temperatureC: 12.7,
      dewPointC: 8.2,
      humidityPercent: 73,
      pressureHpa: 1012.5,
      windSpeedMps: 2.7,
      windDirectionDegrees: 182,
      windGustMps: 5.1,
      precipitationMm: 0.1,
      solarRadiationWm2: 230,
    });
  });
});

describe('Rock Gym Pro occupancy source adapter', () => {
  it('normalizes the embedded portal data object', () => {
    const html = `
      <script>
        var data = {
          'OEC': {
            'capacity': 30,
            'count': 19,
            'subLabel': 'Current Climber Count',
            'lastUpdate': 'Jul 23&nbsp;8:30 AM',
          },
        };
      </script>
    `;

    expect(parseRockGymProOccupancy(html)).toEqual({
      kind: 'occupancy',
      count: 19,
      capacity: 30,
      label: 'Current Climber Count',
      observedAt: 'Jul 23 8:30 AM',
    });
  });
});

describe('remaining Source Store adapters', () => {
  it('normalizes an iCanEat menu page into meal records', () => {
    const normalized = normalizeSourcePayload({
      presetId: 'unbc-cafeteria-menu',
      rawText: `
        <h2>Lunch</h2>
        <ul><li>Roast chicken</li><li>Seasonal vegetables</li></ul>
      `,
    });

    expect(normalized?.adapterId).toBe('unbc-cafeteria-menu');
    expect(normalized?.items.map((item) => item.title)).toEqual([
      'Roast chicken',
      'Seasonal vegetables',
    ]);
    expect(normalized?.data).toMatchObject({ status: 'ready' });
  });

  it('normalizes LibCal slots and exposes its POST preview contract', () => {
    const normalized = normalizeSourcePayload({
      presetId: 'unbc-library-availability',
      payload: {
        slots: [{
          itemId: '17421',
          start: '2026-07-23 09:00:00',
          end: '2026-07-23 09:30:00',
          className: 's-lc-eq-avail',
        }],
      },
    });

    expect(normalized?.adapterId).toBe('libcal-room-availability');
    expect(normalized?.data).toMatchObject({
      slots: [{ itemId: 17421, className: 's-lc-eq-avail' }],
    });
    expect(normalized?.items[0]).toMatchObject({
      title: 'Room 17421',
      description: 'Available',
    });

    const adapter = getSourceAdapter('libcal-room-availability');
    expect(adapter?.createPreviewRequest?.().method).toBe('POST');
  });

  it('extracts the embedded confessions payload from WordPress content', () => {
    const normalized = normalizeSourcePayload({
      presetId: 'unbc-confessions-feed',
      payload: [{
        content: {
          rendered: `<div data-confessions='[{"id":7,"testimonial":"Library &amp; coffee","by":"Anonymous"}]'></div>`,
        },
      }],
    });

    expect(normalized?.adapterId).toBe('unbc-confessions');
    expect(normalized?.data).toEqual([{
      id: '7',
      text: 'Library & coffee',
      by: 'Anonymous',
    }]);
  });

  it('maps WordPress club records to canonical linked image records', () => {
    const normalized = normalizeSourcePayload({
      presetId: 'unbc-clubs-feed',
      payload: [{
        id: 42,
        title: { rendered: 'Outdoor &amp; Recreation Club' },
        link: 'https://overtheedge.unbc.ca/organization/outdoors/',
        _embedded: {
          'wp:featuredmedia': [{
            source_url: 'https://overtheedge.unbc.ca/outdoors.jpg',
          }],
        },
      }],
    });

    expect(normalized?.adapterId).toBe('unbc-clubs');
    expect(normalized?.items[0]).toMatchObject({
      title: 'Outdoor & Recreation Club',
      imageUrl: 'https://overtheedge.unbc.ca/outdoors.jpg',
      url: 'https://overtheedge.unbc.ca/organization/outdoors/',
    });
  });
});

describe('additional Source Store parser audit adapters', () => {
  it('normalizes MSC GeoMet current conditions', () => {
    const normalized = normalizeSourcePayload({
      presetId: 'weathercan-prince-george',
      payload: {
        properties: {
          name: { en: 'Prince George' },
          currentConditions: {
            condition: { en: 'Cloudy' },
            temperature: { value: { en: 12.5 } },
            relativeHumidity: { value: { en: 75 } },
            pressure: { value: { en: 100.8 } },
            wind: { speed: { value: { en: 18 } } },
            timestamp: { en: '2026-07-23T15:00:00Z' },
          },
        },
      },
    });

    expect(normalized?.adapterId).toBe('msc-geomet-weather');
    expect(normalized?.data).toMatchObject({
      kind: 'weather-observation',
      location: 'Prince George',
      condition: 'Cloudy',
      temperatureC: 12.5,
      pressureHpa: 1008,
      windSpeedMps: 5,
    });
  });

  it('normalizes radio metadata before Radio Station consumes it', () => {
    const normalized = normalizeSourcePayload({
      presetId: 'cfur-now-playing',
      url: 'https://ca.api.iheart.com/api/v3/live-meta/stream/9357/currentTrackMeta',
      payload: {
        trackTitle: 'Northern Lights',
        artistName: 'Campus Band',
        imageUrl: '/artwork.jpg',
      },
    });

    expect(normalized?.adapterId).toBe('radio-now-playing');
    expect(normalized?.data).toMatchObject({
      title: 'Northern Lights',
      artist: 'Campus Band',
      artworkUrl: 'https://ca.api.iheart.com/artwork.jpg',
    });
    expect(normalized?.items[0]).toMatchObject({
      title: 'Northern Lights',
      subtitle: 'Campus Band',
    });
  });
});
