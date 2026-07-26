import { defineWidget } from '@firstform/campus-hub-widget-sdk';

/**
 * Keep this module free of component and library imports — it is loaded by
 * every host that reads the widget catalogue, on every page load.
 */
export default defineWidget({
  manifest: {
    type: 'hello-campus',
    name: 'Hello Campus',
    description: 'Starter widget showing the manifest/loader split',
    icon: 'sparkles',
    minW: 2,
    minH: 1,
    defaultW: 3,
    defaultH: 2,
    defaultProps: {
      message: 'Hello, campus!',
    },
    // A declarative schema means the editor renders the options form for you,
    // and no options bundle ships at all.
    optionsSchema: [
      {
        name: 'message',
        label: 'Message',
        fieldType: 'text',
        default: 'Hello, campus!',
        helpText: 'Shown in the middle of the widget.',
      },
    ],
  },
  load: () => import('./HelloCampus'),
});
