import * as path from 'path';
import { blue, red } from 'colorette';
import { isAbsoluteUrl } from '../ref-utils';
import { BaseResolver } from '../resolve';
import { defaultPlugin } from './builtIn';
import {
  getResolveConfig,
  getUniquePlugins,
  mergeExtends,
  parsePresetName,
  prefixRules,
  transformConfig,
} from './utils';
import type {
  StyleguideRawConfig,
  ApiStyleguideRawConfig,
  Plugin,
  RawConfig,
  ResolvedApi,
  ResolvedStyleGuideConfig,
  RuleConfig,
} from './types';
import { isNotString, isString, notUndefined, parseYaml } from '../utils';
import { Config } from './config';

export async function resolveConfig(rawConfig: RawConfig, configPath?: string): Promise<Config> {
  if (rawConfig.styleguide?.extends?.some(isNotString)) {
    throw new Error(
      `Error configuration format not detected in extends value must contain strings`
    );
  }

  const resolver = new BaseResolver(getResolveConfig(rawConfig.resolve));
  const configExtends = rawConfig?.styleguide?.extends ?? ['recommended'];
  const recommendedFallback = !rawConfig?.styleguide?.extends;
  const styleguideConfig = {
    ...rawConfig?.styleguide,
    extends: configExtends,
    recommendedFallback,
  };

  const apis = await resolveApis({
    rawConfig: {
      ...rawConfig,
      styleguide: styleguideConfig,
    },
    configPath,
    resolver,
  });

  const styleguide = await resolveStyleguideConfig({
    styleguideConfig,
    configPath,
    resolver,
  });

  return new Config(
    {
      ...rawConfig,
      apis,
      styleguide,
    },
    configPath
  );
}

