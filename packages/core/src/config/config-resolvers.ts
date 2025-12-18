import * as path from 'node:path';
import * as url from 'node:url';
import * as fs from 'node:fs';
import module from 'node:module';
import { isAbsoluteUrl } from '../ref-utils.js';
import { isNotString } from '../utils/is-not-string.js';
import { isString } from '../utils/is-string.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isDefined } from '../utils/is-defined.js';
import { resolveDocument, BaseResolver, Source } from '../resolve.js';
import { defaultPlugin } from './builtIn.js';
import {
  deepCloneMapWithJSON,
  isCommonJsPlugin,
  isDeprecatedPluginFormat,
  mergeExtends,
  parsePresetName,
  prefixRules,
} from './utils.js';
import { getResolveConfig } from './get-resolve-config.js';
import { isBrowser } from '../env.js';
import { colorize, logger } from '../logger.js';
import { NormalizedConfigTypes } from '../types/redocly-yaml.js';
import { bundleConfig, collectConfigPlugins } from '../bundle/bundle.js';
import { CONFIG_FILE_NAME, DEFAULT_CONFIG, DEFAULT_PROJECT_PLUGIN_PATHS } from './constants.js';

import type {
  Plugin,
  RawUniversalConfig,
  ResolvedConfig,
  RawGovernanceConfig,
  ImportedPlugin,
} from './types.js';
import type { Document, ResolvedRefMap } from '../resolve.js';
import type { UserContext, NormalizedProblem } from '../walk.js';
import type { Location } from '../ref-utils.js';

// Cache instantiated plugins during a single execution
const pluginsCache: Map<string, Plugin[]> = new Map();

export type PluginResolveInfo = {
  absolutePath: string;
  rawPath: string;
  isModule: boolean;
};

export type ConfigOptions = {
  rawConfigDocument?: Document;
  configPath?: string;
  externalRefResolver?: BaseResolver;
  customExtends?: string[];
};

export async function resolveConfig({
  rawConfigDocument,
  configPath,
  externalRefResolver,
  customExtends,
}: ConfigOptions): Promise<{
  resolvedConfig: ResolvedConfig;
  resolvedRefMap: ResolvedRefMap;
  plugins: Plugin[];
  configProblems: NormalizedProblem[];
}> {
  const config = rawConfigDocument === undefined ? DEFAULT_CONFIG : rawConfigDocument.parsed;

  if (customExtends !== undefined && isPlainObject(config)) {
    config.extends = customExtends;
  }
  if (isPlainObject<RawUniversalConfig>(config) && config?.extends?.some(isNotString)) {
    throw new Error(`Configuration format not detected in extends: values must be strings.`);
  }

  const rootDocument = rawConfigDocument ?? {
    source: new Source(configPath ?? '', JSON.stringify(config)),
    parsed: config,
  };
  const resolvedRefMap = await resolveDocument({
    rootDocument,
    rootType: NormalizedConfigTypes.ConfigRoot,
    externalRefResolver:
      externalRefResolver ??
      new BaseResolver(getResolveConfig((config as RawUniversalConfig)?.resolve)),
  });

  let pluginsOrPaths: (Plugin | PluginResolveInfo)[] = [];
  let resolvedPlugins: Plugin[];
  let rootConfigDir: string = '';
  if (isBrowser) {
    // In browser, we don't support plugins from config file yet
    const instantiatedPlugins = ((config as RawUniversalConfig)?.plugins || []).filter(
      (p) => !isString(p)
    ) as Plugin[];
    resolvedPlugins = [...instantiatedPlugins, defaultPlugin];
  } else {
    rootConfigDir = path.dirname(configPath ?? '');
    pluginsOrPaths = collectConfigPlugins(rootDocument, resolvedRefMap, rootConfigDir);
    const plugins = await resolvePlugins(
      pluginsOrPaths.map((p) => (isPluginResolveInfo(p) ? p.absolutePath : p)),
      rootConfigDir
    );
    resolvedPlugins = [...plugins, defaultPlugin];
  }

  const { config: bundledConfig, problems: configProblems } = bundleConfig(
    rootDocument,
    deepCloneMapWithJSON(resolvedRefMap),
    resolvedPlugins
  );

  if (bundledConfig.apis) {
    bundledConfig.apis = Object.fromEntries(
      Object.entries(bundledConfig.apis).map(([key, apiConfig]) => {
        const mergedConfig = mergeExtends([bundledConfig, apiConfig]);
        return [key, { ...apiConfig, ...mergedConfig }];
      })
    );
  }

  const pluginPaths = pluginsOrPaths.length
    ? pluginsOrPaths
        .map((p) =>
          isPluginResolveInfo(p) && p.isModule
            ? p.rawPath
            : p.absolutePath && path.relative(rootConfigDir, p.absolutePath)
        )
        .filter(isDefined)
    : undefined;

  return {
    resolvedConfig: {
      ...bundledConfig,
      plugins: pluginPaths,
    },
    resolvedRefMap,
    plugins: resolvedPlugins,
    configProblems,
  };
}

