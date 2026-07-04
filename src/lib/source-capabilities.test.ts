import { describe, expect, it } from 'vitest'
import {
  analyzeSourcePayload,
  describeCapabilities,
  meetsRequirement,
} from './source-capabilities'

const NOW = 1_700_000_000_000

describe('analyzeSourcePayload — JSON', () => {
  it('detects a list of items with images, text and dates', () => {
    const payload = {
      items: [
        { title: 'Story one', date: '2026-01-01', image: 'https://cdn.example.com/a.jpg', link: 'https://x/a' },
        { title: 'Story two', date: '2026-01-02', image: 'https://cdn.example.com/b.jpg' },
      ],
    }
    const cap = analyzeSourcePayload({ payload }, NOW)
    expect(cap.format).toBe('json')
    expect(cap.itemCount).toBe(2)
    expect(cap.hasImages).toBe(true)
    expect(cap.hasText).toBe(true)
    expect(cap.hasDates).toBe(true)
    expect(cap.hasLinks).toBe(true)
    expect(cap.sample?.title).toBe('Story one')
    expect(cap.sample?.imageUrl).toBe('https://cdn.example.com/a.jpg')
  })

  it('reports text-only when items carry no image', () => {
    const payload = [{ title: 'Note', body: 'text' }]
    const cap = analyzeSourcePayload({ payload }, NOW)
    expect(cap.hasImages).toBe(false)
    expect(cap.hasText).toBe(true)
    expect(describeCapabilities(cap)).toContain('Text only')
  })

  it('resolves WordPress featured media', () => {
    const payload = [
      {
        title: { rendered: 'WP post' },
        _embedded: { 'wp:featuredmedia': [{ source_url: 'https://wp.example.com/img.png' }] },
      },
    ]
    const cap = analyzeSourcePayload({ payload }, NOW)
    expect(cap.hasImages).toBe(true)
    expect(cap.sample?.title).toBe('WP post')
  })

  it('parses a JSON string body via contentType', () => {
    const cap = analyzeSourcePayload({ payload: '[{"title":"x"}]', contentType: 'application/json' }, NOW)
    expect(cap.format).toBe('json')
    expect(cap.itemCount).toBe(1)
  })

  it('resolves a relative sample image against the source URL', () => {
    const payload = [{ title: 'Post', image: '/wp-content/uploads/a.jpg' }]
    const cap = analyzeSourcePayload({ payload, url: 'https://blog.example.com/feed.json' }, NOW)
    expect(cap.hasImages).toBe(true)
    expect(cap.sample?.imageUrl).toBe('https://blog.example.com/wp-content/uploads/a.jpg')
  })

  it('drops an unresolvable relative sample image but still reports hasImages', () => {
    const payload = [{ title: 'Post', image: '/wp-content/uploads/a.jpg' }]
    const cap = analyzeSourcePayload({ payload }, NOW)
    expect(cap.hasImages).toBe(true)
    expect(cap.sample?.imageUrl).toBeUndefined()
  })
})

describe('analyzeSourcePayload — feeds & markup', () => {
  it('detects an RSS feed with enclosure images', () => {
    const rss = `<?xml version="1.0"?><rss><channel><title>Feed</title>
      <item><title>One</title><pubDate>Mon</pubDate><enclosure type="image/jpeg" url="http://x/1.jpg"/></item>
      <item><title>Two</title><pubDate>Tue</pubDate></item>
    </channel></rss>`
    const cap = analyzeSourcePayload({ payload: rss, contentType: 'application/rss+xml' }, NOW)
    expect(cap.format).toBe('rss')
    expect(cap.itemCount).toBe(2)
    expect(cap.hasImages).toBe(true)
    expect(cap.hasDates).toBe(true)
  })

  it('detects an Atom feed', () => {
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title><entry><title>e1</title></entry></feed>`
    const cap = analyzeSourcePayload({ payload: atom }, NOW)
    expect(cap.format).toBe('atom')
    expect(cap.itemCount).toBe(1)
  })

  it('omits the sample when the feed title is empty', () => {
    const rss = `<rss><channel><title></title><item><title></title></item></channel></rss>`
    const cap = analyzeSourcePayload({ payload: rss }, NOW)
    expect(cap.format).toBe('rss')
    expect(cap.sample).toBeUndefined()
  })

  it('detects an HTML page with images', () => {
    const html = `<!doctype html><html><body><h1>Title</h1><img src="a.jpg"></body></html>`
    const cap = analyzeSourcePayload({ payload: html }, NOW)
    expect(cap.format).toBe('html')
    expect(cap.hasImages).toBe(true)
  })

  it('detects an iCalendar feed', () => {
    const ical = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:e\nEND:VEVENT\nBEGIN:VEVENT\nEND:VEVENT\nEND:VCALENDAR`
    const cap = analyzeSourcePayload({ payload: ical }, NOW)
    expect(cap.format).toBe('ical')
    expect(cap.itemCount).toBe(2)
    expect(cap.hasDates).toBe(true)
  })
})

describe('analyzeSourcePayload — media short-circuits', () => {
  it('classifies image sources without a body', () => {
    const cap = analyzeSourcePayload({ sourceType: 'image' }, NOW)
    expect(cap.format).toBe('image')
    expect(cap.hasImages).toBe(true)
  })
})

describe('describeCapabilities & meetsRequirement', () => {
  it('builds compact chips', () => {
    const cap = analyzeSourcePayload(
      { payload: { items: [{ title: 't', date: 'd', image: 'https://cdn.x/a.jpg' }] } },
      NOW,
    )
    expect(describeCapabilities(cap)).toEqual(['JSON', '1 item', 'Images', 'Dated'])
  })

  it('flags a source that lacks required images', () => {
    const cap = analyzeSourcePayload({ payload: [{ title: 'x' }] }, NOW)
    const result = meetsRequirement(cap, { hasImages: true })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/no images/i)
  })

  it('passes when capabilities are unknown', () => {
    expect(meetsRequirement(undefined, { hasImages: true }).ok).toBe(true)
  })
})
