import * as path from 'node:path';
import * as url from 'node:url';
import * as fs from 'node:fs';
import module from 'node:module';
import { isAbsoluteUrl } from '../ref-utils.js';
import { isNotString, isString, isDefined, keysOf } from '../utils.js';
import { resolveDocument, BaseResolver, Source } from '../resolve.js';
import { defaultPlugin } from './builtIn.js';
import {
  deepCloneMapWithJSON,
  getResolveConfig,
  isCommonJsPlugin,
  isDeprecatedPluginFormat,
  mergeExtends,
  parsePresetName,
  prefixRules,
} from './utils.js';
import { isBrowser } from '../env.js';
import { colorize, logger } from '../logger.js';
import { asserts, buildAssertCustomFunction } from '../rules/common/assertions/asserts.js';
import { NormalizedConfigTypes } from '../types/redocly-yaml.js';
import { bundleConfig, collectConfigPlugins } from '../bundle.js';
import { CONFIG_FILE_NAME } from './load.js';

import type {
  Plugin,
  RawUniversalConfig,
  ResolvedConfig,
  RawGovernanceConfig,
  RuleConfig,
  ImportedPlugin,
} from './types.js';
import type {
  Assertion,
  AssertionDefinition,
  RawAssertion,
} from '../rules/common/assertions/index.js';
import type { Asserts, AssertionFn } from '../rules/common/assertions/asserts.js';
import type { Document, ResolvedRefMap } from '../resolve.js';

const DEFAULT_PROJECT_PLUGIN_PATHS = ['@theme/plugin.js', '@theme/plugin.cjs', '@theme/plugin.mjs'];

// Cache instantiated plugins during a single execution
const pluginsCache: Map<string, Plugin[]> = new Map();

export type ConfigOptions = {
  rawConfigDocument?: Document<RawUniversalConfig>;
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
}> {
  const config =
    rawConfigDocument === undefined ? { extends: ['recommended'] } : rawConfigDocument.parsed;

  if (customExtends !== undefined) {
    config.extends = customExtends;
  }
  if (config?.extends?.some(isNotString)) {
    throw new Error(`Configuration format not detected in extends: values must be strings.`);
  }

  const rootDocument = rawConfigDocument ?? {
    source: new Source(configPath ?? '', JSON.stringify(config)),
    parsed: config,
  };
  const resolvedRefMap = await resolveDocument({
    rootDocument,
    rootType: NormalizedConfigTypes.ConfigRoot,
    externalRefResolver: externalRefResolver ?? new BaseResolver(getResolveConfig(config?.resolve)),
  });

  let resolvedPlugins: Plugin[];
  if (isBrowser) {
    // In browser, we don't support plugins from config file yet
    resolvedPlugins = [defaultPlugin];
  } else {
    const rootConfigDir = path.dirname(configPath ?? '');
    const pluginsOrPaths = collectConfigPlugins(rootDocument, resolvedRefMap, rootConfigDir);
    const plugins = await resolvePlugins(pluginsOrPaths, rootConfigDir);
    resolvedPlugins = [...plugins, defaultPlugin];
  }

  const bundledConfig = bundleConfig(
    rootDocument,
    deepCloneMapWithJSON(resolvedRefMap),
    resolvedPlugins
  );

  if (bundledConfig.apis) {
    bundledConfig.apis = Object.fromEntries(
      Object.entries(bundledConfig.apis).map(([key, apiConfig]) => {
        const mergedConfig = mergeExtends([bundledConfig, apiConfig]);
        return [
          key,
          {
            ...apiConfig,
            ...mergedConfig,
            rules: groupAssertionRules(mergedConfig, resolvedPlugins),
          },
        ];
      })
    );
  }

  return {
    resolvedConfig: {
      ...bundledConfig,
      rules: groupAssertionRules(bundledConfig, resolvedPlugins),
    },
    resolvedRefMap,
    plugins: resolvedPlugins,
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

export const preResolvePluginPath = (
  plugin: string | Plugin,
  base: string,
  rootConfigDir: string
) => {
  if (!isString(plugin)) {
    return plugin;
  }

  const maybeAbsolutePluginPath = path.resolve(path.dirname(base), plugin);

  return fs.existsSync(maybeAbsolutePluginPath)
    ? maybeAbsolutePluginPath
    : // For plugins imported from packages specifically
      module.createRequire(import.meta.url ?? __dirname).resolve(plugin, {
        paths: [
          // Plugins imported from the node_modules in the project directory
          rootConfigDir,
          // Plugins imported from the node_modules in the package install directory (for example, npx cache directory)
          import.meta.url ? path.dirname(url.fileURLToPath(import.meta.url)) : __dirname,
        ],
      });
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
        : (preResolvePluginPath(
            plugin,
            path.join(configDir, CONFIG_FILE_NAME),
            configDir
          ) as string);

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

export function resolvePreset(presetName: string, plugins: Plugin[]): RawGovernanceConfig {
  const { pluginId, configName } = parsePresetName(presetName);
  const plugin = plugins.find((p) => p.id === pluginId);
  if (!plugin) {
    throw new Error(
      `Invalid config ${colorize.red(presetName)}: plugin ${pluginId} is not included.`
    );
  }

  const preset = plugin.configs?.[configName];
  if (!preset) {
    throw new Error(
      pluginId
        ? `Invalid config ${colorize.red(
            presetName
          )}: plugin ${pluginId} doesn't export config with name ${configName}.`
        : `Invalid config ${colorize.red(presetName)}: there is no such built-in config.`
    );
  }
  return preset;
}

function groupAssertionRules(
  config: RawGovernanceConfig,
  plugins: Plugin[]
): Record<string, RuleConfig> {
  if (!config.rules) {
    return {};
  }

  // Create a new record to avoid mutating original
  const transformedRules: Record<string, RuleConfig> = {};

  // Collect assertion rules
  const assertions: Assertion[] = [];
  for (const [ruleKey, rule] of Object.entries(config.rules)) {
    if (ruleKey.startsWith('rule/') && typeof rule === 'object' && rule !== null) {
      const assertion = rule as RawAssertion;

      if (plugins) {
        registerCustomAssertions(plugins, assertion);

        // We may have custom assertion inside where block
        for (const context of assertion.where || []) {
          registerCustomAssertions(plugins, context);
        }
      }
      assertions.push({
        ...assertion,
        assertionId: ruleKey,
      });
    } else {
      // If it's not an assertion, keep it as is
      transformedRules[ruleKey] = rule;
    }
  }
  if (assertions.length > 0) {
    transformedRules.assertions = assertions;
  }

  return transformedRules;
}

function registerCustomAssertions(plugins: Plugin[], assertion: AssertionDefinition) {
  for (const field of keysOf(assertion.assertions)) {
    const [pluginId, fn] = field.split('/');

    if (!pluginId || !fn) continue;

    const plugin = plugins.find((plugin) => plugin.id === pluginId);

    if (!plugin) {
      throw Error(colorize.red(`Plugin ${colorize.blue(pluginId)} isn't found.`));
    }

    if (!plugin.assertions || !plugin.assertions[fn]) {
      throw Error(
        `Plugin ${colorize.red(
          pluginId
        )} doesn't export assertions function with name ${colorize.red(fn)}.`
      );
    }

    (asserts as Asserts & { [name: string]: AssertionFn })[field] = buildAssertCustomFunction(
      plugin.assertions[fn]
    );
  }
}
