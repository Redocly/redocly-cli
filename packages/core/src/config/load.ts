import * as fs from 'fs';
import * as path from 'path';
import { RedoclyClient } from '../redocly';
import { isNotString, isString, loadYaml, mergeArrays, parseYaml } from '../utils';
import { Config, DOMAINS } from './config';
import { defaultPlugin } from './builtIn';
import { BaseResolver } from '../resolve';
import { isAbsoluteUrl } from '../ref-utils';
import { transformConfig } from './utils';

import type { ResolvedLintRawConfig, LintRawConfig, RawConfig, Region } from './types';

export async function loadConfig(
  configPath: string | undefined = findConfig(),
  customExtends?: string[],
): Promise<Config> {
  const rawConfig = await getConfig(configPath);

  if (customExtends !== undefined) {
    rawConfig.lint = rawConfig.lint || {};
    rawConfig.lint.extends = customExtends;
  }

  if (rawConfig.lint?.extends) {
    rawConfig.lint = await resolveExtends(rawConfig?.lint);
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
          },
    {},
  );

  return {
    ...lintConfig,
    plugins: lintConfig.plugins,
    // TODO: think about unique default rules/plugins group
    extends: extendedContent?.extends,
    rules: { ...extendedContent?.rules, ...lintConfig.rules },
    preprocessors: { ...extendedContent?.preprocessors, ...lintConfig.preprocessors },
    decorators: { ...extendedContent?.decorators, ...lintConfig.decorators },
  };
}

async function resolveExtends(lintConfig: LintRawConfig): Promise<LintRawConfig> {
  if (!lintConfig.extends || !lintConfig.extends.length) return lintConfig;
  if (lintConfig.extends.some(isNotString)) {
    throw Error(`Error configuration format not detected in lint.extends`); // TODO: show correct errors
  }

  const lintExtends = await Promise.all(
    lintConfig.extends.map(async (item) =>
      isAbsoluteUrl(item) || fs.existsSync(item)
        ? loadExtendLintConfig(item).then(resolveExtends)
        : item,
    ),
  );
  // TODO: check perf. - if lintExtends contains only strings, we can simply return lintConfig
  return getLintRawConfigWithMergedContentByPriority({ ...lintConfig, extends: lintExtends });
}

async function loadExtendLintConfig(filePath: string): Promise<LintRawConfig> {
  // TODO: should test urls and handle errors
  const fileSource = await new BaseResolver().loadExternalRef(filePath);
  return (parseYaml(fileSource.body) as RawConfig).lint || {};
}
