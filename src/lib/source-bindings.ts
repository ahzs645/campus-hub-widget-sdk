import { meetsRequirement } from './source-capabilities';
import type { LinkedSource, SourceBinding } from './widget-registry';

export interface SourceReference {
  sourceId: string;
  /** Older host-managed widgets stored only sourceId. New bindings always set this. */
  propName?: string;
  mode?: 'url' | 'reference';
  /** Stable id of the managed item in a collection such as slides or posters. */
  itemId?: string;
  /** Item field updated when the saved source URL changes. */
  urlProp?: string;
}

export interface SourceBindingMatch {
  binding: SourceBinding;
  compatible: boolean;
  reason?: string;
}

function readReference(ref: unknown): SourceReference | undefined {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return undefined;
  const value = ref as Record<string, unknown>;
  if (typeof value.sourceId !== 'string' || !value.sourceId) return undefined;
  return {
    sourceId: value.sourceId,
    ...(typeof value.propName === 'string' ? { propName: value.propName } : {}),
    ...(value.mode === 'reference' ? { mode: 'reference' as const } : {}),
    ...(typeof value.itemId === 'string' ? { itemId: value.itemId } : {}),
    ...(typeof value.urlProp === 'string' ? { urlProp: value.urlProp } : {}),
  };
}

function referenceKey(ref: SourceReference): string {
  return JSON.stringify([ref.sourceId, ref.propName ?? '', ref.itemId ?? '']);
}

function referenceExists(data: Record<string, unknown>, ref: SourceReference): boolean {
  if (!ref.itemId) return true;
  if (!ref.propName || !Array.isArray(data[ref.propName])) return false;
  return (data[ref.propName] as unknown[]).some((item) =>
    item && typeof item === 'object' && (item as Record<string, unknown>).id === ref.itemId,
  );
}

/**
 * All active links, including collection items and a legacy singular link.
 * References to items removed by a widget's own options editor are ignored.
 */
export function getSourceReferences(data: Record<string, unknown>): SourceReference[] {
  const refs = new Map<string, SourceReference>();
  const raw = Array.isArray(data.__sourceRefs) ? data.__sourceRefs : [];
  for (const value of [...raw, data.__sourceRef]) {
    const ref = readReference(value);
    if (ref && referenceExists(data, ref)) {
      const key = referenceKey(ref);
      // A legacy active alias can omit fields carried by the collection link.
      refs.set(key, { ...refs.get(key), ...ref });
    }
  }
  return [...refs.values()];
}

/** Read the active link, with fallback after a collection item was removed. */
export function getSourceReference(data: Record<string, unknown>): SourceReference | undefined {
  const primary = readReference(data.__sourceRef);
  const references = getSourceReferences(data);
  if (primary && referenceExists(data, primary)) {
    return references.find((ref) => referenceKey(ref) === referenceKey(primary));
  }
  return references.at(-1);
}

function withReferences(data: Record<string, unknown>, refs: SourceReference[]): Record<string, unknown> {
  const next = { ...data };
  delete next.__sourceRef;
  delete next.__sourceRefs;
  if (refs.length > 0) next.__sourceRef = refs[refs.length - 1];
  // Ordinary one-source widgets keep the existing serialized shape. A
  // collection retains every reference, with __sourceRef as its active alias.
  if (refs.length > 1 || refs.some((ref) => ref.itemId)) next.__sourceRefs = refs;
  return next;
}

/**
 * Detach managed URLs edited in an options form without deleting the author's
 * replacement value. Presentation edits and newly selected source identities
 * keep their links. Explicit picker application should bypass this form guard.
 */
export function detachChangedSourceReferences(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
  bindings: SourceBinding[] = [],
): Record<string, unknown> {
  const previousRefs = new Map(getSourceReferences(previous).map((ref) => [referenceKey(ref), ref]));
  const refs = getSourceReferences(next);
  const kept = refs.filter((ref) => {
    const oldRef = previousRefs.get(referenceKey(ref));
    if (!oldRef) return true;
    const binding = ref.propName
      ? bindings.find((candidate) => candidate.propName === ref.propName)
      : bindings.length === 1 ? bindings[0] : undefined;
    if (ref.mode === 'reference' || oldRef.mode === 'reference' || binding?.mode === 'reference') return true;
    const propName = ref.propName ?? binding?.propName;
    if (!propName) return true;
    const oldValue = previous[propName];
    const newValue = next[propName];
    if (ref.itemId || binding?.multiple || Array.isArray(oldValue)) {
      const itemId = ref.itemId ?? ref.sourceId;
      const findItem = (items: unknown) => Array.isArray(items)
        ? items.find((item) => item && typeof item === 'object' && item.id === itemId) as Record<string, unknown> | undefined
        : undefined;
      const oldItem = findItem(oldValue);
      const newItem = findItem(newValue);
      if (!newItem) return false;
      const urlProp = ref.urlProp ?? oldRef.urlProp ?? binding?.itemUrlProp ?? (typeof oldItem?.image === 'string' ? 'image' : 'url');
      return oldItem?.[urlProp] === newItem[urlProp];
    }
    return typeof oldValue === 'string' || typeof newValue === 'string'
      ? oldValue === newValue
      : true;
  });
  return kept.length === refs.length ? next : withReferences(next, kept);
}

/**
 * Shared by the saved-source picker and the host's source store/create flow.
 * Unknown capabilities remain selectable; known incompatibilities carry the
 * same explanation everywhere. Prefer a compatible binding when a widget
 * accepts the same transport through more than one binding.
 */
