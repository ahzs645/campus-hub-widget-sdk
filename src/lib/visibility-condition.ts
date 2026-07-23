export type VisibilityScalar = string | number | boolean | null;

export interface VisibilitySignal {
  key: string;
  value: VisibilityScalar;
  revision: string;
  updatedAt: number;
  expiresAt?: number;
}

export interface SimpleVisibilityCondition {
  source: {
    kind: 'signal';
    key: string;
  };
  operator: 'equals' | 'not-equals' | 'truthy' | 'falsy';
  value?: VisibilityScalar;
  behavior: 'while-matched' | 'pulse';
  autoHideSeconds?: number;
}

export const VISIBILITY_SIGNAL_KEY_MAX_LENGTH = 64;
export const VISIBILITY_SIGNAL_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isVisibilityScalar(value: unknown): value is VisibilityScalar {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

export function isVisibilitySignalKey(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= VISIBILITY_SIGNAL_KEY_MAX_LENGTH &&
    VISIBILITY_SIGNAL_KEY_PATTERN.test(value)
  );
}

export function parseVisibilityScalar(value: string): VisibilityScalar {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed !== '') {
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;
  }
  return value;
}

export function normalizeVisibilityCondition(
  value: unknown,
): SimpleVisibilityCondition | undefined {
  if (!isRecord(value) || !isRecord(value.source)) return undefined;
  if (value.source.kind !== 'signal' || typeof value.source.key !== 'string') {
    return undefined;
  }

  const key = value.source.key.trim();
  if (!isVisibilitySignalKey(key)) return undefined;

  const operator = value.operator;
  if (
    operator !== 'equals' &&
    operator !== 'not-equals' &&
    operator !== 'truthy' &&
    operator !== 'falsy'
  ) {
    return undefined;
  }

  const behavior = value.behavior;
  if (behavior !== 'while-matched' && behavior !== 'pulse') return undefined;

  const requiresValue = operator === 'equals' || operator === 'not-equals';
  const expectedValue = value.value;
  if (requiresValue && !isVisibilityScalar(expectedValue)) return undefined;

  const autoHideSeconds = value.autoHideSeconds;
  if (
    autoHideSeconds !== undefined &&
    (typeof autoHideSeconds !== 'number' ||
      !Number.isFinite(autoHideSeconds) ||
      autoHideSeconds < 0)
  ) {
    return undefined;
  }

  return {
    source: { kind: 'signal', key },
    operator,
    ...(requiresValue && isVisibilityScalar(expectedValue)
      ? { value: expectedValue }
      : {}),
    behavior,
    ...(behavior === 'pulse' && autoHideSeconds !== undefined
      ? { autoHideSeconds }
      : {}),
  };
}

export function evaluateVisibilityCondition(
  condition: SimpleVisibilityCondition,
  signals: ReadonlyMap<string, VisibilitySignal>,
): boolean {
  const signal = signals.get(condition.source.key);
  if (!signal) return false;

  switch (condition.operator) {
    case 'equals':
      return signal.value === condition.value;
    case 'not-equals':
      return signal.value !== condition.value;
    case 'truthy':
      return Boolean(signal.value);
    case 'falsy':
      return !signal.value;
  }
}
