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
import { CONFIG_FILE_NAME, IGNORE_FILE } from './constants.js';
import { isAbsoluteUrlOrFileUrl, getDir } from '../ref-utils.js';

import type { RawUniversalConfig } from './types.js';

function resolvePath(base: string, relative: string): string {
  if (isAbsoluteUrlOrFileUrl(base)) {
    return new URL(relative, base.endsWith('/') ? base : `${base}/`).href;
  }
  return path.resolve(base, relative);
}

async function loadIgnoreFile(
  configPath: string | undefined,
  resolver: BaseResolver
): Promise<Record<string, Record<string, Set<string>>> | undefined> {
  if (!configPath) return undefined;

  const configDir = getDir(configPath);
  const ignorePath = resolvePath(configDir, IGNORE_FILE);

  if (fs?.existsSync && !isAbsoluteUrlOrFileUrl(ignorePath) && !fs.existsSync(ignorePath)) {
    return undefined;
  }

  const ignoreDocument = await resolver.resolveDocument(null, ignorePath, true);

  if (ignoreDocument instanceof Error || !ignoreDocument.parsed) {
    return undefined;
  }

  const ignore = (ignoreDocument.parsed || {}) as Record<string, Record<string, Set<string>>>;

  for (const fileName of Object.keys(ignore)) {
    const resolvedFileName = isAbsoluteUrlOrFileUrl(fileName)
      ? fileName
      : resolvePath(configDir, fileName);

    ignore[resolvedFileName] = ignore[fileName];

    for (const ruleId of Object.keys(ignore[fileName])) {
      ignore[fileName][ruleId] = new Set(ignore[fileName][ruleId]);
    }

    if (resolvedFileName !== fileName) {
      delete ignore[fileName];
    }
  }

  return ignore;
}

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

  const { resolvedConfig, resolvedRefMap, plugins } = await resolveConfig({
    rawConfigDocument: rawConfigDocument ? cloneConfigDocument(rawConfigDocument) : undefined,
    customExtends,
    configPath,
    externalRefResolver,
  });

  const ignore = await loadIgnoreFile(configPath, resolver);

  const config = new Config(resolvedConfig, {
    configPath,
    document: rawConfigDocument,
    resolvedRefMap: resolvedRefMap,
    plugins,
    ignore,
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

  const { resolvedConfig, resolvedRefMap, plugins } = await resolveConfig({
    rawConfigDocument: cloneConfigDocument(rawConfigDocument),
    configPath,
    externalRefResolver,
  });

  const resolver = externalRefResolver ?? new BaseResolver();
  const ignore = await loadIgnoreFile(configPath, resolver);

  return new Config(resolvedConfig, {
    configPath,
    document: rawConfigDocument,
    resolvedRefMap,
    plugins,
    ignore,
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
