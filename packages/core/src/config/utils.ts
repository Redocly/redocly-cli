import { blue, green, red, yellow } from 'colorette';
import * as path from 'path';
import { Config } from './config';
import { notUndefined } from '../utils';

import type {
  Api,
  DeprecatedRawConfig,
  LintRawConfig,
  Plugin,
  RawConfig,
  RawResolveConfig,
  ResolveConfig,
  ResolvedLintRawConfig,
  RulesFields,
} from './types';
import { resolveLint } from './load';
import { OasVersion } from '../oas-types';

export function parsePresetName(presetName: string): { pluginId: string; configName: string } {
  if (presetName.indexOf('/') > -1) {
    const [pluginId, configName] = presetName.split('/');
    return { pluginId, configName };
  } else {
    return { pluginId: '', configName: presetName };
  }
}

export function assignExisting<T>(target: Record<string, T>, obj: Record<string, T>) {
  for (let k of Object.keys(obj)) {
    if (target.hasOwnProperty(k)) {
      target[k] = obj[k];
    }
  }
}

export function transformApiDefinitionsToApis(
  apiDefinitions: Record<string, string> = {},
): Record<string, Api> {
  let apis: Record<string, Api> = {};
  for (const [apiName, apiPath] of Object.entries(apiDefinitions)) {
    apis[apiName] = { root: apiPath };
  }
  return apis;
}

export function resolvePresets(presets: string[], plugins: Plugin[]) {
  return presets.map((presetName) => {
    const { pluginId, configName } = parsePresetName(presetName);
    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) {
      throw new Error(`Invalid config ${red(presetName)}: plugin ${pluginId} is not included.`);
    }

    const preset = plugin.configs?.[configName]!;
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
  });
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
      // TODO: resolve npm packages similar to eslint
      const pluginModule =
        typeof p === 'string'
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

export function prefixRules<T extends Record<string, any>>(rules: T, prefix: string) {
  if (!prefix) return rules;

  const res: any = {};
  for (const name of Object.keys(rules)) {
    res[`${prefix}/${name}`] = rules[name];
  }

  return res;
}
export function transformLint(result: LintRawConfig) {
  const rules = {
    [OasVersion.Version2]: { ...result.rules, ...result.oas2Rules },
    [OasVersion.Version3_0]: { ...result.rules, ...result.oas3_0Rules },
    [OasVersion.Version3_1]: { ...result.rules, ...result.oas3_1Rules },
  };

  const preprocessors = {
    [OasVersion.Version2]: { ...result.preprocessors, ...result.oas2Preprocessors },
    [OasVersion.Version3_0]: { ...result.preprocessors, ...result.oas3_0Preprocessors },
    [OasVersion.Version3_1]: { ...result.preprocessors, ...result.oas3_1Preprocessors },
  };

  const decorators = {
    [OasVersion.Version2]: { ...result.decorators, ...result.oas2Decorators },
    [OasVersion.Version3_0]: { ...result.decorators, ...result.oas3_0Decorators },
    [OasVersion.Version3_1]: { ...result.decorators, ...result.oas3_1Decorators },
  };
  const plugins = result.plugins;
  return {
    rules,
    preprocessors,
    decorators,
    plugins,
  }
}
export function mergeExtends(rulesConfList: ResolvedLintRawConfig[]) {
  const result: Omit<ResolvedLintRawConfig, RulesFields> & Required<Pick<ResolvedLintRawConfig, RulesFields>> = {
    rules: {},
    oas2Rules: {},
    oas3_0Rules: {},
    oas3_1Rules: {},

    preprocessors: {},
    oas2Preprocessors: {},
    oas3_0Preprocessors: {},
    oas3_1Preprocessors: {},

    decorators: {},
    oas2Decorators: {},
    oas3_0Decorators: {},
    oas3_1Decorators: {},
    plugins: [],
  };

  for (let rulesConf of rulesConfList) {
    if (rulesConf.extends) {
      throw new Error(
        `\`extends\` is not supported in shared configs yet: ${JSON.stringify(
          rulesConf,
          null,
          2,
        )}.`,
      );
    }

    Object.assign(result.rules, rulesConf.rules);
    Object.assign(result.oas2Rules, rulesConf.oas2Rules);
    assignExisting(result.oas2Rules, rulesConf.rules || {});
    Object.assign(result.oas3_0Rules, rulesConf.oas3_0Rules);
    assignExisting(result.oas3_0Rules, rulesConf.rules || {});
    Object.assign(result.oas3_1Rules, rulesConf.oas3_1Rules);
    assignExisting(result.oas3_1Rules, rulesConf.rules || {});

    Object.assign(result.preprocessors, rulesConf.preprocessors);
    Object.assign(result.oas2Preprocessors, rulesConf.oas2Preprocessors);
    assignExisting(result.oas2Preprocessors, rulesConf.preprocessors || {});
    Object.assign(result.oas3_0Preprocessors, rulesConf.oas3_0Preprocessors);
    assignExisting(result.oas3_0Preprocessors, rulesConf.preprocessors || {});
    Object.assign(result.oas3_1Preprocessors, rulesConf.oas3_1Preprocessors);
    assignExisting(result.oas3_1Preprocessors, rulesConf.preprocessors || {});

    Object.assign(result.decorators, rulesConf.decorators);
    Object.assign(result.oas2Decorators, rulesConf.oas2Decorators);
    assignExisting(result.oas2Decorators, rulesConf.decorators || {});
    Object.assign(result.oas3_0Decorators, rulesConf.oas3_0Decorators);
    assignExisting(result.oas3_0Decorators, rulesConf.decorators || {});
    Object.assign(result.oas3_1Decorators, rulesConf.oas3_1Decorators);
    assignExisting(result.oas3_1Decorators, rulesConf.decorators || {});
    if (rulesConf.plugins) {
      result.plugins?.push(...rulesConf.plugins);
    }
  }

  return result;
}

