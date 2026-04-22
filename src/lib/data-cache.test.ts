import { describe, expect, it } from 'vitest';
import { buildProxyUrl, getCorsProxyUrl } from './data-cache';

describe('buildProxyUrl', () => {
  it('does not proxy app-local URLs', () => {
    expect(buildProxyUrl('/data/simcity_news_tickers.json')).toBe(
      '/data/simcity_news_tickers.json',
    );
    expect(buildProxyUrl('data/simcity_news_tickers.json')).toBe('data/simcity_news_tickers.json');
  });

  it('does not proxy same-origin absolute URLs', () => {
    const sameOriginUrl = new URL(
      '/data/simcity_news_tickers.json',
      window.location.href,
    ).toString();

    expect(buildProxyUrl(sameOriginUrl)).toBe(sameOriginUrl);
  });

  it('proxies external HTTP URLs when a proxy is configured', () => {
    const targetUrl = 'https://example.com/feed.json';
    const proxyUrl = getCorsProxyUrl();

    if (!proxyUrl) {
      expect(buildProxyUrl(targetUrl)).toBe(targetUrl);
      return;
    }

    const base = proxyUrl.replace(/\/?\??(?:url=)?$/i, '');
    expect(buildProxyUrl(targetUrl)).toBe(`${base}/?url=${encodeURIComponent(targetUrl)}`);
  });
});
