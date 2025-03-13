import * as fs from 'fs';
import * as path from 'path';
import { isEmptyObject } from '../utils';
import { parseYaml } from '../js-yaml';
import { ConfigValidationError, transformConfig, deepCloneMapWithJSON } from './utils';
import { resolveConfig, resolveConfigFileAndRefs } from './config-resolvers';
import { bundleConfig } from '../bundle';
import { BaseResolver } from '../resolve';

import type { Config } from './config';
import type { Document, ResolvedRefMap } from '../resolve';
import type { RawConfig, RawUniversalConfig } from './types';

async function addConfigMetadata({
  rawConfig,
  customExtends,
  configPath,
  externalRefResolver,
}: {
  rawConfig: RawConfig;
  customExtends?: string[];
  configPath?: string;
  externalRefResolver?: BaseResolver;
}): Promise<Config> {
  if (customExtends !== undefined) {
    rawConfig.styleguide = rawConfig.styleguide || {};
    rawConfig.styleguide.extends = customExtends;
  } else if (isEmptyObject(rawConfig)) {
    rawConfig.styleguide = { extends: ['recommended'], recommendedFallback: true };
  }

  return resolveConfig({
    rawConfig,
    configPath,
    externalRefResolver,
  });
}

export type RawConfigProcessor = (params: {
  document: Document;
  resolvedRefMap: ResolvedRefMap;
  config: Config;
  parsed: Document['parsed'];
}) => void | Promise<void>;

export async function loadConfig(
  options: {
    configPath?: string;
    customExtends?: string[];
    processRawConfig?: RawConfigProcessor;
    externalRefResolver?: BaseResolver;
  } = {}
): Promise<Config> {
  const {
    configPath = findConfig(),
    customExtends,
    processRawConfig,
    externalRefResolver,
  } = options;

  const { rawConfig, document, parsed, resolvedRefMap } = await getConfig({
    configPath,
    externalRefResolver,
  });

  const config = await addConfigMetadata({
    rawConfig,
    customExtends,
    configPath,
    externalRefResolver,
  });

  if (document && parsed && resolvedRefMap && typeof processRawConfig === 'function') {
    try {
      await processRawConfig({
        document,
        resolvedRefMap,
        config,
        parsed,
      });
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        throw e;
      }
      throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
    }
  }

  return config;
}

export const CONFIG_FILE_NAMES = ['redocly.yaml', 'redocly.yml', '.redocly.yaml', '.redocly.yml'];

export function findConfig(dir?: string): string | undefined {
  if (!fs?.hasOwnProperty?.('existsSync')) return;
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
    externalRefResolver?: BaseResolver;
  } = {}
): Promise<{
  rawConfig: RawConfig;
  document?: Document;
  parsed?: Document['parsed'];
  resolvedRefMap?: ResolvedRefMap;
}> {
  const { configPath = findConfig(), externalRefResolver = new BaseResolver() } = options;
  if (!configPath) return { rawConfig: {} };

  try {
    const { document, resolvedRefMap } = await resolveConfigFileAndRefs({
      configPath,
      externalRefResolver,
    });

    const bundledRefMap = deepCloneMapWithJSON(resolvedRefMap);
    const parsed = await bundleConfig(JSON.parse(JSON.stringify(document)), bundledRefMap);

    return {
      rawConfig: transformConfig(parsed),
      document,
      parsed,
      resolvedRefMap,
    };
  } catch (e) {
    throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
  }
}

type CreateConfigOptions = {
  extends?: string[];
  configPath?: string;
  externalRefResolver?: BaseResolver;
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
