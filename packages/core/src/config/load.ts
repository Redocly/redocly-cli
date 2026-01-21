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
import { isAbsoluteUrl, getDir, resolvePath } from '../ref-utils.js';
import { isBrowser } from '../env.js';

import type { RawUniversalConfig } from './types.js';

export async function loadIgnoreFile(
  configPath: string | undefined,
  resolver: BaseResolver
): Promise<{ content: Record<string, Record<string, string[]>>; dir: string } | undefined> {
  const configDir = configPath ? getDir(configPath) : isBrowser ? '' : process.cwd();
  const ignorePath = configDir ? resolvePath(configDir, IGNORE_FILE) : IGNORE_FILE;
  if (fs?.existsSync && !isAbsoluteUrl(ignorePath) && !fs.existsSync(ignorePath)) {
    return undefined;
  }

  const ignoreDocument = await resolver.resolveDocument(null, ignorePath, true);

  if (ignoreDocument instanceof Error || !ignoreDocument.parsed) {
    return undefined;
  }
  console.log('###resolvedIgnoreDir', {
    configDir,
    getDir: getDir(ignoreDocument.source.absoluteRef),
  });
  const resolvedIgnoreDir = configDir || getDir(ignoreDocument.source.absoluteRef);

  return {
    content: (ignoreDocument.parsed || {}) as Record<string, Record<string, string[]>>,
    dir: resolvedIgnoreDir,
  };
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

  const ignoreFile = await loadIgnoreFile(configPath, resolver);

  const config = new Config(resolvedConfig, {
    configPath,
    document: rawConfigDocument,
    resolvedRefMap: resolvedRefMap,
    plugins,
    ignoreFile,
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
  ignoreFile?: { content: Record<string, Record<string, string[]>>; dir: string };
};

export async function createConfig(
  config?: string | RawUniversalConfig,
  { configPath, externalRefResolver, ignoreFile }: CreateConfigOptions = {}
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

  return new Config(resolvedConfig, {
    configPath,
    document: rawConfigDocument,
    resolvedRefMap,
    plugins,
    ignoreFile,
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