export function getMergedConfig(config: Config, entrypointAlias?: string): Config {
  return entrypointAlias
    ? new Config(
        {
          ...config.rawConfig,
          lint: entrypointAlias ? config.apis[entrypointAlias]?.lint : config.lint,
          // lint: getMergedLintRawConfig(config, entrypointAlias), // FIXME:
          'features.openapi': {
            ...config['features.openapi'],
            ...config.apis[entrypointAlias]?.['features.openapi'],
          },
          'features.mockServer': {
            ...config['features.mockServer'],
            ...config.apis[entrypointAlias]?.['features.mockServer'],
          },
          // TODO: merge everything else here
        },
        config.configFile,
      )
    : config;
}

export function transformConfig(rawConfig: DeprecatedRawConfig | RawConfig): RawConfig {
  if ((rawConfig as RawConfig).apis && (rawConfig as DeprecatedRawConfig).apiDefinitions) {
    throw new Error("Do not use 'apiDefinitions' field. Use 'apis' instead.\n");
  }
  if (
    (rawConfig as RawConfig)['features.openapi'] &&
    (rawConfig as DeprecatedRawConfig).referenceDocs
  ) {
    throw new Error("Do not use 'referenceDocs' field. Use 'features.openapi' instead.\n");
  }
  const { apiDefinitions, referenceDocs, ...rest } = rawConfig as DeprecatedRawConfig & RawConfig;
  if (apiDefinitions) {
    process.stderr.write(
      `The ${yellow('apiDefinitions')} field is deprecated. Use ${green(
        'apis',
      )} instead. Read more about this change: https://redocly.com/docs/api-registry/guides/migration-guide-config-file/#changed-properties\n`,
    );
  }
  if (referenceDocs) {
    process.stderr.write(
      `The ${yellow('referenceDocs')} field is deprecated. Use ${green(
        'features.openapi',
      )} instead. Read more about this change: https://redocly.com/docs/api-registry/guides/migration-guide-config-file/#changed-properties\n`,
    );
  }
  return {
    'features.openapi': referenceDocs,
    apis: transformApiDefinitionsToApis(apiDefinitions),
    ...rest,
  };
}

export function getResolveConfig(resolve?: RawResolveConfig): ResolveConfig {
  return {
    http: {
      headers: resolve?.http?.headers ?? [],
      customFetch: undefined,
    },
  };
}
function getMergedLintRawConfig(configLint: LintRawConfig, apiLint?: LintRawConfig) {
  const resultLint = {
    ...configLint,
    ...apiLint,
    rules: { ...configLint?.rules, ...apiLint?.rules },
    preprocessors: { ...configLint?.preprocessors, ...apiLint?.preprocessors },
    decorators: { ...configLint?.decorators, ...apiLint?.decorators },
  };
  return resultLint;
}

export async function resolveApis({
  apis,
  configPath = '',
  resolve,
  lintConfig,
}: {
  apis: Record<string, Api>;
  configPath?: string;
  resolve?: RawResolveConfig;
  lintConfig: LintRawConfig;
}): Promise<Record<string, Api>> {
  const resolvedApis: Record<string, Api> = {};
  for (const [apiName, apiContent] of Object.entries(apis)) {
    const rawLintConfig = getMergedLintRawConfig(lintConfig, apiContent.lint);
    const apiLint = await resolveLint({
      lintConfig: rawLintConfig,
      configPath,
      resolve,
    });
    resolvedApis[apiName] = {...apiContent, lint: (apiLint) };
  }

  return resolvedApis;
}

export function getUniquePlugins( plugins: Plugin[]): Plugin[]{
  return plugins.reduce<Plugin[]>(
    (acc, item) => (acc.some(({ id }) => id === item.id) ? acc : [...acc, item]),
    [],
  );
}
