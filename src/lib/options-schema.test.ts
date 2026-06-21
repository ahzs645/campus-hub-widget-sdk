import { describe, expect, it } from 'vitest'
import {
  defaultsFromSchema,
  isFieldValueMissing,
  isFieldVisible,
  requiredFields,
  type WidgetOptionsSchema,
} from './options-schema'

const schema: WidgetOptionsSchema = [
  { name: 'title', label: 'Title', fieldType: 'string', default: 'Hi' },
  { name: 'count', label: 'Count', fieldType: 'number' },
  { name: 'enabled', label: 'Enabled', fieldType: 'boolean' },
  { name: 'note', label: 'Note', fieldType: 'text' },
  { name: 'url', label: 'URL', fieldType: 'url', required: true },
]

describe('defaultsFromSchema', () => {
  it('derives defaults by type', () => {
    expect(defaultsFromSchema(schema)).toEqual({
      title: 'Hi',
      count: 0,
      enabled: false,
      note: '',
      url: '',
    })
  })
})

describe('requiredFields', () => {
  it('returns only required fields', () => {
    expect(requiredFields(schema).map((f) => f.name)).toEqual(['url'])
  })
})

describe('isFieldVisible', () => {
  it('is visible without a condition', () => {
    expect(isFieldVisible({}, {})).toBe(true)
  })

  it('matches a scalar condition', () => {
    expect(isFieldVisible({ showIf: { field: 'mode', equals: 'a' } }, { mode: 'a' })).toBe(true)
    expect(isFieldVisible({ showIf: { field: 'mode', equals: 'a' } }, { mode: 'b' })).toBe(false)
  })

  it('matches an array condition', () => {
    expect(
      isFieldVisible({ showIf: { field: 'mode', equals: ['a', 'b'] } }, { mode: 'b' }),
    ).toBe(true)
  })
})

describe('isFieldValueMissing', () => {
  it('treats booleans as always present', () => {
    expect(isFieldValueMissing({ fieldType: 'boolean' }, false)).toBe(false)
  })

  it('detects missing numbers but not zero', () => {
    expect(isFieldValueMissing({ fieldType: 'number' }, undefined)).toBe(true)
    expect(isFieldValueMissing({ fieldType: 'number' }, Number.NaN)).toBe(true)
    expect(isFieldValueMissing({ fieldType: 'number' }, 0)).toBe(false)
  })

  it('detects empty strings', () => {
    expect(isFieldValueMissing({ fieldType: 'string' }, '')).toBe(true)
    expect(isFieldValueMissing({ fieldType: 'string' }, '  ')).toBe(true)
    expect(isFieldValueMissing({ fieldType: 'string' }, 'x')).toBe(false)
  })
})
