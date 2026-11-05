import { describe, expect, it } from 'vitest';
import { applySourceBinding, detachChangedSourceReferences, getSourceReference, getSourceReferences, matchSourceToBindings, removeSourceBinding } from './source-bindings';
import type { LinkedSource, SourceBinding } from './widget-registry';

const source: LinkedSource = {
  _id: 'campus-news', name: 'Campus news', sourceType: 'feed', url: 'https://example.edu/news.xml',
  capabilities: {
    format: 'rss', hasImages: false, hasText: true, hasDates: true, hasLinks: true,
    fields: [], detectedAt: 1,
  },
};

describe('source binding compatibility', () => {
  it('prefers a compatible binding over a same-type binding whose required content is missing', () => {
    const images: SourceBinding = { propName: 'imagesUrl', types: ['feed'], requires: { hasImages: true } };
    const headlines: SourceBinding = { propName: 'feedUrl', types: ['feed'] };

    expect(matchSourceToBindings(source, [images, headlines])).toMatchObject({ binding: headlines, compatible: true });
    expect(matchSourceToBindings(source, [images])).toMatchObject({ compatible: false, reason: expect.stringMatching(/no images/i) });
  });

  it('enforces transport and provider constraints while allowing unprobed capabilities', () => {
    expect(matchSourceToBindings(source, [{ propName: 'url', types: ['image'] }])).toBeUndefined();
    expect(matchSourceToBindings(source, [{ propName: 'feedUrl', types: ['feed'], matchSource: () => false }])).toBeUndefined();
    expect(matchSourceToBindings({ ...source, capabilities: undefined }, [{
      propName: 'feedUrl', types: ['feed'], requires: { hasImages: true },
    }])).toMatchObject({ compatible: true });
  });
});

describe('multiple saved sources', () => {
  const binding: SourceBinding = { propName: 'slides', types: ['image'], multiple: true, itemUrlProp: 'image' };
  const one: LinkedSource = { _id: 'image-one', name: 'One', sourceType: 'image', url: 'https://example.edu/one.jpg' };
  const two: LinkedSource = { ...one, _id: 'image-two', name: 'Two', url: 'https://example.edu/two.jpg' };
  const manual = { id: 'hand-authored', image: 'data:image/svg+xml,manual', caption: 'Keep this slide' };

  it('tracks each managed item, preserves manual slides, and upserts a source already present', () => {
    let data = applySourceBinding(one, binding, { slides: [manual], duration: 10 });
    data = applySourceBinding(two, binding, data, binding);
    data = applySourceBinding({ ...one, url: 'https://example.edu/one-updated.jpg' }, binding, data, binding);

    expect(data.slides).toEqual([
      manual,
      { id: one._id, image: 'https://example.edu/one-updated.jpg' },
      { id: two._id, image: two.url },
    ]);
    expect(getSourceReferences(data)).toEqual(expect.arrayContaining([
      { sourceId: one._id, propName: 'slides', itemId: one._id, urlProp: 'image' },
      { sourceId: two._id, propName: 'slides', itemId: two._id, urlProp: 'image' },
    ]));
    expect(getSourceReferences(data)).toHaveLength(2);
  });

  it('unlinks only the requested managed item and retains other sources and manual content', () => {
    let data = applySourceBinding(one, binding, { slides: [manual], duration: 10 });
    data = applySourceBinding(two, binding, data, binding);
    data = removeSourceBinding(data, binding, getSourceReferences(data).find((ref) => ref.sourceId === one._id));
    expect(data.slides).toEqual([manual, { id: two._id, image: two.url }]);
    expect(getSourceReferences(data)).toEqual([{ sourceId: two._id, propName: 'slides', itemId: two._id, urlProp: 'image' }]);
    data = removeSourceBinding(data, binding);
    expect(data).toEqual({ slides: [manual], duration: 10 });
  });

  it('ignores links to items removed by a collection options editor', () => {
    let data = applySourceBinding(one, binding, {});
    data = applySourceBinding(two, binding, data, binding);
    data = { ...data, slides: [{ id: one._id, image: one.url }] };
    expect(getSourceReference(data)?.sourceId).toBe(one._id);
    expect(getSourceReferences(data).map((ref) => ref.sourceId)).toEqual([one._id]);
  });

  it('keeps collection metadata when the active alias omits optional fields', () => {
    const ref = { sourceId: one._id, propName: 'slides', itemId: one._id, urlProp: 'posterUrl', mode: 'reference' as const };
    const data = { slides: [{ id: one._id }], __sourceRefs: [ref], __sourceRef: { sourceId: one._id, propName: 'slides', itemId: one._id } };
    expect(getSourceReferences(data)).toEqual([ref]);
    expect(getSourceReference(data)).toEqual(ref);
  });

  it('upgrades an identifiable legacy latest-image reference when adding another source', () => {
    const data = applySourceBinding(two, binding, {
      slides: [{ id: one._id, image: one.url }],
      __sourceRef: { sourceId: one._id, propName: 'slides' },
    }, binding);
    expect(getSourceReferences(data)).toHaveLength(2);
    expect(getSourceReferences(data)[0]).toMatchObject({ sourceId: one._id, itemId: one._id, urlProp: 'image' });
  });
});

