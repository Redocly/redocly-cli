import * as path from 'node:path';
import * as url from 'node:url';
import * as fs from 'node:fs';
import module from 'node:module';
import { isAbsoluteUrl } from '../ref-utils.js';
import { isNotString, isString, isDefined, keysOf } from '../utils.js';
import { resolveDocument, BaseResolver } from '../resolve.js';
import { defaultPlugin } from './builtIn.js';
import {
  getResolveConfig,
  getUniquePlugins,
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
import { type Config, StyleguideConfig } from './config.js';

import type {
  Plugin,
  RawUniversalConfig,
  RawUniversalApi,
  ResolvedConfig,
  ResolvedApi,
  RawGovernanceConfig,
  ResolvedGovernanceConfig,
  RuleConfig,
  ImportedPlugin,
} from './types.js';
import type {
  Assertion,
  AssertionDefinition,
  RawAssertion,
} from '../rules/common/assertions/index.js';
import type { Asserts, AssertionFn } from '../rules/common/assertions/asserts.js';
import type { CoreBundleOptions } from '../bundle.js';
import type { Document, ResolvedRefMap } from '../resolve.js';

const DEFAULT_PROJECT_PLUGIN_PATHS = ['@theme/plugin.js', '@theme/plugin.cjs', '@theme/plugin.mjs'];

// Cache instantiated plugins during a single execution
const pluginsCache: Map<string, Plugin> = new Map();

export async function resolveConfigFileAndRefs({
  configPath,
  externalRefResolver = new BaseResolver(),
  base = null,
}: Omit<CoreBundleOptions, 'config' | 'alias'> & { configPath?: string }): Promise<{
  document: Document;
  resolvedRefMap: ResolvedRefMap;
}> {
  if (!configPath) {
    throw new Error('Reference to a config is required.\n');
  }

  const document = await externalRefResolver.resolveDocument(base, configPath, true);

  if (document instanceof Error) {
    throw document;
  }

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: NormalizedConfigTypes.ConfigRoot,
    externalRefResolver,
  });

  return { document, resolvedRefMap };
}

export type ConfigOptions = {
  rawConfig?: RawUniversalConfig;
  configPath?: string;
  externalRefResolver?: BaseResolver;
  customExtends?: string[];
};

