import { loadConfig, logger } from '@redocly/openapi-core';
import path from 'node:path';

const config = await loadConfig({ configPath: path.resolve('redocly.yaml') });
const pluginIds = config.plugins.map((plugin) => plugin.id).filter(Boolean);

logger.output(`Loaded plugins: ${pluginIds.join(', ')}\n`);
