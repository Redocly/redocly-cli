import * as fs from 'fs';
import * as path from 'path';
import { RedoclyClient } from '../redocly';
import { isEmptyObject, loadYaml, doesYamlFileExist } from '../utils';
import { parseYaml } from '../js-yaml';
import { Config, DOMAINS } from './config';
import { transformConfig } from './utils';
import { resolveConfig } from './config-resolvers';

import type { DeprecatedInRawConfig, RawConfig, Region } from './types';
import { RegionalTokenWithValidity } from '../redocly/redocly-client-types';

async function addConfigMetadata({
  rawConfig,
  customExtends,
  configPath,
  tokens,
}: {
  rawConfig: RawConfig;
  customExtends?: string[];
  configPath?: string;
  tokens?: RegionalTokenWithValidity[]
}): Promise<Config> {
  if (customExtends !== undefined) {
    rawConfig.styleguide = rawConfig.styleguide || {};
    rawConfig.styleguide.extends = customExtends;
  } else if (isEmptyObject(rawConfig)) {
    // TODO: check if we can add recommended here. add message here?
    // rawConfig.styleguide = { extends: ['recommended'], recommendedFallback: true };
  }

  if (tokens?.length) {
    if (!rawConfig.resolve) rawConfig.resolve = {};
    if (!rawConfig.resolve.http) rawConfig.resolve.http = {};
    rawConfig.resolve.http.headers = [...(rawConfig.resolve.http.headers ?? [])];

    for (const item of tokens) {
      const domain = DOMAINS[item.region as Region];
      rawConfig.resolve.http.headers.push(
        {
          matches: `https://api.${domain}/registry/**`,
          name: 'Authorization',
          envVariable: undefined,
          value: item.token,
        },
        //support redocly.com domain for future compatibility
        ...(item.region === 'us'
          ? [
              {
                matches: `https://api.redoc.ly/registry/**`,
                name: 'Authorization',
                envVariable: undefined,
                value: item.token,
              },
            ]
          : [])
      );
    }
  }

  return resolveConfig(rawConfig, configPath);
}

export async function loadConfig(
  configPath: string | undefined = findConfig(),
  customExtends?: string[],
  processRawConfig?: (rawConfig: RawConfig) => void | Promise<void>
): Promise<Config> {
  const rawConfig = await getConfig(configPath);
  if (typeof processRawConfig === 'function') {
    await processRawConfig(rawConfig);
  }

  const redoclyClient = new RedoclyClient();
  const tokens = await redoclyClient.getTokens();

  return addConfigMetadata({
    rawConfig,
    customExtends,
    configPath,
    tokens,
  });
}

export const CONFIG_FILE_NAMES = ['redocly.yaml', 'redocly.yml', '.redocly.yaml', '.redocly.yml'];

export function findConfig(dir?: string): string | undefined {
  if (!fs.hasOwnProperty('existsSync')) return;
  const existingConfigFiles = CONFIG_FILE_NAMES.map((name) =>
    dir ? path.resolve(dir, name) : name
  ).filter(fs.existsSync);
  if (existingConfigFiles.length > 1) {
    throw new Error(`
      Multiple configuration files are not allowed. 
      Found the following files: ${existingConfigFiles.join(', ')}. 
      Please use 'redocly.yaml' instead.
    `);
  }
  return existingConfigFiles[0];
}

export async function getConfig(configPath: string | undefined = findConfig()): Promise<RawConfig> {
  if (!configPath || !doesYamlFileExist(configPath)) return {};
  try {
    const rawConfig = (await loadYaml<RawConfig & DeprecatedInRawConfig>(configPath)) || {};
    return transformConfig(rawConfig);
  } catch (e) {
    throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
  }
}

interface CreateConfigOptions {
  extends?: string[];
  tokens?: RegionalTokenWithValidity[],
}

export async function createConfig (content: string, options?: CreateConfigOptions): Promise<Config>;
export async function createConfig (rawConfig: RawConfig, options?: CreateConfigOptions): Promise<Config>;
export async function createConfig (rawConfig: any, options: CreateConfigOptions = {}): Promise<Config> {
  if (typeof rawConfig === 'string') {
    rawConfig = parseYaml(rawConfig);
  }

  return addConfigMetadata({
    rawConfig: transformConfig(rawConfig),
    ...options
  });
}
