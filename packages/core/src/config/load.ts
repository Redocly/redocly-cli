import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveConfig } from './config-resolvers.js';
import { Config } from './config.js';
import {
  BaseResolver,
  makeDocumentFromString,
  type Document,
  type ResolvedRefMap,
} from '../resolve.js';
import { CONFIG_FILE_NAME } from './constants.js';

import type { RawUniversalConfig } from './types.js';

export async function loadConfig(
  options: {
    configPath?: string;
    customExtends?: string[];
    externalRefResolver?: BaseResolver;
  } = {}
): Promise<Config> {
  const { configPath = findConfig(), customExtends, externalRefResolver } = options;

  const resolver = externalRefResolver ?? new BaseResolver();

  const rawConfigDocument = configPath
    ? await resolver.resolveDocument<RawUniversalConfig>(null, configPath, true)
    : undefined;

  if (rawConfigDocument instanceof Error) {
    throw rawConfigDocument;
  }

  const { resolvedConfig, resolvedRefMap, plugins, configProblems } = await resolveConfig({
    rawConfigDocument: rawConfigDocument ? cloneConfigDocument(rawConfigDocument) : undefined,
    customExtends,
    configPath,
    externalRefResolver,
  });

  const config = new Config(resolvedConfig, {
    configPath,
    document: rawConfigDocument,
    resolvedRefMap: resolvedRefMap,
    plugins,
    configProblems,
  });

  return config;
}

export function findConfig(dir?: string): string | undefined {
  if (!fs?.existsSync) return;
  const configPath = dir ? path.resolve(dir, CONFIG_FILE_NAME) : CONFIG_FILE_NAME;
  return fs.existsSync(configPath) ? configPath : undefined;
}

type CreateConfigOptions = {
  configPath?: string;
  externalRefResolver?: BaseResolver;
  resolvedRefMap?: ResolvedRefMap;
};

export async function createConfig(
  config?: string | RawUniversalConfig,
  { configPath, externalRefResolver }: CreateConfigOptions = {}
): Promise<Config> {
  const rawConfigSource = typeof config === 'string' ? config : '';
  const rawConfigDocument = makeDocumentFromString<RawUniversalConfig>(
    rawConfigSource,
    configPath ?? ''
  );

  if (typeof config !== 'string' && config) {
    rawConfigDocument.parsed = config;
  }

  const { resolvedConfig, resolvedRefMap, plugins, configProblems } = await resolveConfig({
    rawConfigDocument: cloneConfigDocument(rawConfigDocument),
    configPath,
    externalRefResolver,
  });
  return new Config(resolvedConfig, {
    configPath,
    document: rawConfigDocument,
    resolvedRefMap,
    plugins,
    configProblems,
  });
}

function cloneConfigDocument(document: Document<RawUniversalConfig>) {
  if (!document.parsed) {
    return document;
  }
  const { plugins, resolve, ...rest } = document.parsed;
  const cloned = {
    ...structuredClone(rest),
    plugins: plugins?.slice(),
    ...(resolve && { resolve: { ...resolve } }),
  };
  return {
    ...document,
    parsed: cloned,
  };
}
