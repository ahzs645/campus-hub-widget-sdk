import {
  shouldHideGalleryControl,
  useWidgetOptionsSurface,
} from '../../lib/widget-options-surface';
import { useEffect, useRef, useState } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (name: string, value: string) => void;
}

export default function FormSelect({ label, name, value, options, onChange }: FormSelectProps) {
  const surface = useWidgetOptionsSurface();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  if (
    surface === 'gallery' &&
    shouldHideGalleryControl({ label, name, type: 'select' })
  ) {
    return null;
  }

  return (
    <div className="space-y-1" ref={rootRef}>
      <label className="block text-sm font-medium text-[var(--ui-text-muted)]">{label}</label>
      <div className="relative">
        <button
          type="button"
          name={name}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg outline-none transition-colors bg-[var(--ui-input-bg)] text-[var(--ui-text)]"
          style={{
            border: '1px solid var(--ui-input-border)',
          }}
        >
          <span className="min-w-0 truncate">{selected?.label ?? 'Select...'}</span>
          <span className="shrink-0 text-[var(--ui-text-muted)]">v</span>
        </button>
        {open && (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg bg-[var(--ui-input-bg)] p-1 shadow-lg"
            style={{
              border: '1px solid var(--ui-input-border)',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(name, opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--ui-text)] hover:bg-black/5"
              >
                <span className="min-w-0 truncate">{opt.label}</span>
                {opt.value === value && <span className="shrink-0">Selected</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="hidden"
        name={name}
        value={value}
        style={{
          display: 'none',
        }}
        readOnly
      />
    </div>
  );
}
