import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