function getDefaultPluginPath(configDir: string): string | undefined {
  for (const pluginPath of DEFAULT_PROJECT_PLUGIN_PATHS) {
    const absolutePluginPath = path.resolve(configDir, pluginPath);
    if (fs.existsSync(absolutePluginPath)) {
      return pluginPath;
    }
  }
  return;
}

function isPluginResolveInfo(plugin: Plugin | PluginResolveInfo): plugin is PluginResolveInfo {
  return 'isModule' in plugin;
}

export const preResolvePluginPath = (
  plugin: string | Plugin,
  base: string,
  rootConfigDir: string
): Plugin | PluginResolveInfo => {
  if (!isString(plugin)) {
    return plugin;
  }

  const maybeAbsolutePluginPath = path.resolve(path.dirname(base), plugin);

  return fs.existsSync(maybeAbsolutePluginPath)
    ? { absolutePath: maybeAbsolutePluginPath, rawPath: plugin, isModule: false }
    : {
        absolutePath: module.createRequire(import.meta.url ?? __dirname).resolve(plugin, {
          paths: [
            // Plugins imported from the node_modules in the project directory
            rootConfigDir,
            // Plugins imported from the node_modules in the package install directory (for example, npx cache directory)
            import.meta.url ? path.dirname(url.fileURLToPath(import.meta.url)) : __dirname,
          ],
        }),
        isModule: true,
        rawPath: plugin,
      };
};

