import { registerWidgetModule } from '@firstform/campus-hub-widget-sdk';
import helloCampus from './hello-campus/meta';

// The host imports this module once, via `virtual:campus-hub-widgets`.
// Only metadata is pulled in here — components stay behind their loaders.
registerWidgetModule(helloCampus);

export { helloCampus };
