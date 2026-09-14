import { loadConfig } from '@redocly/openapi-core';
import path from 'node:path';

import { packagePluginId, variantByPluginId } from './expected-plugins.mjs';

const expectedPluginIds = [...Object.keys(variantByPluginId), packagePluginId];

const config = await loadConfig({ configPath: path.resolve('redocly.yaml') });
const loadedPluginIds = config.plugins.map((plugin) => plugin.id);
const missing = expectedPluginIds.filter((pluginId) => !loadedPluginIds.includes(pluginId));

if (missing.length) {
  console.error(`Plugins missing from the bundled config: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`✅ Bundled openapi-core loaded ${expectedPluginIds.length} plugins from disk.`);
