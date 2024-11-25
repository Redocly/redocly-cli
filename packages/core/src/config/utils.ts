import {
  assignExistingRules,
  assignRules,
  isDefined,
  isTruthy,
  showErrorForDeprecatedField,
  showWarningForDeprecatedField,
} from '../utils';
import { Config } from './config';
import { logger, colorize } from '../logger';

import type {
  Api,
  DeprecatedInApi,
  DeprecatedInRawConfig,
  ImportedPlugin,
  FlatApi,
  FlatRawConfig,
  RawConfig,
  RawResolveConfig,
  ResolveConfig,
  ResolvedStyleguideConfig,
  RulesFields,
  StyleguideRawConfig,
  ThemeConfig,
  Plugin,
  PluginCreator,
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
  apiDefinitions?: DeprecatedInRawConfig['apiDefinitions']
): Record<string, Api> | undefined {
  if (!apiDefinitions) return undefined;
  const apis: Record<string, Api> = {};
  for (const [apiName, apiPath] of Object.entries(apiDefinitions)) {
    apis[apiName] = { root: apiPath };
  }
  return apis;
}

function extractFlatConfig<
  T extends Partial<
    (Api & DeprecatedInApi & FlatApi) & (DeprecatedInRawConfig & RawConfig & FlatRawConfig)
  >
>({
  plugins,
  extends: _extends,

  rules,
  oas2Rules,
  oas3_0Rules,
  oas3_1Rules,
  async2Rules,
  async3Rules,
  arazzoRules,

  preprocessors,
  oas2Preprocessors,
  oas3_0Preprocessors,
  oas3_1Preprocessors,
  async2Preprocessors,
  async3Preprocessors,
  arazzoPreprocessors,

  decorators,
  oas2Decorators,
  oas3_0Decorators,
  oas3_1Decorators,
  async2Decorators,
  async3Decorators,
  arazzoDecorators,

  ...rawConfigRest
}: T): {
  styleguideConfig?: StyleguideRawConfig;
  rawConfigRest: Omit<T, 'plugins' | 'extends' | RulesFields>;
} {
  const styleguideConfig = {
    plugins,
    extends: _extends,

    rules,
    oas2Rules,
    oas3_0Rules,
    oas3_1Rules,
    async2Rules,
    async3Rules,
    arazzoRules,

    preprocessors,
    oas2Preprocessors,
    oas3_0Preprocessors,
    oas3_1Preprocessors,
    async2Preprocessors,
    async3Preprocessors,
    arazzoPreprocessors,

    decorators,
    oas2Decorators,
    oas3_0Decorators,
    oas3_1Decorators,
    async2Decorators,
    async3Decorators,
    arazzoDecorators,

    doNotResolveExamples: rawConfigRest.resolve?.doNotResolveExamples,
  };

  if (
    (rawConfigRest.lint && rawConfigRest.styleguide) ||
    (Object.values(styleguideConfig).some(isDefined) &&
      (rawConfigRest.lint || rawConfigRest.styleguide))
  ) {
    throw new Error(
      `Do not use 'lint', 'styleguide' and flat syntax together. \nSee more about the configuration in the docs: https://redocly.com/docs/cli/configuration/ \n`
    );
  }

  return {
    styleguideConfig: Object.values(styleguideConfig).some(isDefined)
      ? styleguideConfig
      : undefined,

    rawConfigRest,
  };
}

function transformApis(
  legacyApis?: Record<string, Api & DeprecatedInApi & FlatApi>
): Record<string, Api> | undefined {
  if (!legacyApis) return undefined;
  const apis: Record<string, Api> = {};
  for (const [apiName, { lint, ...apiContent }] of Object.entries(legacyApis)) {
    const { styleguideConfig, rawConfigRest } = extractFlatConfig(apiContent);
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
    async2Rules: {},
    async3Rules: {},
    arazzoRules: {},

    preprocessors: {},
    oas2Preprocessors: {},
    oas3_0Preprocessors: {},
    oas3_1Preprocessors: {},
    async2Preprocessors: {},
    async3Preprocessors: {},
    arazzoPreprocessors: {},

    decorators: {},
    oas2Decorators: {},
    oas3_0Decorators: {},
    oas3_1Decorators: {},
    async2Decorators: {},
    async3Decorators: {},
    arazzoDecorators: {},

    plugins: [],
    pluginPaths: [],
    extendPaths: [],
  };

  for (const rulesConf of rulesConfList) {
    if (rulesConf.extends) {
      throw new Error(
        `'extends' is not supported in shared configs yet:\n${JSON.stringify(rulesConf, null, 2)}`
      );
    }

    assignRules(result.rules, rulesConf.rules);
    assignRules(result.oas2Rules, rulesConf.oas2Rules);
    assignExistingRules(result.oas2Rules, rulesConf.rules);
    assignRules(result.oas3_0Rules, rulesConf.oas3_0Rules);
    assignExistingRules(result.oas3_0Rules, rulesConf.rules || {});
    assignRules(result.oas3_1Rules, rulesConf.oas3_1Rules);
    assignExistingRules(result.oas3_1Rules, rulesConf.rules || {});
    assignRules(result.async2Rules, rulesConf.async2Rules);
    assignExistingRules(result.async2Rules, rulesConf.rules || {});
    assignRules(result.async3Rules, rulesConf.async3Rules);
    assignExistingRules(result.async3Rules, rulesConf.rules || {});
    assignRules(result.arazzoRules, rulesConf.arazzoRules);
    assignExistingRules(result.arazzoRules, rulesConf.rules || {});

    assignRules(result.preprocessors, rulesConf.preprocessors);
    assignRules(result.oas2Preprocessors, rulesConf.oas2Preprocessors);
    assignExistingRules(result.oas2Preprocessors, rulesConf.preprocessors || {});
    assignRules(result.oas3_0Preprocessors, rulesConf.oas3_0Preprocessors);
    assignExistingRules(result.oas3_0Preprocessors, rulesConf.preprocessors || {});
    assignRules(result.oas3_1Preprocessors, rulesConf.oas3_1Preprocessors);
    assignExistingRules(result.oas3_1Preprocessors, rulesConf.preprocessors || {});
    assignRules(result.async2Preprocessors, rulesConf.async2Preprocessors);
    assignExistingRules(result.async2Preprocessors, rulesConf.preprocessors || {});
    assignRules(result.async3Preprocessors, rulesConf.async3Preprocessors);
    assignExistingRules(result.async3Preprocessors, rulesConf.preprocessors || {});
    assignRules(result.arazzoPreprocessors, rulesConf.arazzoPreprocessors);
    assignExistingRules(result.arazzoPreprocessors, rulesConf.preprocessors || {});

    assignRules(result.decorators, rulesConf.decorators);
    assignRules(result.oas2Decorators, rulesConf.oas2Decorators);
    assignExistingRules(result.oas2Decorators, rulesConf.decorators || {});
    assignRules(result.oas3_0Decorators, rulesConf.oas3_0Decorators);
    assignExistingRules(result.oas3_0Decorators, rulesConf.decorators || {});
    assignRules(result.oas3_1Decorators, rulesConf.oas3_1Decorators);
    assignExistingRules(result.oas3_1Decorators, rulesConf.decorators || {});
    assignRules(result.async2Decorators, rulesConf.async2Decorators);
    assignExistingRules(result.async2Decorators, rulesConf.decorators || {});
    assignRules(result.async3Decorators, rulesConf.async3Decorators);
    assignExistingRules(result.async3Decorators, rulesConf.decorators || {});
    assignRules(result.arazzoDecorators, rulesConf.arazzoDecorators);
    assignExistingRules(result.arazzoDecorators, rulesConf.decorators || {});

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
          theme: {
            ...config.rawConfig.theme,
            ...config.apis[apiName]?.theme,
          },
          files: [...config.files, ...(config.apis?.[apiName]?.files ?? [])],
          // TODO: merge everything else here
        },
        config.configFile
      )
    : config;
}

