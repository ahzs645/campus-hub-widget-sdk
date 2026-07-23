import { describe, expect, it } from 'vitest';
import {
  evaluateVisibilityCondition,
  type SimpleVisibilityCondition,
  type VisibilityScalar,
  type VisibilitySignal,
} from './visibility-condition';

function condition(
  operator: SimpleVisibilityCondition['operator'],
  value?: VisibilityScalar,
): SimpleVisibilityCondition {
  return {
    source: { kind: 'signal', key: 'emergency' },
    operator,
    ...(operator === 'equals' || operator === 'not-equals' ? { value } : {}),
    behavior: 'while-matched',
  };
}

function signals(value?: VisibilityScalar) {
  const map = new Map<string, VisibilitySignal>();
  if (value !== undefined) {
    map.set('emergency', {
      key: 'emergency',
      value,
      revision: 'revision-1',
      updatedAt: 1,
    });
  }
  return map;
}

describe('evaluateVisibilityCondition', () => {
  it('matches equals and not-equals using scalar identity', () => {
    expect(evaluateVisibilityCondition(condition('equals', true), signals(true))).toBe(true);
    expect(evaluateVisibilityCondition(condition('equals', 1), signals('1'))).toBe(false);
    expect(evaluateVisibilityCondition(condition('not-equals', null), signals(false))).toBe(true);
    expect(evaluateVisibilityCondition(condition('not-equals', 'open'), signals('open'))).toBe(false);
  });

  it('returns false when the signal is missing for every operator', () => {
    expect(evaluateVisibilityCondition(condition('equals', true), signals())).toBe(false);
    expect(evaluateVisibilityCondition(condition('not-equals', true), signals())).toBe(false);
    expect(evaluateVisibilityCondition(condition('truthy'), signals())).toBe(false);
    expect(evaluateVisibilityCondition(condition('falsy'), signals())).toBe(false);
  });

  it.each([
    [true, true],
    [false, false],
    [1, true],
    [0, false],
    ['false', true],
    ['', false],
    [null, false],
  ] satisfies Array<[VisibilityScalar, boolean]>)(
    'evaluates truthy for %j',
    (value, expected) => {
      expect(evaluateVisibilityCondition(condition('truthy'), signals(value))).toBe(expected);
    },
  );

  it.each([
    [true, false],
    [false, true],
    [1, false],
    [0, true],
    ['false', false],
    ['', true],
    [null, true],
  ] satisfies Array<[VisibilityScalar, boolean]>)(
    'evaluates falsy for %j',
    (value, expected) => {
      expect(evaluateVisibilityCondition(condition('falsy'), signals(value))).toBe(expected);
    },
  );
});
