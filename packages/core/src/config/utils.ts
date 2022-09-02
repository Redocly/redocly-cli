import {
  assignExisting,
  isDefined,
  isTruthy,
  showErrorForDeprecatedField,
  showWarningForDeprecatedField,
} from '../utils';
import { Config } from './config';
import type {
  Api,
  DeprecatedInApi,
  DeprecatedInRawConfig,
  FlatApi,
  FlatRawConfig,
  Plugin,
  RawConfig,
  RawResolveConfig,
  ResolveConfig,
  ResolvedStyleguideConfig,
  RulesFields,
  StyleguideRawConfig,
} from './types';
import { logger, colorize } from '../logger';

export function parsePresetName(presetName: string): { pluginId: string; configName: string } {
  if (presetName.indexOf('/') > -1) {
    const [pluginId, configName] = presetName.split('/');
    return { pluginId, configName };
  } else {
    return { pluginId: '', configName: presetName };
  }
}

export function transformApiDefinitionsToApis(
  apiDefinitions?: DeprecatedInRawConfig['apiDefinitions']
): Record<string, Api> | undefined {
  if (!apiDefinitions) return undefined;
  const apis: Record<string, Api> = {};
  for (const [apiName, apiPath] of Object.entries(apiDefinitions)) {
    apis[apiName] = { root: apiPath };
  }
  return apis;
}

const extractStyleguide = <T>({
  plugins,
  extends: _extends,

  rules,
  oas2Rules,
  oas3_0Rules,
  oas3_1Rules,

  preprocessors,
  oas2Preprocessors,
  oas3_0Preprocessors,
  oas3_1Preprocessors,

  decorators,
  oas2Decorators,
  oas3_0Decorators,
  oas3_1Decorators,

  ...rawConfigRest
}: T & Pick<StyleguideRawConfig, 'plugins' | 'extends' | RulesFields>): {
  styleguideConfig?: StyleguideRawConfig;
  rawConfigRest: Omit<T, 'plugins' | 'extends' | RulesFields>;
} => {
  const styleguideConfig = {
    plugins,
    extends: _extends,

    rules,
    oas2Rules,
    oas3_0Rules,
    oas3_1Rules,

    preprocessors,
    oas2Preprocessors,
    oas3_0Preprocessors,
    oas3_1Preprocessors,

    decorators,
    oas2Decorators,
    oas3_0Decorators,
    oas3_1Decorators,

    doNotResolveExamples: (rawConfigRest as FlatRawConfig).resolve?.doNotResolveExamples,
  };

  return {
    styleguideConfig: Object.values(styleguideConfig).some(isDefined)
      ? styleguideConfig
      : undefined,

    rawConfigRest,
  };
};

function transformApis(
  legacyApis?: Record<string, Api & DeprecatedInApi & FlatApi>
): Record<string, Api> | undefined {
  if (!legacyApis) return undefined;
  const apis: Record<string, Api> = {};
  for (const [apiName, { lint, ...apiContent }] of Object.entries(legacyApis)) {
    const { styleguideConfig, rawConfigRest } = extractStyleguide(apiContent);
    apis[apiName] = {
      styleguide: styleguideConfig || lint,
      ...rawConfigRest,
    };
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

export function mergeExtends(rulesConfList: ResolvedStyleguideConfig[]) {
  const result: Omit<ResolvedStyleguideConfig, RulesFields> &
    Required<Pick<ResolvedStyleguideConfig, RulesFields>> = {
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

  for (const rulesConf of rulesConfList) {
    if (rulesConf.extends) {
      throw new Error(
        `'extends' is not supported in shared configs yet: ${JSON.stringify(rulesConf, null, 2)}.`
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

export function getMergedConfig(config: Config, apiName?: string): Config {
  const extendPaths = [
    ...Object.values(config.apis).map((api) => api?.styleguide?.extendPaths),
    config.rawConfig?.styleguide?.extendPaths,
  ]
    .flat()
    .filter(isTruthy);

  const pluginPaths = [
    ...Object.values(config.apis).map((api) => api?.styleguide?.pluginPaths),
    config.rawConfig?.styleguide?.pluginPaths,
  ]
    .flat()
    .filter(isTruthy);

  return apiName
    ? new Config(
        {
          ...config.rawConfig,
          styleguide: {
            ...(config.apis[apiName]
              ? config.apis[apiName].styleguide
              : config.rawConfig.styleguide),
            extendPaths,
            pluginPaths,
          },
          'features.openapi': {
            ...config['features.openapi'],
            ...config.apis[apiName]?.['features.openapi'],
          },
          'features.mockServer': {
            ...config['features.mockServer'],
            ...config.apis[apiName]?.['features.mockServer'],
          },
          // TODO: merge everything else here
        },
        config.configFile
      )
    : config;
}

function checkForDeprecatedFields(
  deprecatedField: keyof (DeprecatedInRawConfig & RawConfig),
  updatedField: keyof FlatRawConfig | undefined,
  rawConfig: DeprecatedInRawConfig & RawConfig & FlatRawConfig
): void {
  const isDeprecatedFieldInApis =
    rawConfig.apis &&
    Object.values(rawConfig.apis).some(
      (api: Api & FlatApi & DeprecatedInApi & DeprecatedInRawConfig & RawConfig & FlatRawConfig) =>
        api[deprecatedField]
    );

  if (rawConfig[deprecatedField] && updatedField === null) {
    showWarningForDeprecatedField(deprecatedField);
  }

  if (rawConfig[deprecatedField] && updatedField && rawConfig[updatedField]) {
    showErrorForDeprecatedField(deprecatedField, updatedField);
  }

  if (rawConfig[deprecatedField] || isDeprecatedFieldInApis) {
    showWarningForDeprecatedField(deprecatedField, updatedField);
  }
}

export function transformConfig(
  rawConfig: DeprecatedInRawConfig & RawConfig & FlatRawConfig
): RawConfig {
  const migratedFields: [
    keyof (DeprecatedInRawConfig & RawConfig),
    keyof FlatRawConfig | undefined
  ][] = [
    ['apiDefinitions', 'apis'],
    ['referenceDocs', 'features.openapi'],
    ['lint', undefined],
    ['styleguide', undefined],
  ];

  for (const [deprecatedField, updatedField] of migratedFields) {
    checkForDeprecatedFields(deprecatedField, updatedField, rawConfig);
  }

  const { apis, apiDefinitions, referenceDocs, lint, ...rest } = rawConfig;

  const { styleguideConfig, rawConfigRest } = extractStyleguide(rest);

  return {
    'features.openapi': referenceDocs,
    apis: transformApis(apis) || transformApiDefinitionsToApis(apiDefinitions),
    styleguide: styleguideConfig || lint,
    ...rawConfigRest,
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
      logger.warn(`Duplicate plugin id "${colorize.red(p.id)}".\n`);
    }
  }
  return results;
}