export function resolvePlugins(
  plugins: (string | Plugin)[] | null,
  configPath: string = ''
): Plugin[] {
  if (!plugins) return [];

  // @ts-ignore
  const requireFunc = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require;

  const seenPluginIds = new Map<string, string>();

  return plugins
    .map((p) => {
      if (isString(p) && isAbsoluteUrl(p)) {
        throw new Error(red(`We don't support remote plugins yet.`));
      }

      // TODO: resolve npm packages similar to eslint
      const pluginModule = isString(p)
        ? (requireFunc(path.resolve(path.dirname(configPath), p)) as Plugin)
        : p;

      const id = pluginModule.id;
      if (typeof id !== 'string') {
        throw new Error(red(`Plugin must define \`id\` property in ${blue(p.toString())}.`));
      }

      if (seenPluginIds.has(id)) {
        const pluginPath = seenPluginIds.get(id)!;
        throw new Error(
          red(
            `Plugin "id" must be unique. Plugin ${blue(p.toString())} uses id "${blue(
              id
            )}" already seen in ${blue(pluginPath)}`
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
        if (!pluginModule.rules.oas3 && !pluginModule.rules.oas2) {
          throw new Error(`Plugin rules must have \`oas3\` or \`oas2\` rules "${p}.`);
        }
        plugin.rules = {};
        if (pluginModule.rules.oas3) {
          plugin.rules.oas3 = prefixRules(pluginModule.rules.oas3, id);
        }
        if (pluginModule.rules.oas2) {
          plugin.rules.oas2 = prefixRules(pluginModule.rules.oas2, id);
        }
      }
      if (pluginModule.preprocessors) {
        if (!pluginModule.preprocessors.oas3 && !pluginModule.preprocessors.oas2) {
          throw new Error(
            `Plugin \`preprocessors\` must have \`oas3\` or \`oas2\` preprocessors "${p}.`
          );
        }
        plugin.preprocessors = {};
        if (pluginModule.preprocessors.oas3) {
          plugin.preprocessors.oas3 = prefixRules(pluginModule.preprocessors.oas3, id);
        }
        if (pluginModule.preprocessors.oas2) {
          plugin.preprocessors.oas2 = prefixRules(pluginModule.preprocessors.oas2, id);
        }
      }

      if (pluginModule.decorators) {
        if (!pluginModule.decorators.oas3 && !pluginModule.decorators.oas2) {
          throw new Error(`Plugin \`decorators\` must have \`oas3\` or \`oas2\` decorators "${p}.`);
        }
        plugin.decorators = {};
        if (pluginModule.decorators.oas3) {
          plugin.decorators.oas3 = prefixRules(pluginModule.decorators.oas3, id);
        }
        if (pluginModule.decorators.oas2) {
          plugin.decorators.oas2 = prefixRules(pluginModule.decorators.oas2, id);
        }
      }

      return plugin;
    })
    .filter(notUndefined);
}

export async function resolveApis({
  rawConfig,
  configPath = '',
  resolver,
}: {
  rawConfig: RawConfig;
  configPath?: string;
  resolver?: BaseResolver;
}): Promise<Record<string, ResolvedApi>> {
  const { apis = {}, styleguide: styleguideConfig = {} } = rawConfig;
  let resolvedApis: Record<string, ResolvedApi> = {};
  for (const [apiName, apiContent] of Object.entries(apis || {})) {
    if (apiContent.styleguide?.extends?.some(isNotString)) {
      throw new Error(
        `Error configuration format not detected in extends value must contain strings`
      );
    }
    const rawStyleguideConfig = getMergedRawStyleguideConfig(
      styleguideConfig,
      apiContent.styleguide
    );
    const resolvedApiConfig = await resolveStyleguideConfig({
      styleguideConfig: rawStyleguideConfig,
      configPath,
      resolver,
    });
    resolvedApis[apiName] = { ...apiContent, styleguide: resolvedApiConfig };
  }
  return resolvedApis;
}

async function resolveAndMergeNestedStyleguideConfig(
  {
    styleguideConfig,
    configPath = '',
    resolver = new BaseResolver(),
  }: {
    styleguideConfig?: StyleguideRawConfig;
    configPath?: string;
    resolver?: BaseResolver;
  },
  parentConfigPaths: string[] = [],
  extendPaths: string[] = []
): Promise<ResolvedStyleGuideConfig> {
  if (parentConfigPaths.includes(configPath)) {
    throw new Error(`Circular dependency in config file: "${configPath}"`);
  }
  const plugins = getUniquePlugins(
    resolvePlugins([...(styleguideConfig?.plugins || []), defaultPlugin], configPath)
  );
  const pluginPaths = styleguideConfig?.plugins
    ?.filter(isString)
    .map((p) => path.resolve(path.dirname(configPath), p));

  const resolvedConfigPath = isAbsoluteUrl(configPath)
    ? configPath
    : configPath && path.resolve(configPath);

  const extendConfigs: ResolvedStyleGuideConfig[] = await Promise.all(
    styleguideConfig?.extends?.map(async (presetItem) => {
      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        return resolvePreset(presetItem, plugins);
      }
      const pathItem = isAbsoluteUrl(presetItem)
        ? presetItem
        : isAbsoluteUrl(configPath)
        ? new URL(presetItem, configPath).href
        : path.resolve(path.dirname(configPath), presetItem);
      const extendedStyleguideConfig = await loadExtendStyleguideConfig(pathItem, resolver);
      return await resolveAndMergeNestedStyleguideConfig(
        {
          styleguideConfig: extendedStyleguideConfig,
          configPath: pathItem,
          resolver: resolver,
        },
        [...parentConfigPaths, resolvedConfigPath],
        extendPaths
      );
    }) || []
  );

  const { plugins: mergedPlugins = [], ...lint } = mergeExtends([
    ...extendConfigs,
    {
      ...styleguideConfig,
      plugins,
      extends: undefined,
      extendPaths: [...parentConfigPaths, resolvedConfigPath],
      pluginPaths,
    },
  ]);

  return {
    ...lint,
    extendPaths: lint.extendPaths?.filter((path) => path && !isAbsoluteUrl(path)),
    plugins: getUniquePlugins(mergedPlugins),
    recommendedFallback: styleguideConfig?.recommendedFallback,
    doNotResolveExamples: styleguideConfig?.doNotResolveExamples,
  };
}

export async function resolveStyleguideConfig(
  opts: {
    styleguideConfig?: StyleguideRawConfig;
    configPath?: string;
    resolver?: BaseResolver;
  },
  parentConfigPaths: string[] = [],
  extendPaths: string[] = []
): Promise<ResolvedStyleGuideConfig> {
  const resolvedStyleguideConfig = await resolveAndMergeNestedStyleguideConfig(
    opts,
    parentConfigPaths,
    extendPaths
  );

  return {
    ...resolvedStyleguideConfig,
    rules:
      resolvedStyleguideConfig.rules &&
      groupStyleguideAssertionRules(resolvedStyleguideConfig.rules),
  };
}

export function resolvePreset(presetName: string, plugins: Plugin[]): ResolvedStyleGuideConfig {
  const { pluginId, configName } = parsePresetName(presetName);
  const plugin = plugins.find((p) => p.id === pluginId);
  if (!plugin) {
    throw new Error(`Invalid config ${red(presetName)}: plugin ${pluginId} is not included.`);
  }

  const preset = plugin.configs?.[configName]! as ResolvedStyleGuideConfig;
  if (!preset) {
    throw new Error(
      pluginId
        ? `Invalid config ${red(
            presetName
          )}: plugin ${pluginId} doesn't export config with name ${configName}.`
        : `Invalid config ${red(presetName)}: there is no such built-in config.`
    );
  }
  return preset;
}

async function loadExtendStyleguideConfig(
  filePath: string,
  resolver: BaseResolver
): Promise<StyleguideRawConfig> {
  try {
    const fileSource = await resolver.loadExternalRef(filePath);
    const rawConfig = transformConfig(parseYaml(fileSource.body) as RawConfig);
    if (!rawConfig.styleguide) {
      throw new Error(`Styleguide configuration format not detected: "${filePath}"`);
    }

    return rawConfig.styleguide;
  } catch (error) {
    throw new Error(`Failed to load "${filePath}": ${error.message}`);
  }
}

function getMergedRawStyleguideConfig(
  rootStyleguideConfig: StyleguideRawConfig,
  apiStyleguideConfig?: ApiStyleguideRawConfig
) {
  const resultLint = {
    ...rootStyleguideConfig,
    ...apiStyleguideConfig,
    rules: { ...rootStyleguideConfig?.rules, ...apiStyleguideConfig?.rules },
    oas2Rules: { ...rootStyleguideConfig?.oas2Rules, ...apiStyleguideConfig?.oas2Rules },
    oas3_0Rules: { ...rootStyleguideConfig?.oas3_0Rules, ...apiStyleguideConfig?.oas3_0Rules },
    oas3_1Rules: { ...rootStyleguideConfig?.oas3_1Rules, ...apiStyleguideConfig?.oas3_1Rules },
    preprocessors: {
      ...rootStyleguideConfig?.preprocessors,
      ...apiStyleguideConfig?.preprocessors,
    },
    oas2Preprocessors: {
      ...rootStyleguideConfig?.oas2Preprocessors,
      ...apiStyleguideConfig?.oas2Preprocessors,
    },
    oas3_0Preprocessors: {
      ...rootStyleguideConfig?.oas3_0Preprocessors,
      ...apiStyleguideConfig?.oas3_0Preprocessors,
    },
    oas3_1Preprocessors: {
      ...rootStyleguideConfig?.oas3_1Preprocessors,
      ...apiStyleguideConfig?.oas3_1Preprocessors,
    },
    decorators: { ...rootStyleguideConfig?.decorators, ...apiStyleguideConfig?.decorators },
    oas2Decorators: {
      ...rootStyleguideConfig?.oas2Decorators,
      ...apiStyleguideConfig?.oas2Decorators,
    },
    oas3_0Decorators: {
      ...rootStyleguideConfig?.oas3_0Decorators,
      ...apiStyleguideConfig?.oas3_0Decorators,
    },
    oas3_1Decorators: {
      ...rootStyleguideConfig?.oas3_1Decorators,
      ...apiStyleguideConfig?.oas3_1Decorators,
    },
    recommendedFallback: apiStyleguideConfig?.extends
      ? false
      : rootStyleguideConfig.recommendedFallback,
  };
  return resultLint;
}

function groupStyleguideAssertionRules(
  rules: Record<string, RuleConfig> | undefined
): Record<string, RuleConfig> | undefined {
  if (!rules) {
    return rules;
  }

  // Create a new record to avoid mutating original
  const transformedRules: Record<string, RuleConfig> = {};

  // Collect assertion rules
  const assertions = [];
  for (const [ruleKey, rule] of Object.entries(rules)) {
    if (ruleKey.startsWith('assert/') && typeof rule === 'object' && rule !== null) {
      const assertion = rule;
      assertions.push({
        ...assertion,
        assertionId: ruleKey.replace('assert/', ''),
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