export function matchSourceToBindings(
  source: LinkedSource,
  bindings: SourceBinding[],
): SourceBindingMatch | undefined {
  let firstMatch: SourceBindingMatch | undefined;
  for (const binding of bindings) {
    if (!binding.types.includes(source.sourceType)) continue;
    if (binding.matchSource && !binding.matchSource(source)) continue;
    const requirement = meetsRequirement(source.capabilities, binding.requires);
    const match = { binding, compatible: requirement.ok, reason: requirement.reason };
    if (match.compatible) return match;
    firstMatch ??= match;
  }
  return firstMatch;
}

/**
 * Removing a reference must also remove the URL it copied. Leaving that URL
 * behind silently keeps fetching the old source while the editor says Demo.
 * A widget can reset additional source-specific state through removeSource.
 */
export function removeSourceBinding(
  data: Record<string, unknown>,
  binding?: SourceBinding,
  reference?: SourceReference,
): Record<string, unknown> {
  const ref = reference ?? getSourceReference(data);
  const refs = getSourceReferences(data).filter((candidate) =>
    !ref || referenceKey(candidate) !== referenceKey(ref),
  );
  const next = { ...data };
  delete next.__sourceRef;
  delete next.__sourceRefs;
  const propName = ref?.propName ?? binding?.propName;
  const collection = Boolean(ref?.itemId || binding?.multiple);
  if (propName && collection && Array.isArray(next[propName])) {
    const itemId = ref?.itemId ?? ref?.sourceId;
    next[propName] = (next[propName] as unknown[]).filter((item) =>
      !item || typeof item !== 'object' || (item as Record<string, unknown>).id !== itemId,
    );
  } else if (propName && !collection) {
    delete next[propName];
  }
  // Keep manual/other managed items when removing one image from a carousel.
  const hasRemainingItems = collection && propName && Array.isArray(next[propName]) && (next[propName] as unknown[]).length > 0;
  const result = { ...next, ...(!hasRemainingItems ? binding?.removeSource?.(next) ?? {} : {}) };
  return withReferences(result, refs);
}

/** Apply a validated source through the widget's mapping and save its identity. */
export function applySourceBinding(
  source: LinkedSource,
  binding: SourceBinding,
  data: Record<string, unknown>,
  previousBinding?: SourceBinding,
): Record<string, unknown> {
  if (!matchSourceToBindings(source, [binding])?.compatible) {
    throw new Error('This source is not compatible with the widget.');
  }
  const previousRef = getSourceReference(data);
  const previousCollection = Boolean(previousRef?.itemId || previousBinding?.multiple);
  // A selection changes a scalar connection, but must never remove an image
  // just because the author is adding another image or switching feed modes.
  let current = previousRef && !previousCollection
    ? removeSourceBinding(data, previousBinding)
    : { ...data };
  // Linking a host-managed source must not retain a legacy direct endpoint
  // (which can include credentials) already stored under the same prop.
  if (binding.mode === 'reference' && !binding.multiple) delete current[binding.propName];
  const urlProp = binding.itemUrlProp ?? 'url';
  const currentItems = Array.isArray(current[binding.propName]) ? current[binding.propName] as unknown[] : [];
  if (binding.multiple) {
    // Older carousels kept only the latest collection link. Upgrade that
    // identifiable item when the author adds another source.
    current = withReferences(current, getSourceReferences(current).map((ref) =>
      ref.propName === binding.propName && !ref.itemId && currentItems.some((item) =>
        item && typeof item === 'object' && (item as Record<string, unknown>).id === ref.sourceId,
      ) ? { ...ref, itemId: ref.sourceId, urlProp } : ref,
    ));
  }
  const mapped = binding.applySource
    ? binding.applySource(source, current)
    : binding.multiple
      ? { [binding.propName]: [...currentItems, { id: source._id, ...(binding.mode === 'reference' ? {} : { [urlProp]: source.url }) }] }
      : binding.mode === 'reference' ? {} : { [binding.propName]: source.url };
  const next = {
    ...current,
    ...mapped,
  };
  const reference: SourceReference = {
    sourceId: source._id,
    propName: binding.propName,
    ...(binding.mode === 'reference' ? { mode: 'reference' as const } : {}),
    ...(binding.multiple ? { itemId: source._id, urlProp } : {}),
  };

  if (binding.multiple) {
    const items = next[binding.propName];
    if (!Array.isArray(items)) throw new Error('A multiple-source binding must return a list of items.');
    // applySource can decorate a slide/poster, but its id must remain stable so
    // edits, reordering and source URL propagation address the same item.
    const linkedItems = items.filter((item) => item && typeof item === 'object' && (item as Record<string, unknown>).id === source._id);
    const selectedItem = linkedItems.at(-1);
    if (!selectedItem) throw new Error('A multiple-source binding must give its item the saved source id.');
    let inserted = false;
    next[binding.propName] = items.flatMap((item) => {
      if (!item || typeof item !== 'object' || (item as Record<string, unknown>).id !== source._id) return [item];
      if (inserted) return [];
      inserted = true;
      return [selectedItem];
    });
  }

  const refs = getSourceReferences(next).filter((ref) =>
    binding.multiple
      ? referenceKey(ref) !== referenceKey(reference)
      : ref.propName !== binding.propName,
  );
  return withReferences(next, [...refs, reference]);
}
