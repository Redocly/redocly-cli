import type { Plugin } from '@redocly/openapi-core';

import { presets } from './config/presets/index.js';

export { presets };

const PREFIX = 'recheck/';

/** The Recheck presets as a plugin for `loadConfig` and `createConfig` of `@redocly/openapi-core`. */
export const recheckPresetsPlugin: Plugin = {
  id: 'recheck',
  configs: Object.fromEntries(
    Object.entries(presets).map(([name, rules]) => [
      name.slice(PREFIX.length),
      { recheck: { rules } },
    ])
  ),
};
