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
  LintRawConfig,
  Plugin,
  RawConfig,
  ResolvedApi,
  ResolvedLintConfig,
  RuleConfig,
} from './types';
import { isNotString, isString, notUndefined, parseYaml } from '../utils';
import { Config } from './config';

export async function resolveConfig(rawConfig: RawConfig, configPath?: string) {
  if (rawConfig.lint?.extends?.some(isNotString)) {
    throw new Error(
      `Error configuration format not detected in extends value must contain strings`,
    );
  }

  const resolver = new BaseResolver(getResolveConfig(rawConfig.resolve));
  const configExtends = rawConfig?.lint?.extends ?? ['recommended'];
  const recommendedFallback = !rawConfig?.lint?.extends;
  const lintConfig = {
    ...rawConfig?.lint,
    extends: configExtends,
    recommendedFallback,
  };

  const apis = await resolveApis({
    rawConfig: {
      ...rawConfig,
      lint: lintConfig,
    },
    configPath,
    resolver,
  });

  const lint = await resolveLint({
    lintConfig,
    configPath,
    resolver,
  });

  return new Config(
    {
      ...rawConfig,
      apis,
      lint,
    },
    configPath,
  );
}

export function resolvePlugins(
  plugins: (string | Plugin)[] | null,
  configPath: string = '',
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
              id,
            )}" already seen in ${blue(pluginPath)}`,
          ),
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
            `Plugin \`preprocessors\` must have \`oas3\` or \`oas2\` preprocessors "${p}.`,
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
  const { apis = {}, lint: lintConfig = {} } = rawConfig;
  let resolvedApis: Record<string, ResolvedApi> = {};
  for (const [apiName, apiContent] of Object.entries(apis || {})) {
    if (apiContent.lint?.extends?.some(isNotString)) {
      throw new Error(
        `Error configuration format not detected in extends value must contain strings`,
      );
    }
    const rawLintConfig = getMergedLintRawConfig(lintConfig, apiContent.lint);
    const apiLint = await resolveLint({
      lintConfig: rawLintConfig,
      configPath,
      resolver,
    });
    resolvedApis[apiName] = { ...apiContent, lint: apiLint };
  }
  return resolvedApis;
}

async function resolveAndMergeNestedLint(
  {
    lintConfig,
    configPath = '',
    resolver = new BaseResolver(),
  }: {
    lintConfig?: LintRawConfig;
    configPath?: string;
    resolver?: BaseResolver;
  },
  parentConfigPaths: string[] = [],
  extendPaths: string[] = [],
): Promise<ResolvedLintConfig> {
  if (parentConfigPaths.includes(configPath)) {
    throw new Error(`Circular dependency in config file: "${configPath}"`);
  }
  const plugins = getUniquePlugins(
    resolvePlugins([...(lintConfig?.plugins || []), defaultPlugin], configPath),
  );
  const pluginPaths = lintConfig?.plugins
    ?.filter(isString)
    .map((p) => path.resolve(path.dirname(configPath), p));

  const resolvedConfigPath = isAbsoluteUrl(configPath)
    ? configPath
    : configPath && path.resolve(configPath);

  const extendConfigs: ResolvedLintConfig[] = await Promise.all(
    lintConfig?.extends?.map(async (presetItem) => {
      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        return resolvePreset(presetItem, plugins);
      }
      const pathItem = isAbsoluteUrl(presetItem)
        ? presetItem
        : isAbsoluteUrl(configPath)
        ? new URL(presetItem, configPath).href
        : path.resolve(path.dirname(configPath), presetItem);
      const extendedLintConfig = await loadExtendLintConfig(pathItem, resolver);
      return await resolveAndMergeNestedLint(
        {
          lintConfig: extendedLintConfig,
          configPath: pathItem,
          resolver: resolver,
        },
        [...parentConfigPaths, resolvedConfigPath],
        extendPaths,
      );
    }) || [],
  );

  const { plugins: mergedPlugins = [], ...lint } = mergeExtends([
    ...extendConfigs,
    {
      ...lintConfig,
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
    recommendedFallback: lintConfig?.recommendedFallback,
    doNotResolveExamples: lintConfig?.doNotResolveExamples,
  };
}

export async function resolveLint(
  lintOpts: {
    lintConfig?: LintRawConfig;
    configPath?: string;
    resolver?: BaseResolver;
  },
  parentConfigPaths: string[] = [],
  extendPaths: string[] = [],
): Promise<ResolvedLintConfig> {
  const resolvedLint = await resolveAndMergeNestedLint(lintOpts, parentConfigPaths, extendPaths);

  return {
    ...resolvedLint,
    rules: resolvedLint.rules && groupLintAssertionRules(resolvedLint.rules),
  };
}

export function resolvePreset(presetName: string, plugins: Plugin[]): ResolvedLintConfig {
  const { pluginId, configName } = parsePresetName(presetName);
  const plugin = plugins.find((p) => p.id === pluginId);
  if (!plugin) {
    throw new Error(`Invalid config ${red(presetName)}: plugin ${pluginId} is not included.`);
  }

  const preset = plugin.configs?.[configName]! as ResolvedLintConfig;
  if (!preset) {
    throw new Error(
      pluginId
        ? `Invalid config ${red(
            presetName,
          )}: plugin ${pluginId} doesn't export config with name ${configName}.`
        : `Invalid config ${red(presetName)}: there is no such built-in config.`,
    );
  }
  return preset;
}

async function loadExtendLintConfig(
  filePath: string,
  resolver: BaseResolver,
): Promise<LintRawConfig> {
  try {
    const fileSource = await resolver.loadExternalRef(filePath);
    const rawConfig = transformConfig(parseYaml(fileSource.body) as RawConfig);
    if (!rawConfig.lint) {
      throw new Error(`Lint configuration format not detected: "${filePath}"`);
    }

    return rawConfig.lint;
  } catch (error) {
    throw new Error(`Failed to load "${filePath}": ${error.message}`);
  }
}

function getMergedLintRawConfig(configLint: LintRawConfig, apiLint?: LintRawConfig) {
  const resultLint = {
    ...configLint,
    ...apiLint,
    rules: { ...configLint?.rules, ...apiLint?.rules },
    oas2Rules: { ...configLint?.oas2Rules, ...apiLint?.oas2Rules },
    oas3_0Rules: { ...configLint?.oas3_0Rules, ...apiLint?.oas3_0Rules },
    oas3_1Rules: { ...configLint?.oas3_1Rules, ...apiLint?.oas3_1Rules },
    preprocessors: { ...configLint?.preprocessors, ...apiLint?.preprocessors },
    oas2Preprocessors: { ...configLint?.oas2Preprocessors, ...apiLint?.oas2Preprocessors },
    oas3_0Preprocessors: { ...configLint?.oas3_0Preprocessors, ...apiLint?.oas3_0Preprocessors },
    oas3_1Preprocessors: { ...configLint?.oas3_1Preprocessors, ...apiLint?.oas3_1Preprocessors },
    decorators: { ...configLint?.decorators, ...apiLint?.decorators },
    oas2Decorators: { ...configLint?.oas2Decorators, ...apiLint?.oas2Decorators },
    oas3_0Decorators: { ...configLint?.oas3_0Decorators, ...apiLint?.oas3_0Decorators },
    oas3_1Decorators: { ...configLint?.oas3_1Decorators, ...apiLint?.oas3_1Decorators },
    recommendedFallback: apiLint?.extends ? false : configLint.recommendedFallback,
  };
  return resultLint;
}

function groupLintAssertionRules(
  rules: Record<string, RuleConfig> | undefined,
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
