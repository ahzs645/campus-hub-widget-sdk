import type { WidgetComponentProps } from '@firstform/campus-hub-widget-sdk';

interface HelloCampusConfig {
  message?: string;
}

export default function HelloCampus({ config, theme }: WidgetComponentProps) {
  const { message = 'Hello, campus!' } = (config ?? {}) as HelloCampusConfig;

  return (
    <div
      className="h-full w-full rounded-2xl flex items-center justify-center p-6"
      style={{ backgroundColor: `${theme.primary}33` }}
    >
      <span
        className="text-3xl font-bold text-center"
        style={{ color: theme.accent }}
      >
        {message}
      </span>
    </div>
  );
}