export async function resolvePlugins(
  plugins: (string | Plugin)[],
  configDir: string
): Promise<Plugin[]> {
  if (!plugins) return [];

  // TODO: implement or reuse Resolver approach so it will work in node and browser envs
  const requireFunc = async (plugin: string | Plugin): Promise<Plugin | Plugin[] | undefined> => {
    if (!isString(plugin)) {
      return plugin;
    }

    try {
      const absolutePluginPath = path.isAbsolute(plugin)
        ? plugin
        : (
            preResolvePluginPath(
              plugin,
              path.join(configDir, CONFIG_FILE_NAME),
              configDir
            ) as PluginResolveInfo
          ).absolutePath;

      if (!pluginsCache.has(absolutePluginPath)) {
        let requiredPlugin: ImportedPlugin | undefined;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore FIXME: investigate if we still need this (2.0)
        if (typeof __webpack_require__ === 'function') {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore FIXME: investigate if we still need this (2.0)
          requiredPlugin = __non_webpack_require__(absolutePluginPath);
        } else {
          const mod = await import(url.pathToFileURL(absolutePluginPath).pathname);
          requiredPlugin = mod.default || mod;
        }

        const pluginCreatorOptions = { contentDir: configDir };

        const requiredPluginInstances = Array.isArray(requiredPlugin)
          ? requiredPlugin
          : [requiredPlugin];
        for (const requiredPluginInstance of requiredPluginInstances) {
          if (requiredPluginInstance?.id && isDeprecatedPluginFormat(requiredPluginInstance)) {
            logger.info(`Deprecated plugin format detected: ${requiredPluginInstance.id}\n`);
          }
        }

        const pluginModule = isDeprecatedPluginFormat(requiredPlugin)
          ? requiredPlugin
          : isCommonJsPlugin(requiredPlugin)
          ? await requiredPlugin(pluginCreatorOptions)
          : await requiredPlugin?.default?.(pluginCreatorOptions);

        const pluginInstances = Array.isArray(pluginModule) ? pluginModule : [pluginModule];

        if (pluginModule) {
          pluginsCache.set(
            absolutePluginPath,
            pluginInstances.map((p) => ({
              ...p,
              path: plugin,
              absolutePath: absolutePluginPath,
            }))
          );
        }
      }

      return pluginsCache.get(absolutePluginPath);
    } catch (e) {
      throw new Error(`Failed to load plugin "${plugin}": ${e.message}\n\n${e.stack}`);
    }
  };

  const seenPluginIds = new Map<string, string>();

  /**
   * Include the default plugin automatically if it's not in configuration
   */
  const defaultPluginPath = getDefaultPluginPath(configDir);
  if (defaultPluginPath) {
    plugins.push(defaultPluginPath);
  }

  const resolvedPlugins: Set<string> = new Set();

  const instances = await Promise.all(
    plugins.map(async (p) => {
      if (isString(p)) {
        if (isAbsoluteUrl(p)) {
          throw new Error(colorize.red(`We don't support remote plugins yet.`));
        }

        if (resolvedPlugins.has(p)) {
          return;
        }

        resolvedPlugins.add(p);
      }

      const pluginInstanceOrInstances = await requireFunc(p);

      if (!pluginInstanceOrInstances) {
        return;
      }

      const pluginInstances = Array.isArray(pluginInstanceOrInstances)
        ? pluginInstanceOrInstances
        : [pluginInstanceOrInstances];

      return (
        await Promise.all(
          pluginInstances.map(async (pluginInstance) => {
            if (!pluginInstance) return;
            const id = pluginInstance.id;
            if (typeof id !== 'string') {
              throw new Error(
                colorize.red(
                  `Plugin must define \`id\` property in ${colorize.blue(p.toString())}.`
                )
              );
            }
            const pluginPath = pluginInstance.absolutePath ?? p.toString();
            const existingPluginPath = seenPluginIds.get(id);
            if (existingPluginPath) {
              if (pluginPath !== existingPluginPath) {
                throw new Error(
                  colorize.red(
                    `Plugin "id" must be unique. Plugin ${colorize.blue(
                      pluginPath
                    )} uses id "${colorize.blue(id)}" already seen in ${colorize.blue(pluginPath)}`
                  )
                );
              }
              return undefined;
            }

            seenPluginIds.set(id, pluginPath);

            const plugin: Plugin = {
              id,
              ...(pluginInstance.configs ? { configs: pluginInstance.configs } : {}),
              ...(pluginInstance.typeExtension
                ? { typeExtension: pluginInstance.typeExtension }
                : {}),
            };

            if (pluginInstance.rules) {
              if (
                !pluginInstance.rules.oas3 &&
                !pluginInstance.rules.oas2 &&
                !pluginInstance.rules.async2 &&
                !pluginInstance.rules.async3 &&
                !pluginInstance.rules.arazzo1 &&
                !pluginInstance.rules.overlay1
              ) {
                throw new Error(
                  `Plugin rules must have \`oas3\`, \`oas2\`, \`async2\`, \`async3\`, \`arazzo\`, or \`overlay1\` rules "${p}.`
                );
              }
              plugin.rules = {};
              if (pluginInstance.rules.oas3) {
                plugin.rules.oas3 = prefixRules(pluginInstance.rules.oas3, id);
              }
              if (pluginInstance.rules.oas2) {
                plugin.rules.oas2 = prefixRules(pluginInstance.rules.oas2, id);
              }
              if (pluginInstance.rules.async2) {
                plugin.rules.async2 = prefixRules(pluginInstance.rules.async2, id);
              }
              if (pluginInstance.rules.async3) {
                plugin.rules.async3 = prefixRules(pluginInstance.rules.async3, id);
              }
              if (pluginInstance.rules.arazzo1) {
                plugin.rules.arazzo1 = prefixRules(pluginInstance.rules.arazzo1, id);
              }
              if (pluginInstance.rules.overlay1) {
                plugin.rules.overlay1 = prefixRules(pluginInstance.rules.overlay1, id);
              }
            }
            if (pluginInstance.preprocessors) {
              if (
                !pluginInstance.preprocessors.oas3 &&
                !pluginInstance.preprocessors.oas2 &&
                !pluginInstance.preprocessors.async2 &&
                !pluginInstance.preprocessors.async3 &&
                !pluginInstance.preprocessors.arazzo1 &&
                !pluginInstance.preprocessors.overlay1
              ) {
                throw new Error(
                  `Plugin \`preprocessors\` must have \`oas3\`, \`oas2\`, \`async2\`, \`async3\`, \`arazzo1\`, or \`overlay1\` preprocessors "${p}.`
                );
              }
              plugin.preprocessors = {};
              if (pluginInstance.preprocessors.oas3) {
                plugin.preprocessors.oas3 = prefixRules(pluginInstance.preprocessors.oas3, id);
              }
              if (pluginInstance.preprocessors.oas2) {
                plugin.preprocessors.oas2 = prefixRules(pluginInstance.preprocessors.oas2, id);
              }
              if (pluginInstance.preprocessors.async2) {
                plugin.preprocessors.async2 = prefixRules(pluginInstance.preprocessors.async2, id);
              }
              if (pluginInstance.preprocessors.async3) {
                plugin.preprocessors.async3 = prefixRules(pluginInstance.preprocessors.async3, id);
              }
              if (pluginInstance.preprocessors.arazzo1) {
                plugin.preprocessors.arazzo1 = prefixRules(
                  pluginInstance.preprocessors.arazzo1,
                  id
                );
              }
              if (pluginInstance.preprocessors.overlay1) {
                plugin.preprocessors.overlay1 = prefixRules(
                  pluginInstance.preprocessors.overlay1,
                  id
                );
              }
            }

            if (pluginInstance.decorators) {
              if (
                !pluginInstance.decorators.oas3 &&
                !pluginInstance.decorators.oas2 &&
                !pluginInstance.decorators.async2 &&
                !pluginInstance.decorators.async3 &&
                !pluginInstance.decorators.arazzo1 &&
                !pluginInstance.decorators.overlay1
              ) {
                throw new Error(
                  `Plugin \`decorators\` must have \`oas3\`, \`oas2\`, \`async2\`, \`async3\`, \`arazzo1\`, or \`overlay1\` decorators "${p}.`
                );
              }
              plugin.decorators = {};
              if (pluginInstance.decorators.oas3) {
                plugin.decorators.oas3 = prefixRules(pluginInstance.decorators.oas3, id);
              }
              if (pluginInstance.decorators.oas2) {
                plugin.decorators.oas2 = prefixRules(pluginInstance.decorators.oas2, id);
              }
              if (pluginInstance.decorators.async2) {
                plugin.decorators.async2 = prefixRules(pluginInstance.decorators.async2, id);
              }
              if (pluginInstance.decorators.async3) {
                plugin.decorators.async3 = prefixRules(pluginInstance.decorators.async3, id);
              }
              if (pluginInstance.decorators.arazzo1) {
                plugin.decorators.arazzo1 = prefixRules(pluginInstance.decorators.arazzo1, id);
              }
              if (pluginInstance.decorators.overlay1) {
                plugin.decorators.overlay1 = prefixRules(pluginInstance.decorators.overlay1, id);
              }
            }

            if (pluginInstance.assertions) {
              plugin.assertions = pluginInstance.assertions;
            }

            return {
              ...pluginInstance,
              ...plugin,
            };
          })
        )
      ).filter(isDefined);
    })
  );

  return instances.filter(isDefined).flat();
}

export function resolvePreset(
  presetName: string,
  plugins: Plugin[],
  ctx?: UserContext,
  location?: Location
): RawGovernanceConfig | null {
  const { pluginId, configName } = parsePresetName(presetName);
  const plugin = plugins.find((p) => p.id === pluginId);
  if (!plugin) {
    const message = `Invalid config ${colorize.red(
      presetName
    )}: plugin ${pluginId} is not included.`;
    if (ctx && location) {
      ctx.report({
        message,
        location,
        forceSeverity: 'warn',
      });
      return null;
    }
    throw new Error(message);
  }

  const preset = plugin.configs?.[configName];
  if (!preset) {
    const message = pluginId
      ? `Invalid config ${colorize.red(
          presetName
        )}: plugin ${pluginId} doesn't export config with name ${configName}.`
      : `Invalid config ${colorize.red(presetName)}: there is no such built-in config.`;
    if (ctx && location) {
      ctx.report({
        message,
        location,
        forceSeverity: 'warn',
      });
      return null;
    }
    throw new Error(message);
  }
  return preset;
}