export function checkForDeprecatedFields(
  deprecatedField: keyof (DeprecatedInRawConfig & RawConfig),
  updatedField: keyof FlatRawConfig | undefined,
  rawConfig: DeprecatedInRawConfig & RawConfig & FlatRawConfig,
  updatedObject: keyof FlatRawConfig | undefined
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

  if (rawConfig[deprecatedField] && updatedObject && rawConfig[updatedObject]) {
    showErrorForDeprecatedField(deprecatedField, updatedField, updatedObject);
  }

  if (rawConfig[deprecatedField] || isDeprecatedFieldInApis) {
    showWarningForDeprecatedField(deprecatedField, updatedField, updatedObject);
  }
}

export function transformConfig(
  rawConfig: DeprecatedInRawConfig & RawConfig & FlatRawConfig
): RawConfig {
  const migratedFields: [
    keyof (DeprecatedInRawConfig & RawConfig),
    keyof FlatRawConfig | undefined,
    keyof ThemeConfig | undefined
  ][] = [
    ['apiDefinitions', 'apis', undefined],
    ['referenceDocs', 'openapi', 'theme'],
    ['lint', undefined, undefined],
    ['styleguide', undefined, undefined],
    ['features.openapi', 'openapi', 'theme'],
  ];

  for (const [deprecatedField, updatedField, updatedObject] of migratedFields) {
    checkForDeprecatedFields(deprecatedField, updatedField, rawConfig, updatedObject);
  }

  const { apis, apiDefinitions, referenceDocs, lint, ...rest } = rawConfig;

  const { styleguideConfig, rawConfigRest } = extractFlatConfig(rest);

  const transformedConfig: RawConfig = {
    theme: {
      openapi: {
        ...referenceDocs,
        ...rawConfig['features.openapi'],
        ...rawConfig.theme?.openapi,
      },
      mockServer: {
        ...rawConfig['features.mockServer'],
        ...rawConfig.theme?.mockServer,
      },
    },
    apis: transformApis(apis) || transformApiDefinitionsToApis(apiDefinitions),
    styleguide: styleguideConfig || lint,
    ...rawConfigRest,
  };
  showDeprecationMessages(transformedConfig);
  return transformedConfig;
}

function showDeprecationMessages(config: RawConfig) {
  let allRules = { ...config.styleguide?.rules };
  for (const api of Object.values(config.apis || {})) {
    allRules = { ...allRules, ...api?.styleguide?.rules };
  }
  for (const ruleKey of Object.keys(allRules)) {
    if (ruleKey.startsWith('assert/')) {
      logger.warn(
        `\nThe 'assert/' syntax in ${ruleKey} is deprecated. Update your configuration to use 'rule/' instead. Examples and more information: https://redocly.com/docs/cli/rules/configurable-rules/\n`
      );
    }
  }
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

export class ConfigValidationError extends Error {}

export function deepCloneMapWithJSON<K, V>(originalMap: Map<K, V>): Map<K, V> {
  return new Map(JSON.parse(JSON.stringify([...originalMap])));
}

export function isDeprecatedPluginFormat(plugin: ImportedPlugin | undefined): plugin is Plugin {
  return plugin !== undefined && typeof plugin === 'object' && 'id' in plugin;
}

export function isCommonJsPlugin(plugin: ImportedPlugin | undefined): plugin is PluginCreator {
  return typeof plugin === 'function';
}
