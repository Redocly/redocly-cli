import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseYaml } from '../js-yaml/index.js';
import { ConfigValidationError, deepCloneMapWithJSON } from './utils.js';
import { resolveConfig, resolveConfigFileAndRefs } from './config-resolvers.js';
import { bundleConfig } from '../bundle.js';
import { type BaseResolver, type Document, type ResolvedRefMap } from '../resolve.js';
import { Config } from './config.js';
import { type RawUniversalConfig } from './types.js';

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
    /** Deprecated */
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

  const { rawConfig, document, resolvedRefMap } = await getConfig({
    configPath,
    externalRefResolver,
  });

  const resolvedConfig = await resolveConfig({
    rawConfig,
    customExtends,
    configPath,
    externalRefResolver,
  });

  const config = new Config(resolvedConfig, {
    configPath,
    rawConfig,
    document,
    resolvedRefMap,
  });

  // FIXME: remove processRawConfig
  if (document && rawConfig && resolvedRefMap && typeof processRawConfig === 'function') {
    try {
      await processRawConfig({
        document,
        resolvedRefMap,
        config,
        parsed: rawConfig,
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

export async function getConfig(options: {
  configPath?: string;
  externalRefResolver?: BaseResolver;
}): Promise<{
  rawConfig?: RawUniversalConfig;
  document?: Document;
  resolvedRefMap?: ResolvedRefMap;
}> {
  if (!options.configPath) return {};

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
  configPath?: string;
  externalRefResolver?: BaseResolver;
  document?: Document;
  resolvedRefMap?: ResolvedRefMap;
};

export async function createConfig(
  config?: string | RawUniversalConfig,
  { configPath, externalRefResolver, document, resolvedRefMap }: CreateConfigOptions = {}
): Promise<Config> {
  const rawConfig = typeof config === 'string' ? (parseYaml(config) as RawUniversalConfig) : config;
  const resolvedConfig = await resolveConfig({ rawConfig, configPath, externalRefResolver });
  return new Config(resolvedConfig, { configPath, rawConfig, document, resolvedRefMap });
}