export async function resolveConfig({
  rawConfig,
  configPath,
  externalRefResolver,
  customExtends,
}: ConfigOptions): Promise<Config> {
  const config = rawConfig === undefined ? { extends: ['recommended'] } : { ...rawConfig };
  if (customExtends !== undefined) {
    config.extends = customExtends;
  }
  if (config?.extends?.some(isNotString)) {
    throw new Error(`Configuration format not detected in extends: values must be strings.`);
  }

  const resolver = externalRefResolver ?? new BaseResolver(getResolveConfig(config.resolve));

  const apis = await resolveApis({
    rawConfig: config,
    configPath,
    resolver,
  });

  const rootGovernanceConfig = await resolveGovernanceConfig({
    styleguideConfig: config,
    configPath,
    resolver,
  });

  const { plugins: _plugins, extends: _extends, apis: _apis, ...rest } = config;
  const resolvedConfig: ResolvedConfig = {
    ...rest,
    ...rootGovernanceConfig,
    apis,
  };

  return {
    _rawConfig: rawConfig,
    resolvedConfig,
    configPath,
    governance: {
      root: new StyleguideConfig(resolvedConfig || {}, configPath),
      apis: Object.fromEntries(
        Object.entries(resolvedConfig.apis || {}).map(([alias, apiConfig]) => [
          alias,
          new StyleguideConfig(apiConfig, configPath),
        ])
      ),
    },
    resolve: getResolveConfig(config?.resolve),
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

export async function resolvePlugins(
  plugins: (string | Plugin)[] | null,
  configDir: string = ''
): Promise<Plugin[]> {
  if (!plugins) return [];

  // TODO: implement or reuse Resolver approach so it will work in node and browser envs!
  const requireFunc = async (plugin: string | Plugin): Promise<Plugin | undefined> => {
    if (isString(plugin)) {
      try {
        const maybeAbsolutePluginPath = path.resolve(configDir, plugin);

        const absolutePluginPath = fs.existsSync(maybeAbsolutePluginPath) // TODO: replace with externalRefResolver.fs?
          ? maybeAbsolutePluginPath
          : // For plugins imported from packages specifically
            module.createRequire(import.meta.url ?? __dirname).resolve(plugin, {
              paths: [
                // Plugins imported from the node_modules in the project directory
                configDir,
                // Plugins imported from the node_modules in the package install directory (for example, npx cache directory)
                import.meta.url ? path.dirname(url.fileURLToPath(import.meta.url)) : __dirname,
              ],
            });

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

          const pluginModule = isDeprecatedPluginFormat(requiredPlugin)
            ? requiredPlugin
            : isCommonJsPlugin(requiredPlugin)
            ? await requiredPlugin(pluginCreatorOptions)
            : await requiredPlugin?.default?.(pluginCreatorOptions);

          if (pluginModule?.id && isDeprecatedPluginFormat(requiredPlugin)) {
            logger.info(`Deprecated plugin format detected: ${pluginModule.id}\n`);
          }

          if (pluginModule) {
            pluginsCache.set(absolutePluginPath, {
              ...pluginModule,
              path: plugin,
              absolutePath: absolutePluginPath,
            });
          }
        }

        return pluginsCache.get(absolutePluginPath);
      } catch (e) {
        throw new Error(`Failed to load plugin "${plugin}": ${e.message}\n\n${e.stack}`);
      }
    }

    return plugin;
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

      const pluginModule: Plugin | undefined = await requireFunc(p);

      if (!pluginModule) {
        return;
      }

      const id = pluginModule.id;
      if (typeof id !== 'string') {
        throw new Error(
          colorize.red(`Plugin must define \`id\` property in ${colorize.blue(p.toString())}.`)
        );
      }

      if (seenPluginIds.has(id)) {
        const pluginPath = seenPluginIds.get(id)!;
        throw new Error(
          colorize.red(
            `Plugin "id" must be unique. Plugin ${colorize.blue(
              p.toString()
            )} uses id "${colorize.blue(id)}" already seen in ${colorize.blue(pluginPath)}`
          )
        );
      }

      seenPluginIds.set(id, p.toString());

      const plugin: Plugin = {
        id,
        ...(pluginModule.configs ? { configs: pluginModule.configs } : {}),
        ...(pluginModule.typeExtension ? { typeExtension: pluginModule.typeExtension } : {}),
      };

      if (pluginModule.rules) {
        if (
          !pluginModule.rules.oas3 &&
          !pluginModule.rules.oas2 &&
          !pluginModule.rules.async2 &&
          !pluginModule.rules.async3 &&
          !pluginModule.rules.arazzo1 &&
          !pluginModule.rules.overlay1
        ) {
          throw new Error(
            `Plugin rules must have \`oas3\`, \`oas2\`, \`async2\`, \`async3\`, \`arazzo\`, or \`overlay1\` rules "${p}.`
          );
        }
        plugin.rules = {};
        if (pluginModule.rules.oas3) {
          plugin.rules.oas3 = prefixRules(pluginModule.rules.oas3, id);
        }
        if (pluginModule.rules.oas2) {
          plugin.rules.oas2 = prefixRules(pluginModule.rules.oas2, id);
        }
        if (pluginModule.rules.async2) {
          plugin.rules.async2 = prefixRules(pluginModule.rules.async2, id);
        }
        if (pluginModule.rules.async3) {
          plugin.rules.async3 = prefixRules(pluginModule.rules.async3, id);
        }
        if (pluginModule.rules.arazzo1) {
          plugin.rules.arazzo1 = prefixRules(pluginModule.rules.arazzo1, id);
        }
        if (pluginModule.rules.overlay1) {
          plugin.rules.overlay1 = prefixRules(pluginModule.rules.overlay1, id);
        }
      }
      if (pluginModule.preprocessors) {
        if (
          !pluginModule.preprocessors.oas3 &&
          !pluginModule.preprocessors.oas2 &&
          !pluginModule.preprocessors.async2 &&
          !pluginModule.preprocessors.async3 &&
          !pluginModule.preprocessors.arazzo1 &&
          !pluginModule.preprocessors.overlay1
        ) {
          throw new Error(
            `Plugin \`preprocessors\` must have \`oas3\`, \`oas2\`, \`async2\`, \`async3\`, \`arazzo1\`, or \`overlay1\` preprocessors "${p}.`
          );
        }
        plugin.preprocessors = {};
        if (pluginModule.preprocessors.oas3) {
          plugin.preprocessors.oas3 = prefixRules(pluginModule.preprocessors.oas3, id);
        }
        if (pluginModule.preprocessors.oas2) {
          plugin.preprocessors.oas2 = prefixRules(pluginModule.preprocessors.oas2, id);
        }
        if (pluginModule.preprocessors.async2) {
          plugin.preprocessors.async2 = prefixRules(pluginModule.preprocessors.async2, id);
        }
        if (pluginModule.preprocessors.async3) {
          plugin.preprocessors.async3 = prefixRules(pluginModule.preprocessors.async3, id);
        }
        if (pluginModule.preprocessors.arazzo1) {
          plugin.preprocessors.arazzo1 = prefixRules(pluginModule.preprocessors.arazzo1, id);
        }
        if (pluginModule.preprocessors.overlay1) {
          plugin.preprocessors.overlay1 = prefixRules(pluginModule.preprocessors.overlay1, id);
        }
      }

      if (pluginModule.decorators) {
        if (
          !pluginModule.decorators.oas3 &&
          !pluginModule.decorators.oas2 &&
          !pluginModule.decorators.async2 &&
          !pluginModule.decorators.async3 &&
          !pluginModule.decorators.arazzo1 &&
          !pluginModule.decorators.overlay1
        ) {
          throw new Error(
            `Plugin \`decorators\` must have \`oas3\`, \`oas2\`, \`async2\`, \`async3\`, \`arazzo1\`, or \`overlay1\` decorators "${p}.`
          );
        }
        plugin.decorators = {};
        if (pluginModule.decorators.oas3) {
          plugin.decorators.oas3 = prefixRules(pluginModule.decorators.oas3, id);
        }
        if (pluginModule.decorators.oas2) {
          plugin.decorators.oas2 = prefixRules(pluginModule.decorators.oas2, id);
        }
        if (pluginModule.decorators.async2) {
          plugin.decorators.async2 = prefixRules(pluginModule.decorators.async2, id);
        }
        if (pluginModule.decorators.async3) {
          plugin.decorators.async3 = prefixRules(pluginModule.decorators.async3, id);
        }
        if (pluginModule.decorators.arazzo1) {
          plugin.decorators.arazzo1 = prefixRules(pluginModule.decorators.arazzo1, id);
        }
        if (pluginModule.decorators.overlay1) {
          plugin.decorators.overlay1 = prefixRules(pluginModule.decorators.overlay1, id);
        }
      }

      if (pluginModule.assertions) {
        plugin.assertions = pluginModule.assertions;
      }

      return {
        ...pluginModule,
        ...plugin,
      };
    })
  );

  return instances.filter(isDefined);
}

