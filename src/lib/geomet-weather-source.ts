export interface GeoMetWeatherObservation {
  kind: 'weather-observation';
  observedAt: string;
  temperatureC: number;
  condition: string;
  location: string;
  humidityPercent: number;
  pressureHpa?: number;
  dewPointC?: number;
  windSpeedMps: number;
  windDirectionDegrees?: number;
  windGustMps?: number;
}

interface LocalizedValue<T> {
  en?: T;
  fr?: T;
}

interface GeoMetFeature {
  properties?: {
    lastUpdated?: string;
    name?: LocalizedValue<string>;
    currentConditions?: {
      condition?: LocalizedValue<string>;
      temperature?: { value?: LocalizedValue<number> };
      relativeHumidity?: { value?: LocalizedValue<number> };
      pressure?: { value?: LocalizedValue<number> };
      dewpoint?: { value?: LocalizedValue<number> };
      wind?: {
        speed?: { value?: LocalizedValue<number | string> };
        bearing?: { value?: LocalizedValue<number> };
        gust?: { value?: LocalizedValue<number | string> };
      };
      timestamp?: LocalizedValue<string>;
    };
  };
}

function localized<T>(value?: LocalizedValue<T>): T | undefined {
  return value?.en ?? value?.fr;
}

function numeric(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'calm') return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGeoMetWeather(payload: unknown): GeoMetWeatherObservation | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as { features?: unknown[] };
  const feature = (Array.isArray(record.features) ? record.features[0] : payload) as GeoMetFeature | undefined;
  const current = feature?.properties?.currentConditions;
  if (!feature || !current) return null;

  const temperatureC = numeric(localized(current.temperature?.value));
  const humidityPercent = numeric(localized(current.relativeHumidity?.value));
  const windKph = numeric(localized(current.wind?.speed?.value));
  if (temperatureC === null || humidityPercent === null || windKph === null) return null;

  const pressureKpa = numeric(localized(current.pressure?.value));
  const dewPointC = numeric(localized(current.dewpoint?.value));
  const windDirectionDegrees = numeric(localized(current.wind?.bearing?.value));
  const windGustKph = numeric(localized(current.wind?.gust?.value));

  return {
    kind: 'weather-observation',
    observedAt: localized(current.timestamp) ?? feature.properties?.lastUpdated ?? '',
    temperatureC,
    condition: localized(current.condition) ?? 'Clear',
    location: localized(feature.properties?.name) ?? 'WeatherCAN',
    humidityPercent,
    pressureHpa: pressureKpa === null ? undefined : pressureKpa * 10,
    dewPointC: dewPointC ?? undefined,
    windSpeedMps: windKph / 3.6,
    windDirectionDegrees: windDirectionDegrees ?? undefined,
    windGustMps: windGustKph === null ? undefined : windGustKph / 3.6,
  };
}
