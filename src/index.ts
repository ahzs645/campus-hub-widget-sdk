// === Widget Registry ===
export {
  registerWidget,
  getWidget,
  getAllWidgets,
  getWidgetComponent,
  buildWidgetInitialProps,
  registerWidgetLoader,
  getWidgetLoader,
  getAllWidgetLoaders,
  type WidgetDefinition,
  type WidgetComponentProps,
  type WidgetOptionsProps,
  type WidgetDefaultPropsFactory,
  type SourceType,
  type SourceBinding,
} from './lib/widget-registry';

export {
  WidgetOptionsSurfaceProvider,
  useWidgetOptionsSurface,
  shouldHideGalleryControl,
  type WidgetOptionsSurface,
  type GalleryControlMetadata,
} from './lib/widget-options-surface';

// === Data Utilities ===
export {
  fetchJsonWithCache,
  fetchTextWithCache,
  buildCacheKey,
  buildProxyUrl,
  getCorsProxyUrl,
  isEntryFresh,
  type CacheEntry,
  type FetchCacheOptions,
} from './lib/data-cache';

export {
  parseICal,
  parseRss,
  type RssItem,
  type ICalEvent,
} from './lib/feeds';

export {
  fetchFormattedRss,
  fetchRemoteFeed,
  type RssFormatter,
  type FormattedRssContent,
  type RemoteFeedItem,
  type RemoteFeedResult,
} from './lib/feed-sources';

// === Video Utilities ===
export {
  detectVideoSource,
  extractVideoId as extractVideoIdFromUrl,
  getVideoThumbnailUrl,
  fetchOEmbed,
  type VideoSource,
  type VideoMeta,
} from './lib/video-utils';

// === Hooks ===
export { useFitScale, useAdaptiveFitScale } from './hooks/useFitScale';
export { useTextResize } from './hooks/useTextResize';
export { useWakeLock } from './hooks/useWakeLock';
export { useEvents, formatDate, formatTime, type CalendarEvent, type UseEventsOptions } from './hooks/useEvents';

// === Icon Names ===
export type { IconName } from './lib/icon-names';

// === Components ===
export { default as AppIcon } from './components/AppIcon';

// === UI Form Components ===
export { default as FormInput } from './components/ui/FormInput';
export { default as FormSelect } from './components/ui/FormSelect';
export { default as FormSwitch } from './components/ui/FormSwitch';
export { default as FormStepper } from './components/ui/FormStepper';

// === Primitives (reusable themed UI building blocks for widgets) ===
export {
  ThemedContainer,
  ThemedText,
  ThemedCard,
  Badge,
  ProgressBar,
  DotIndicator,
  SectionHeader,
  ScrollableList,
  PulsingDot,
  IconText,
  OptionsPanel,
  OptionsSection,
  OptionsPreview,
  PillIndicator,
  MarqueeText,
  DarkContainer,
  FadeOverlay,
  Skeleton,
  StatDisplay,
  type WidgetTheme,
} from './components/primitives';

// === Display Widget Components ===
export { DISPLAY_WIDGET_COMPONENTS, preloadDisplayWidgetComponent } from './lib/display-widget-components';

// === Dot Matrix ===
export { DotMatrixText, textToChars, FONT, type DotChar } from './lib/dot-matrix';

// === Signaling (stub types — real implementation loaded dynamically by widgets that need it) ===
export type { SignalingClient, SignalingConfig } from '@firstform/campus-hub-engine/src/lib/signaling-client';
export { createSignalingClient } from '@firstform/campus-hub-engine/src/lib/signaling-client';