describe('source selection and unlink', () => {
  it('recognizes older host-managed references that stored only sourceId', () => {
    expect(getSourceReference({ __sourceRef: { sourceId: 'saved-api' } })).toEqual({ sourceId: 'saved-api' });
  });

  it('preserves presentation settings and custom mapping when switching source bindings', () => {
    const previous: SourceBinding = {
      propName: 'apiUrl', types: ['api'], removeSource: () => ({ adapter: undefined }),
    };
    const next: SourceBinding = {
      propName: 'feedUrl', types: ['feed'],
      applySource: (saved, current) => ({ feedUrl: saved.url, sourceType: 'rss', fontSize: current.fontSize }),
    };
    const data = {
      fontSize: 24, title: 'Our news', apiUrl: 'https://old.example/data', adapter: 'old',
      __sourceRef: { sourceId: 'old', propName: 'apiUrl' },
    };
    const result = applySourceBinding(source, next, data, previous);

    expect(result).toMatchObject({
      fontSize: 24, title: 'Our news', feedUrl: source.url, sourceType: 'rss',
      __sourceRef: { sourceId: source._id, propName: 'feedUrl' },
    });
    expect(result).not.toHaveProperty('apiUrl');
    expect(data.apiUrl).toBe('https://old.example/data');
  });

  it('removes the copied URL and reference while applying the widget reset', () => {
    const binding: SourceBinding = {
      propName: 'feedUrl', types: ['feed'], removeSource: () => ({ mode: 'manual' }),
    };
    const result = removeSourceBinding({
      feedUrl: source.url, mode: 'feed', speed: 20,
      __sourceRef: { sourceId: source._id, propName: 'feedUrl' },
    }, binding);

    expect(result).toEqual({ mode: 'manual', speed: 20 });
  });

  it('can unlink a deleted source even when its original binding is no longer registered', () => {
    expect(removeSourceBinding({
      oldEndpoint: source.url, title: 'Hello',
      __sourceRef: { sourceId: 'deleted', propName: 'oldEndpoint' },
    })).toEqual({ title: 'Hello' });
  });

  it('keeps reference-mode sources host-managed and rejects a known incompatible selection', () => {
    const result = applySourceBinding(source, { propName: 'news', types: ['feed'], mode: 'reference' }, { news: 'https://legacy.example/?key=old' });
    expect(result).toEqual({ __sourceRef: { sourceId: source._id, propName: 'news', mode: 'reference' } });
    expect(JSON.stringify(result)).not.toContain(source.url);
    expect(() => applySourceBinding(source, {
      propName: 'images', types: ['feed'], requires: { hasImages: true },
    }, {})).toThrow(/not compatible/i);
  });
});

describe('manual URL edits', () => {
  const binding: SourceBinding = { propName: 'apiUrl', types: ['api'], removeSource: () => ({ apiUrl: '', title: 'Reset' }) };
  const previous = { apiUrl: 'https://example.edu/saved', title: 'Keep title', __sourceRef: { sourceId: 'saved', propName: 'apiUrl' } };

  it('detaches only the metadata and retains a manually entered replacement URL', () => {
    expect(detachChangedSourceReferences(previous, { ...previous, apiUrl: 'https://example.edu/custom' }, [binding]))
      .toEqual({ apiUrl: 'https://example.edu/custom', title: 'Keep title' });
    expect(previous.__sourceRef.sourceId).toBe('saved');
  });

  it('keeps links for presentation edits, reference bindings, and newly selected identities', () => {
    const presentation = { ...previous, title: 'New title' };
    expect(detachChangedSourceReferences(previous, presentation, [binding])).toBe(presentation);
    const referenceEdit = { ...previous, apiUrl: 'an unrelated legacy setting' };
    expect(detachChangedSourceReferences(previous, referenceEdit, [{ ...binding, mode: 'reference' }])).toBe(referenceEdit);
    const newlyLinked = { apiUrl: 'https://example.edu/new', __sourceRef: { sourceId: 'new', propName: 'apiUrl' } };
    expect(detachChangedSourceReferences(previous, newlyLinked, [binding])).toBe(newlyLinked);
  });

  it('detaches the edited collection item while keeping other links, order and manual items', () => {
    const collection: SourceBinding = { propName: 'slides', types: ['image'], multiple: true, itemUrlProp: 'image' };
    const refs = [
      { sourceId: 'first', propName: 'slides', itemId: 'first', urlProp: 'image' },
      { sourceId: 'second', propName: 'slides', itemId: 'second', urlProp: 'image' },
    ];
    const old = { slides: [{ id: 'first', image: 'saved-one.jpg' }, { id: 'manual', image: 'manual.jpg' }, { id: 'second', image: 'saved-two.jpg' }], __sourceRefs: refs, __sourceRef: refs[1] };
    const edited = { ...old, slides: old.slides.map((item) => item.id === 'first' ? { ...item, image: 'custom.jpg' } : item) };
    const result = detachChangedSourceReferences(old, edited, [collection]);
    expect(result.slides).toBe(edited.slides);
    expect(result.__sourceRefs).toEqual([refs[1]]);
    expect(result.__sourceRef).toEqual(refs[1]);
  });

  it('uses the declared property for legacy references that omitted it', () => {
    const old = { ...previous, __sourceRef: { sourceId: 'saved' } };
    expect(detachChangedSourceReferences(old, { ...old, apiUrl: '' }, [binding]).__sourceRef).toBeUndefined();
  });
});