export async function resolveApis({
  rawConfig,
  configPath = '',
  resolver,
}: {
  rawConfig: RawUniversalConfig;
  configPath?: string;
  resolver?: BaseResolver;
}): Promise<Record<string, ResolvedApi>> {
  const { apis = {}, ...rawConfigWithoutApis } = rawConfig;
  const resolvedApis: Record<string, ResolvedApi> = {};
  for (const [apiName, apiContent] of Object.entries(apis || {})) {
    if (apiContent?.extends?.some(isNotString)) {
      throw new Error(`Configuration format not detected in extends: values must be strings.`);
    }
    const resolvedApiConfig: Required<ResolvedGovernanceConfig> =
      await resolveGovernanceConfig<RawUniversalApi>({
        styleguideConfig: apiContent, // FIXME: rename styleguideConfig
        rootRawConfig: rawConfigWithoutApis,
        configPath,
        resolver,
      });
    const { extends: _extends, plugins: _plugins, ...rest } = apiContent;
    resolvedApis[apiName] = { ...rest, ...resolvedApiConfig };
  }
  return resolvedApis;
}

async function resolveAndMergeNestedGovernanceConfig<
  T extends RawUniversalConfig | RawUniversalApi
>({
  styleguideConfig,
  rootRawConfig,
  configPath = '',
  resolver = new BaseResolver(),
  parentConfigPaths = [],
  extendPaths = [],
}: {
  styleguideConfig: T;
  rootRawConfig?: RawUniversalConfig;
  configPath?: string;
  resolver?: BaseResolver;
  parentConfigPaths?: string[];
  extendPaths?: string[];
}): Promise<Required<ResolvedGovernanceConfig>> {
  if (parentConfigPaths.includes(configPath)) {
    throw new Error(`Circular dependency in config file: "${configPath}"`);
  }

  const {
    extends: rootOrApiExtends = [],
    plugins: rootOrApiPlugins = [],
    ...rootOrApiConfig
  } = styleguideConfig;
  const {
    extends: possiblyRootExtends = [],
    plugins: possiblyRootPlugins = [],
    ...possiblyRootConfig
  } = rootRawConfig || {};

  const plugins = isBrowser
    ? // In browser, we don't support plugins from config file yet
      [defaultPlugin]
    : getUniquePlugins(
        await resolvePlugins(
          [
            ...possiblyRootPlugins, // we need to merge in the root config first if it exists
            ...rootOrApiPlugins,
            defaultPlugin,
          ],
          path.dirname(configPath)
        )
      );
  const pluginPaths = [
    ...possiblyRootPlugins, // we need to merge in the root config first if it exists
    ...rootOrApiPlugins,
  ]
    ?.filter(isString)
    .map((p) => path.resolve(path.dirname(configPath), p));

  const resolvedConfigPath = isAbsoluteUrl(configPath)
    ? configPath
    : configPath && path.resolve(configPath);

  const extendConfigs: ResolvedGovernanceConfig[] = await Promise.all(
    [
      ...possiblyRootExtends, // we need to merge in the root config first if it exists
      ...rootOrApiExtends,
    ].map(async (presetItem) => {
      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        return resolvePreset(presetItem, plugins);
      }
      const pathItem = isAbsoluteUrl(presetItem)
        ? presetItem
        : isAbsoluteUrl(configPath)
        ? new URL(presetItem, configPath).href
        : path.resolve(path.dirname(configPath), presetItem);
      const extendedStyleguideConfig = await loadExtendStyleguideConfig(pathItem, resolver);
      return await resolveAndMergeNestedGovernanceConfig({
        styleguideConfig: extendedStyleguideConfig,
        configPath: pathItem,
        resolver,
        parentConfigPaths: [...parentConfigPaths, resolvedConfigPath],
        extendPaths,
      });
    })
  );

  const { plugins: mergedPlugins = [], ...styleguide } = mergeExtends([
    ...extendConfigs,
    structuredClone(possiblyRootConfig), // we need to merge in the root config first if it exists
    {
      ...structuredClone(rootOrApiConfig),
      plugins,
      extendPaths: [...parentConfigPaths, resolvedConfigPath],
      pluginPaths,
    },
  ]);

  const resolvedGovernanceConfig = {
    ...styleguide,
    extendPaths: styleguide.extendPaths?.filter((path) => path && !isAbsoluteUrl(path)),
    plugins: getUniquePlugins(mergedPlugins),
  };
  return resolvedGovernanceConfig;
}

