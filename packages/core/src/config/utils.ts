import { green, yellow } from 'colorette';
import { assignExisting } from '../utils';
import { Config } from './config';

import type {
  Api,
  DeprecatedRawConfig,
  Plugin,
  RawConfig,
  RawResolveConfig,
  ResolveConfig,
  ResolvedLintConfig,
  RulesFields,
} from './types';

export function parsePresetName(presetName: string): { pluginId: string; configName: string } {
  if (presetName.indexOf('/') > -1) {
    const [pluginId, configName] = presetName.split('/');
    return { pluginId, configName };
  } else {
    return { pluginId: '', configName: presetName };
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

export function prefixRules<T extends Record<string, any>>(rules: T, prefix: string) {
  if (!prefix) return rules;

  const res: any = {};
  for (const name of Object.keys(rules)) {
    res[`${prefix}/${name}`] = rules[name];
  }

  return res;
}

export function mergeExtends(rulesConfList: ResolvedLintConfig[]) {
  const result: Omit<ResolvedLintConfig, RulesFields> &
    Required<Pick<ResolvedLintConfig, RulesFields>> = {
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
    pluginPaths: [],
    extendPaths: [],
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

    result.plugins!.push(...(rulesConf.plugins || []));
    result.pluginPaths!.push(...(rulesConf.pluginPaths || []));
    result.extendPaths!.push(...new Set(rulesConf.extendPaths));
  }

  return result;
}

export function getMergedConfig(config: Config, entrypointAlias?: string): Config {
  const extendPaths = [
    ...Object.values(config.apis).map((api) => api?.lint?.extendPaths),
    config.rawConfig?.lint?.extendPaths,
  ]
    .flat()
    .filter(Boolean) as string[];

  const pluginPaths = [
    ...Object.values(config.apis).map((api) => api?.lint?.pluginPaths),
    config.rawConfig?.lint?.pluginPaths,
  ]
    .flat()
    .filter(Boolean) as string[];

  return entrypointAlias
    ? new Config(
        {
          ...config.rawConfig,
          lint: {
            ...(config.apis[entrypointAlias]
              ? config.apis[entrypointAlias].lint
              : config.rawConfig.lint),
            extendPaths,
            pluginPaths,
          },
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

export function getUniquePlugins(plugins: Plugin[]): Plugin[] {
  const seen = new Set();
  const results = [];
  for (const p of plugins) {
    if (!seen.has(p.id)) {
      results.push(p);
      seen.add(p.id);
    } else if (p.id) {
      process.stderr.write(
        `Duplicate plugin id "${yellow(p.id)}".\n`,
      );
    }
  }
  return results;
}
