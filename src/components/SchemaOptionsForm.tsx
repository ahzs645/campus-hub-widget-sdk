import { Fragment } from 'react'
import FormInput from './ui/FormInput'
import FormSelect from './ui/FormSelect'
import FormSwitch from './ui/FormSwitch'
import { OptionsPanel, OptionsSection } from './primitives'
import {
  isFieldVisible,
  type WidgetOptionsField,
  type WidgetOptionsSchema,
} from '../lib/options-schema'
import type { WidgetOptionsProps } from '../lib/widget-registry'

/** Common IANA zones; falls back to this when Intl enumeration is unavailable. */
const FALLBACK_TIME_ZONES = [
  'UTC',
  'America/Vancouver',
  'America/Edmonton',
  'America/Toronto',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
]

function timeZoneOptions() {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  const zones =
    typeof intl.supportedValuesOf === 'function'
      ? intl.supportedValuesOf('timeZone')
      : FALLBACK_TIME_ZONES
  return zones.map((z) => ({ value: z, label: z }))
}

const inputClasses =
  'w-full px-3 py-2 rounded-lg bg-[var(--ui-input-bg)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:ring-2 outline-none transition-colors'

interface SchemaOptionsFormProps extends WidgetOptionsProps {
  schema: WidgetOptionsSchema
}

/**
 * Renders a widget's declarative options schema into a form using the SDK's
 * Form* primitives. Drop-in for a bespoke OptionsComponent: same
 * `{ data, onChange }` contract.
 */
export default function SchemaOptionsForm({ schema, data, onChange }: SchemaOptionsFormProps) {
  const set = (name: string, value: unknown) => onChange({ ...data, [name]: value })

  const renderField = (field: WidgetOptionsField) => {
    if (!isFieldVisible(field, data)) return null
    const value = data[field.name]
    const label = `${field.label}${field.required ? ' *' : ''}`

    let control: React.ReactNode
    switch (field.fieldType) {
      case 'boolean':
        control = (
          <FormSwitch label={label} name={field.name} checked={Boolean(value)} onChange={set} />
        )
        break
      case 'select':
        control = (
          <FormSelect
            label={label}
            name={field.name}
            value={String(value ?? '')}
            options={field.options ?? []}
            onChange={set}
          />
        )
        break
      case 'time_zone':
        control = (
          <FormSelect
            label={label}
            name={field.name}
            value={String(value ?? '')}
            options={timeZoneOptions()}
            onChange={set}
          />
        )
        break
      case 'text':
        control = (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--ui-text-muted)]">{label}</label>
            <textarea
              name={field.name}
              value={String(value ?? '')}
              placeholder={field.placeholder}
              onChange={(e) => set(field.name, e.target.value)}
              rows={3}
              className={inputClasses}
              style={{ border: '1px solid var(--ui-input-border)' }}
            />
          </div>
        )
        break
      case 'number':
        control = (
          <FormInput
            label={label}
            name={field.name}
            type="number"
            value={typeof value === 'number' ? value : ''}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={set}
          />
        )
        break
      default: {
        // string | url | password | date | media
        const type =
          field.fieldType === 'url'
            ? 'url'
            : field.fieldType === 'password'
              ? 'password'
              : field.fieldType === 'date'
                ? 'date'
                : 'text'
        control = (
          <FormInput
            label={label}
            name={field.name}
            type={type}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            media={field.media || field.fieldType === 'media'}
            mediaAccept={field.mediaAccept}
            onChange={set}
          />
        )
      }
    }

    return (
      <div key={field.name}>
        {control}
        {field.helpText && (
          <p className="text-xs text-[var(--ui-text-muted)] mt-1">{field.helpText}</p>
        )}
      </div>
    )
  }

  // Partition into an optional leading untitled group + named sections,
  // preserving first-seen order of sections.
  const ungrouped = schema.filter((f) => !f.section)
  const sectionOrder: string[] = []
  const bySection = new Map<string, WidgetOptionsField[]>()
  for (const field of schema) {
    if (!field.section) continue
    if (!bySection.has(field.section)) {
      bySection.set(field.section, [])
      sectionOrder.push(field.section)
    }
    bySection.get(field.section)!.push(field)
  }

  let hasRenderedBefore = ungrouped.length > 0

  return (
    <OptionsPanel>
      {ungrouped.length > 0 && <div className="space-y-4">{ungrouped.map(renderField)}</div>}
      {sectionOrder.map((section) => {
        const divider = hasRenderedBefore
        hasRenderedBefore = true
        return (
          <OptionsSection key={section} title={section} divider={divider}>
            {bySection.get(section)!.map((field) => (
              <Fragment key={field.name}>{renderField(field)}</Fragment>
            ))}
          </OptionsSection>
        )
      })}
    </OptionsPanel>
  )
}
