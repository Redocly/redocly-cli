import * as fs from 'fs';
import * as path from 'path';
import { RedoclyClient } from '../redocly';
import { loadYaml, parseYaml } from '../utils';
import { Config, DOMAINS, Region, transformConfig } from './config';
import { defaultPlugin } from './builtIn';
import { BaseResolver } from '../resolve';
import { isAbsoluteUrl } from '../ref-utils';

import type { ResolvedLintRawConfig, LintRawConfig, RawConfig } from './config';

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

function getRawConfigWithMergedByPriority(config: ResolvedLintRawConfig): LintRawConfig {
  const extendedString = [];
  const extendedRules = {};
  const extendedPlugins = {};
  const extendedPreprocessors = {};
  const extendedDecorators = {};

  for (const extendsItem of config?.extends || []) {
    if (typeof extendsItem === 'string') {
      extendedString.push(extendsItem);
    } else {
      // TODO: should test plugins/preprocessors/decorators
      Object.assign(extendedRules, extendsItem.rules);
      Object.assign(extendedPlugins, extendsItem.plugins);
      Object.assign(extendedPreprocessors, extendsItem.preprocessors);
      Object.assign(extendedDecorators, extendsItem.decorators);
    }
  }

  return {
    ...config,
    rules: { ...extendedRules, ...config?.rules },
    extends: extendedString,
  };
}

async function resolveExtends(
  lintConfig: LintRawConfig,
): Promise<LintRawConfig | undefined> {
  if (!lintConfig.extends || !lintConfig.extends.length) return;
  const lintExtend = [];
  for (const item of lintConfig.extends) {
    if (typeof item !== 'string') {
      throw new Error(`Error configuration format not detected in lint.extends: ${item}`);
    }

    if (isAbsoluteUrl(item) || fs.existsSync(item)) {
      const nestedLintConfig = await loadExtendLintConfig(item);
      if (nestedLintConfig.extends) {
        lintExtend.push(await resolveExtends(nestedLintConfig) as LintRawConfig);
      }

      lintExtend.push(nestedLintConfig);
    } else {
      lintExtend.push(item);
    }
  }
  return getRawConfigWithMergedByPriority({ ...lintConfig, extends: lintExtend });
}

async function loadExtendLintConfig(filePath: string): Promise<LintRawConfig> {
  // TODO: should test urls and handle errors
  const fileSource = await new BaseResolver().loadExternalRef(filePath);
  return (parseYaml(fileSource.body) as RawConfig).lint || {};
}
