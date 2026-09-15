import { logger, type Plugin } from '@redocly/openapi-core';
import { pathToFileURL } from 'node:url';

type PluginFunction = () => Plugin;

type PluginsModule = {
  default: PluginFunction[];
};

export async function evaluatePluginsFromCode(
  pluginsCode?: string,
  basePath?: string
): Promise<Plugin[]> {
  if (!pluginsCode) {
    return [];
  }

  try {
    const dirname = pathToFileURL(basePath ?? process.cwd()).href + '/';
    const pluginsCodeWithDirname = pluginsCode.replaceAll('__redocly_dirname', `"${dirname}"`);
    const dataUri = `data:text/javascript;base64,${btoa(pluginsCodeWithDirname)}`;

    const module: PluginsModule = await import(dataUri);

    return module.default.map((pluginFunction) => pluginFunction());
  } catch (error) {
    logger.warn(`Something went wrong during plugins evaluation: ${error.message}\n`);
    return [];
  }
}
