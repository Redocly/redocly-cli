import { logger, pluralize } from '@redocly/openapi-core';
import type { Plugin } from '@redocly/openapi-core';

type PluginFunction = () => Plugin;

type PluginsModule = {
  default: PluginFunction[];
};

export async function evaluatePluginsFromCode(
  pluginsCode?: string,
  verbose = false
): Promise<Plugin[]> {
  if (!pluginsCode) {
    if (verbose) {
      logger.info(`No plugins code provided to evaluate.\n`);
    }
    return [];
  }

  if (verbose) {
    logger.info(`Starting plugin evaluation...\n`);
  }

  try {
    const dirname = import.meta.url;
    const pluginsCodeWithDirname = pluginsCode.replaceAll('__redocly_dirname', `"${dirname}"`);

    if (verbose) {
      logger.info(`Encoding plugins code to base64 data URI...\n`);
    }

    const base64 = btoa(pluginsCodeWithDirname);
    const dataUri = `data:text/javascript;base64,${base64}`;

    if (verbose) {
      logger.info(`Importing plugins module dynamically...\n`);
    }

    const module: PluginsModule = await import(dataUri);
    const evaluatedPlugins = module.default.map((pluginFunction) => pluginFunction());

    if (verbose) {
      logger.info(
        `Successfully evaluated ${evaluatedPlugins.length} ${pluralize(
          'plugin',
          evaluatedPlugins.length
        )}.\n`
      );
      evaluatedPlugins.forEach((plugin, index) => {
        logger.info(`   Plugin ${index + 1}: ${plugin.id || 'unnamed'}\n`);
      });
    }

    return evaluatedPlugins;
  } catch (error) {
    if (verbose) {
      logger.error(`❌ Failed to evaluate plugins.\n`);
      logger.error(`Error details: ${error.message}\n`);
      if (error.stack) {
        logger.error(`Stack trace:\n${error.stack}\n`);
      }
    }
    logger.warn(`Something went wrong during plugins evaluation.`);
    return [];
  }
}