export async function resolveGovernanceConfig<
  T extends RawUniversalConfig | RawUniversalApi
>(opts: {
  styleguideConfig: T; // FIXME: rename
  rootRawConfig?: RawUniversalConfig;
  configPath?: string;
  resolver?: BaseResolver;
  parentConfigPaths?: string[];
  extendPaths?: string[];
}): Promise<Required<ResolvedGovernanceConfig>> {
  const resolvedStyleguideConfig = await resolveAndMergeNestedGovernanceConfig<T>(opts);

  return {
    ...resolvedStyleguideConfig,
    rules: groupStyleguideAssertionRules(resolvedStyleguideConfig),
  };
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

async function loadExtendStyleguideConfig(
  filePath: string,
  resolver: BaseResolver
): Promise<RawUniversalConfig> {
  try {
    const { parsed } = (await resolver.resolveDocument(null, filePath)) as Document;

    return parsed;
  } catch (error) {
    throw new Error(`Failed to load "${filePath}": ${error.message}`);
  }
}

function groupStyleguideAssertionRules({
  rules,
  plugins,
}: ResolvedGovernanceConfig): Record<string, RuleConfig> {
  if (!rules) {
    return {};
  }

  // Create a new record to avoid mutating original
  const transformedRules: Record<string, RuleConfig> = {};

  // Collect assertion rules
  const assertions: Assertion[] = [];
  for (const [ruleKey, rule] of Object.entries(rules)) {
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
