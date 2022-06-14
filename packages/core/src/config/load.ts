import * as fs from 'fs';
import * as path from 'path';
import { RedoclyClient } from '../redocly';
import { isEmptyObject, loadYaml } from '../utils';
import { Config, DOMAINS } from './config';
import { transformConfig } from './utils';
import { resolveConfig } from './config-resolvers';

import type { RawConfig, Region } from './types';

async function addConfigMetadata({
  rawConfig,
  customExtends,
  configPath
}: {
  rawConfig: RawConfig;
  customExtends?: string[];
  configPath?: string;
  
}): Promise<Config> {
  if (customExtends !== undefined) {
    rawConfig.lint = rawConfig.lint || {};
    rawConfig.lint.extends = customExtends;
  } else if (isEmptyObject(rawConfig)) {
    // TODO: check if we can add recommended here. add message here?
    // rawConfig.lint = { extends: ['recommended'], recommendedFallback: true };
  }

  const redoclyClient = new RedoclyClient();
  const tokens = await redoclyClient.getTokens();

  if (tokens.length) {
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
          : []),
      );
    }
  }

  return resolveConfig(rawConfig, configPath);
}

export async function loadConfig(
  configPath: string | undefined = findConfig(),
  customExtends?: string[],
  processRawConfig?: (rawConfig: RawConfig) => void | Promise<void>,
): Promise<Config> {
  const rawConfig = await getConfig(configPath);

  if (typeof processRawConfig === 'function') {
    await processRawConfig(rawConfig);
  }

  return await addConfigMetadata({
    rawConfig,
    customExtends,
    configPath,
  });
};

export const CONFIG_FILE_NAMES = ['redocly.yaml', 'redocly.yml', '.redocly.yaml', '.redocly.yml'];

export function findConfig(dir?: string): string | undefined {
  if (!fs.hasOwnProperty('existsSync')) return;
  const existingConfigFiles = CONFIG_FILE_NAMES.map((name) =>
    dir ? path.resolve(dir, name) : name,
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

export async function getConfig(configPath: string | undefined = findConfig()) {
  if (!configPath) return {};
  try {
    const rawConfig = ((await loadYaml(configPath)) || {}) as RawConfig;
    return transformConfig(rawConfig);
  } catch (e) {
    throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
  }
}
