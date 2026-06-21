/**
 * Declarative, typed widget settings schema — a campus-hub adaptation of
 * TRMNL's plugin `custom_fields` (db/data/form_fields.yml). A widget can
 * declare an `optionsSchema` on its definition instead of hand-writing an
 * OptionsComponent; SchemaOptionsForm renders it with the existing Form*
 * primitives, and the template linter checks `required` fields against it.
 */

export type WidgetFieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'url'
  | 'time_zone'
  | 'date'
  | 'password'
  | 'media'

export interface WidgetFieldOption {
  value: string
  label: string
}

/** Show a field only when another field's value matches. */
export interface WidgetFieldCondition {
  field: string
  equals: unknown | unknown[]
}

export interface WidgetOptionsField {
  /** Key written into the widget's props (e.g. 'apiUrl'). */
  name: string
  label: string
  fieldType: WidgetFieldType
  required?: boolean
  default?: unknown
  /** Options for `select`. */
  options?: WidgetFieldOption[]
  helpText?: string
  placeholder?: string
  /** Groups fields under an OptionsSection heading. Omit for a flat group. */
  section?: string
  /** For string/url: show the Media library "Browse" button. */
  media?: boolean
  mediaAccept?: string
  /** For number fields. */
  min?: number
  max?: number
  step?: number
  unit?: string
  /** Conditional visibility. */
  showIf?: WidgetFieldCondition
}

export type WidgetOptionsSchema = WidgetOptionsField[]

/** Build the default props object implied by a schema. */
export function defaultsFromSchema(schema: WidgetOptionsSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of schema) {
    if (field.default !== undefined) out[field.name] = field.default
    else if (field.fieldType === 'boolean') out[field.name] = false
    else if (field.fieldType === 'number') out[field.name] = 0
    else out[field.name] = ''
  }
  return out
}

export function requiredFields(schema: WidgetOptionsSchema): WidgetOptionsField[] {
  return schema.filter((field) => field.required)
}

/** Whether a field should render given the current option values. */
export function isFieldVisible(
  field: Pick<WidgetOptionsField, 'showIf'>,
  data: Record<string, unknown>,
): boolean {
  if (!field.showIf) return true
  const current = data[field.showIf.field]
  const { equals } = field.showIf
  return Array.isArray(equals) ? equals.includes(current) : current === equals
}

/** Whether a field's value counts as "missing" (used for required checks). */
export function isFieldValueMissing(
  field: Pick<WidgetOptionsField, 'fieldType'>,
  value: unknown,
): boolean {
  if (field.fieldType === 'boolean') return false // a toggle always has a value
  if (field.fieldType === 'number') {
    return value === undefined || value === null || Number.isNaN(value as number)
  }
  return value === undefined || value === null || String(value).trim() === ''
}
