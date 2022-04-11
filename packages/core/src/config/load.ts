import * as fs from 'fs';
import * as path from 'path';
import { RedoclyClient } from '../redocly';
import { isEmptyArray, isNotString, isString, loadYaml, mergeArrays, parseYaml } from '../utils';
import { Config, DOMAINS } from './config';
import { defaultPlugin } from './builtIn';
import { getResolveConfig, transformConfig } from './utils';
import { isAbsoluteUrl } from '../ref-utils';
import { BaseResolver } from '../resolve';

import type {
  Api,
  LintRawConfig,
  Plugin,
  RawConfig,
  RawResolveConfig,
  Region,
  ResolvedLintRawConfig,
} from './types';

export async function loadConfig(
  configPath: string | undefined = findConfig(),
  customExtends?: string[],
): Promise<Config> {
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
        matches: `https://api.redoc.ly/registry/**`,
        name: 'Authorization',
        envVariable: undefined,
        value: item.token,
      }] : []));
    }
  }


  const lint = rawConfig.lint?.extends 
  ? await resolveExtends({
      lintConfig: rawConfig?.lint,
      configPath,
      resolve: rawConfig.resolve,
    })
    : rawConfig.lint;

  const apis = rawConfig.apis
    ? await resolveApis({
      apis: rawConfig.apis,
      configPath,
      resolve: rawConfig.resolve,
    })
    : rawConfig.apis



  return new Config(
    {
      ...rawConfig,
      apis,
      lint: {
        ...lint,
        plugins: [...(rawConfig?.lint?.plugins || []), defaultPlugin], // inject default plugin
      },
    },
    configPath,
  );
}

export const CONFIG_FILE_NAMES = ['redocly.yaml', 'redocly.yml', '.redocly.yaml', '.redocly.yml'];

export function findConfig(dir?: string): string | undefined {
  if (!fs.hasOwnProperty('existsSync')) return;
  const existingConfigFiles = CONFIG_FILE_NAMES
    .map(name => dir ? path.resolve(dir, name) : name)
    .filter(fs.existsSync);
  if (existingConfigFiles.length > 1) {
    throw new Error(`
      Multiple configuration files are not allowed. 
      Found the following files: ${existingConfigFiles.join(', ')}. 
      Please use 'redocly.yaml' instead.
    `);
  }
  return existingConfigFiles[0];
}

export async function getConfig(configPath: string | undefined = findConfig()) {
  if (!configPath) return {};
  try {
    const rawConfig = ((await loadYaml(configPath)) || {}) as RawConfig;
    return transformConfig(rawConfig);
  } catch (e) {
    throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
  }
}

export function getLintRawConfigWithMergedContentByPriority(
  lintConfig: ResolvedLintRawConfig,
): LintRawConfig {
  const extendedContent = lintConfig.extends?.reduce<LintRawConfig>(
    (acc, item) =>
      isString(item)
        ? {
            ...acc,
            extends: mergeArrays(acc.extends, [item]),
          }
        : {
            rules: { ...acc.rules, ...item.rules },
            // TODO: add oas_rules here as well (use mergeExtends?)
            preprocessors: { ...acc.preprocessors, ...item.preprocessors },
            decorators: { ...acc.decorators, ...item.decorators },
            extends: mergeArrays(acc.extends, item.extends),
            plugins: mergeArrays(acc.plugins, item.plugins),
          },
    {},
  );

  return {
    ...lintConfig,
    plugins: mergeArrays(extendedContent?.plugins, lintConfig.plugins), // FIXME: plugins should be uniq
    // TODO: think about unique default rules/plugins group
    extends: extendedContent?.extends,
    rules: { ...extendedContent?.rules, ...lintConfig.rules },
    preprocessors: { ...extendedContent?.preprocessors, ...lintConfig.preprocessors },
    decorators: { ...extendedContent?.decorators, ...lintConfig.decorators },
  };
}

export function resolveNestedPlugins({
  configPath,
  pluginConfigPath,
  plugin,
}: {
  configPath: string;
  pluginConfigPath: string;
  plugin: string | Plugin;
}): string | Plugin | undefined {
  if (!plugin) {
    return;
  }

  if (!isString(plugin)) {
    return plugin;
  }

  if (isAbsoluteUrl(plugin)) {
    throw new Error(
      `Error configuration format not detected (${plugin}). Nested plugin should be path to local file`,
    );
  }
  const pluginPath = path.resolve(path.dirname(pluginConfigPath), plugin as string);

  return path.resolve(path.dirname(configPath), pluginPath);
}

async function resolveApis({
  apis,
  configPath = '',
  resolve,
}: {
  apis: Record<string, Api>;
  configPath?: string;
  resolve?: RawResolveConfig;
}): Promise<Record<string, Api>> {
  const resolvedApis: Record<string, Api> = {};
  for (const [apiName, apiContent] of Object.entries(apis)) {
    const lint = await resolveExtends({
      lintConfig: apiContent.lint as LintRawConfig,
      configPath,
      resolve,
    });
    resolvedApis[apiName] = { ...apiContent, lint };
  }

  return resolvedApis;
}

async function resolveExtends({
  lintConfig,
  configPath = '',
  resolve,
}: {
  lintConfig: LintRawConfig | Omit<LintRawConfig, 'plugins'>;
  configPath?: string;
  resolve?: RawResolveConfig;
}): Promise<LintRawConfig> {
  if (!lintConfig?.extends || isEmptyArray(lintConfig.extends)) {
    return lintConfig;
  }

  if (lintConfig.extends.some(isNotString)) {
    throw new Error(
      `Error configuration format not detected in extends value must contain strings`,
    );
  }

  const lintExtends: (string | LintRawConfig)[] = [];
  for (const item of lintConfig.extends) {
    if (!isAbsoluteUrl(item) && !fs.existsSync(item)) {
      lintExtends.push(item);
      continue;
    }

    const extendedLintConfig = await loadExtendLintConfig(item, resolve);

    if (extendedLintConfig.plugins && !isEmptyArray(extendedLintConfig.plugins)) {
      extendedLintConfig.plugins = extendedLintConfig.plugins
        .map((plugin) => resolveNestedPlugins({ configPath, pluginConfigPath: item, plugin }))
        .filter(Boolean) as (string | Plugin)[];
    }

    if (extendedLintConfig.extends) {
      lintExtends.push(
        await resolveExtends({ lintConfig: extendedLintConfig, configPath, resolve }),
      );
      continue;
    }

    lintExtends.push(extendedLintConfig);
  }

  return getLintRawConfigWithMergedContentByPriority({ ...lintConfig, extends: lintExtends });
}

async function loadExtendLintConfig(
  filePath: string,
  resolve?: RawResolveConfig,
): Promise<LintRawConfig> {
  try {
    const fileSource = await new BaseResolver(getResolveConfig(resolve)).loadExternalRef(filePath);
    const rawConfig = transformConfig(parseYaml(fileSource.body) as RawConfig);

    if (!rawConfig.lint) {
      throw new Error(`Lint configuration format not detected (${filePath})`);
    }

    return rawConfig.lint;
  } catch (error) {
    throw new Error(`File not found (${filePath})`);
  }
}
