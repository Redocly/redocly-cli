import * as fs from 'fs';
import * as path from 'path';
import { RedoclyClient } from '../redocly';
import { isEmptyObject, doesYamlFileExist } from '../utils';
import { parseYaml } from '../js-yaml';
import { Config, DOMAINS } from './config';
import { ConfigValidationError, transformConfig } from './utils';
import { resolveConfig, resolveConfigFileAndRefs } from './config-resolvers';
import { bundleConfig } from '../bundle';

import type { Document } from '../resolve';
import type { RegionalTokenWithValidity } from '../redocly/redocly-client-types';
import type { RawConfig, RawUniversalConfig, Region } from './types';
import type { BaseResolver, ResolvedRefMap } from '../resolve';

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

export type RawConfigProcessor = (
  rawConfig: Document,
  resolvedRefMap: ResolvedRefMap
) => void | Promise<void>;

export async function loadConfig(
  options: {
    configPath?: string;
    customExtends?: string[];
    processRawConfig?: RawConfigProcessor;
    externalRefResolver?: BaseResolver;
    files?: string[];
    region?: Region;
  } = {}
): Promise<Config> {
  const {
    configPath = findConfig(),
    customExtends,
    processRawConfig,
    files,
    region,
    externalRefResolver,
  } = options;
  const rawConfig = await getConfig({ configPath, processRawConfig, externalRefResolver });

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
  options: {
    configPath?: string;
    processRawConfig?: RawConfigProcessor;
    externalRefResolver?: BaseResolver;
  } = {}
): Promise<RawConfig> {
  const { configPath = findConfig(), processRawConfig, externalRefResolver } = options;
  if (!configPath || !doesYamlFileExist(configPath)) return {};
  try {
    const { document, resolvedRefMap } = await resolveConfigFileAndRefs({
      configPath,
      externalRefResolver,
    });
    if (typeof processRawConfig === 'function') {
      await processRawConfig(document, resolvedRefMap);
    }
    const bundledConfig = await bundleConfig(document, resolvedRefMap);
    return transformConfig(bundledConfig);
  } catch (e) {
    if (e instanceof ConfigValidationError) {
      throw e;
    }
    throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
  }
}

type CreateConfigOptions = {
  extends?: string[];
  tokens?: RegionalTokenWithValidity[];
  configPath?: string;
};

export async function createConfig(
  config: string | RawUniversalConfig,
  options?: CreateConfigOptions
): Promise<Config> {
  return addConfigMetadata({
    rawConfig: transformConfig(
      typeof config === 'string' ? (parseYaml(config) as RawConfig) : config
    ),
    ...options,
  });
}
