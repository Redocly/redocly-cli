import * as fs from 'fs';
import * as path from 'path';
import { RedoclyClient } from '../redocly';
import { isEmptyObject, loadYaml, doesYamlFileExist } from '../utils';
import { parseYaml } from '../js-yaml';
import { Config, DOMAINS } from './config';
import { transformConfig } from './utils';
import { resolveConfig } from './config-resolvers';

import type { DeprecatedInRawConfig, FlatRawConfig, RawConfig, Region } from './types';
import { RegionalTokenWithValidity } from '../redocly/redocly-client-types';

async function addConfigMetadata({
  rawConfig,
  customExtends,
  configPath,
  tokens,
  files,
  region,
}: {
  rawConfig: RawConfig;
  customExtends?: string[];
  configPath?: string;
  tokens?: RegionalTokenWithValidity[];
  files?: string[];
  region?: Region;
}): Promise<Config> {
  if (customExtends !== undefined) {
    rawConfig.styleguide = rawConfig.styleguide || {};
    rawConfig.styleguide.extends = customExtends;
  } else if (isEmptyObject(rawConfig)) {
    rawConfig.styleguide = { extends: ['recommended'], recommendedFallback: true };
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

  return resolveConfig(
    { ...rawConfig, files: files ?? rawConfig.files, region: region ?? rawConfig.region },
    configPath
  );
}

export async function loadConfig(
  options: {
    configPath?: string;
    customExtends?: string[];
    processRawConfig?: (rawConfig: RawConfig) => void | Promise<void>;
    files?: string[];
    region?: Region;
  } = {}
): Promise<Config> {
  const { configPath = findConfig(), customExtends, processRawConfig, files, region } = options;
  const rawConfig = await getConfig(configPath, processRawConfig);

  const redoclyClient = new RedoclyClient();
  const tokens = await redoclyClient.getTokens();

  return addConfigMetadata({
    rawConfig,
    customExtends,
    configPath,
    tokens,
    files,
    region,
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

export async function getConfig(
  configPath: string | undefined = findConfig(),
  processRawConfig?: (rawConfig: RawConfig) => void | Promise<void>
): Promise<RawConfig> {
  if (!configPath || !doesYamlFileExist(configPath)) return {};
  try {
    const rawConfig =
      (await loadYaml<RawConfig & DeprecatedInRawConfig & FlatRawConfig>(configPath)) || {};
    if (typeof processRawConfig === 'function') {
      await processRawConfig(rawConfig);
    }
    return transformConfig(rawConfig);
  } catch (e) {
    throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
  }
}

type CreateConfigOptions = {
  extends?: string[];
  tokens?: RegionalTokenWithValidity[];
};

export async function createConfig(
  config: string | RawConfig,
  options?: CreateConfigOptions
): Promise<Config> {
  return addConfigMetadata({
    rawConfig: transformConfig(
      typeof config === 'string' ? (parseYaml(config) as RawConfig) : config
    ),
    ...options,
  });
}
