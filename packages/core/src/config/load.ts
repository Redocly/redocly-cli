import * as fs from 'fs';
import { RedoclyClient } from '../redocly';
import { loadYaml } from '../utils';
import { Api, Config, DeprecatedRawConfig, DOMAINS, LintConfig, LintRawConfig, RawConfig, Region } from './config';
import { defaultPlugin } from './builtIn';

export async function loadConfig(configPath?: string, customExtends?: string[]): Promise<Config> {
  const rawConfig = await getConfig(configPath);

  if (customExtends !== undefined) {
    rawConfig.lint = rawConfig.lint || {};
    rawConfig.lint.extends = customExtends;
  }

  const redoclyClient = new RedoclyClient();
  const tokens = await redoclyClient.getTokens();

  if (tokens.length) {
    if (!rawConfig.resolve) rawConfig.resolve = {};
    if (!rawConfig.resolve.http) rawConfig.resolve.http = {};
    rawConfig.resolve.http.headers = [...(rawConfig.resolve.http.headers ?? [])];

    for (const item of tokens) {
      const domain = DOMAINS[item.region as Region];
      rawConfig.resolve.http.headers.push({
        matches: `https://api.${domain}/registry/**`,
        name: 'Authorization',
        envVariable: undefined,
        value: item.token,
      },
      //support redocly.com domain for future compatibility
      ...(item.region === 'us' ? [{
        matches: `https://api.redocly.com/registry/**`,
        name: 'Authorization',
        envVariable: undefined,
        value: item.token,
      }] : []));
    }
  }
  return new Config(
    {
      ...rawConfig,
      lint: {
        ...rawConfig?.lint,
        plugins: [...(rawConfig?.lint?.plugins || []), defaultPlugin], // inject default plugin
      },
    },
    configPath,
  );
}

function transformApiDefinitionsToApis(apiDefinitions: Record<string, string> = {}): Record<string, Api> {
  const apis: Record<string, Api> = {};
  for (const [apiName, apiPath] of Object.entries(apiDefinitions)) {
    apis[apiName] = { root: apiPath };
  }
  return apis;
}

function transformConfig(rawConfig: DeprecatedRawConfig | RawConfig): RawConfig {
  if ((rawConfig as RawConfig).apis && (rawConfig as DeprecatedRawConfig).apiDefinitions ||
    (rawConfig as RawConfig)['features.openapi'] && (rawConfig as DeprecatedRawConfig).referenceDocs
  ) {
    throw new Error('Do not use old & new config syntax simultaneously');
  }
  const { apiDefinitions, referenceDocs, ...rest } = rawConfig as DeprecatedRawConfig & RawConfig;
  // if (apiDefinitions || referenceDocs) {
  //   // TODO: add link to docs.
  //   // TODO: show warning without throwing error.
  //   throw new Error('apiDefinitions & referenceDocs fields are deprecated. Use apis & features.openapi instead (see  docs: /.//) ');
  // }
  return {
    'features.openapi': referenceDocs,
    apis: transformApiDefinitionsToApis(apiDefinitions),
    ...rest
  };
}

export async function getConfig(path?: string) {
  let rawConfig: RawConfig = {};
  const configPath = path || findConfig();
  if (configPath) {
    try {
      rawConfig = (await loadYaml(configPath)) as RawConfig;
    } catch (e) {
      throw new Error(`Error parsing config file at \`${configPath}\`: ${e.message}`);
    }
  }
  return transformConfig(rawConfig);
}

export function mergeLintConfigs(config: Config, entrypointAlias?: string): Config {
  if (!entrypointAlias) return config;
  let mergedLint = config.apis[entrypointAlias]?.lint || {};
  mergedLint.plugins = config.lint.plugins;
  mergedLint.doNotResolveExamples = mergedLint.doNotResolveExamples ?? config.lint.doNotResolveExamples ?? false;
  for (const [key, value] of Object.entries(config.rawConfig.lint as LintRawConfig)) {
    if (key === 'rules' || key === 'preprocessors' || key === 'decorators') {
      mergedLint[key] = { ...(value as any), ...(mergedLint[key] || {}) }
    }
    if (key === 'extends') {
      mergedLint[key] = Array.from(new Set([...(value as any), ...(mergedLint[key] || [])]));
    }
  }
  config.lint = new LintConfig(mergedLint);
  return config;
}

function findConfig() {
  if (fs.existsSync('.redocly.yaml')) {
    return '.redocly.yaml';
  } else if (fs.existsSync('.redocly.yml')) {
    return '.redocly.yml';
  }
  return undefined;
}
