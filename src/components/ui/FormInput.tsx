import { InputHTMLAttributes } from 'react';
import {
  shouldHideGalleryControl,
  useWidgetOptionsSurface,
  useMediaPicker,
} from '../../lib/widget-options-surface';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  name: string;
  onChange: (name: string, value: string | number | boolean) => void;
  /** When true, show a "Browse" button that opens the host app's Media library. */
  media?: boolean;
  /** Accept filter passed to the media picker (defaults to images + video). */
  mediaAccept?: string;
}

export default function FormInput({ label, name, type = 'text', value, onChange, media, mediaAccept, ...props }: FormInputProps) {
  const surface = useWidgetOptionsSurface();
  const requestMediaPick = useMediaPicker();

  if (
    surface === 'gallery' &&
    shouldHideGalleryControl({ label, name, type })
  ) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    onChange(name, val);
  };

  const showBrowse = Boolean(media && requestMediaPick);

  const input = (
    <input
      type={type}
      name={name}
      value={value ?? ''}
      onChange={handleChange}
      className="w-full px-3 py-2 rounded-lg bg-[var(--ui-input-bg)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:ring-2 outline-none transition-colors"
      style={{
        border: '1px solid var(--ui-input-border)',
      }}
      {...props}
    />
  );

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[var(--ui-text-muted)]">{label}</label>
      {showBrowse ? (
        <div className="flex gap-2">
          {input}
          <button
            type="button"
            onClick={() =>
              requestMediaPick?.({
                accept: mediaAccept ?? 'image/*,video/*',
                onSelect: (url) => onChange(name, url),
              })
            }
            className="shrink-0 rounded-lg px-3 py-2 text-sm text-[var(--ui-text)] transition-colors hover:bg-[var(--ui-input-bg)]"
            style={{ border: '1px solid var(--ui-input-border)' }}
          >
            Browse
          </button>
        </div>
      ) : (
        input
      )}
    </div>
  );
}
