import * as fs from 'node:fs';
import * as path from 'node:path';
import { isEmptyObject } from '../utils.js';
import { parseYaml } from '../js-yaml/index.js';
import { ConfigValidationError, deepCloneMapWithJSON } from './utils.js';
import { resolveConfig, resolveConfigFileAndRefs } from './config-resolvers.js';
import { bundleConfig } from '../bundle.js';
import { type BaseResolver, type Document, type ResolvedRefMap } from '../resolve.js';
import { Config } from './config.js';
import { type RawUniversalConfig, type ResolvedConfig } from './types.js';

// FIXME: Remove. Leave only resolveConfig?
async function addConfigMetadata({
  rawConfig,
  customExtends,
  configPath,
  externalRefResolver,
}: {
  rawConfig: RawUniversalConfig;
  customExtends?: string[];
  configPath?: string;
  externalRefResolver?: BaseResolver;
}): Promise<ResolvedConfig> {
  if (customExtends !== undefined) {
    rawConfig.extends = customExtends;
  } else if (!rawConfig || isEmptyObject(rawConfig)) {
    rawConfig = { ...rawConfig, extends: ['recommended'], recommendedFallback: true }; // FIXME: remove recommendedFallback?
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
    configPath = findConfig(), // FIXME: duplication?
    customExtends,
    processRawConfig,
    externalRefResolver,
  } = options;

  const { rawConfig, document, resolvedRefMap } = await getConfig({
    configPath,
    externalRefResolver,
  });

  // FIXME: move inside Config?
  const config = await addConfigMetadata({
    rawConfig,
    customExtends,
    configPath,
    externalRefResolver,
  });

  // FIXME: remove processRawConfig
  if (document && rawConfig && resolvedRefMap && typeof processRawConfig === 'function') {
    try {
      await processRawConfig({
        document,
        resolvedRefMap,
        config: new Config(config, configPath),
        parsed: rawConfig,
      });
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        throw e;
      }
      throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
    }
  }

  return new Config(config, configPath);
}

export const CONFIG_FILE_NAMES = ['redocly.yaml', 'redocly.yml', '.redocly.yaml', '.redocly.yml'];

export function findConfig(dir?: string): string | undefined {
  if (!fs?.existsSync) return;
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

// FIXME: rename to loadRawConfig , resolveRefsAndBundleConfig?
export async function getConfig(options: {
  configPath?: string;
  externalRefResolver?: BaseResolver;
}): Promise<{
  rawConfig: RawUniversalConfig;
  document?: Document;
  resolvedRefMap?: ResolvedRefMap;
}> {
  if (!options.configPath) return { rawConfig: {} };

  try {
    const { document, resolvedRefMap } = await resolveConfigFileAndRefs(options);

    const bundledRefMap = deepCloneMapWithJSON(resolvedRefMap);
    const rawConfig = (await bundleConfig(
      JSON.parse(JSON.stringify(document)),
      bundledRefMap
    )) as RawUniversalConfig;

    return {
      rawConfig,
      document,
      resolvedRefMap,
    };
  } catch (e) {
    throw new Error(`Error parsing config file at '${options.configPath}': ${e.message}`);
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
  const resolvedConfig = await addConfigMetadata({
    rawConfig: typeof config === 'string' ? (parseYaml(config) as RawUniversalConfig) : config,
    ...options,
  });
  return new Config(resolvedConfig, options?.configPath);
}
