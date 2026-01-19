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
import { isAbsoluteUrlOrFileUrl, getDir, resolvePath } from '../ref-utils.js';
import { isBrowser } from '../env.js';

import type { RawUniversalConfig } from './types.js';

export async function loadIgnoreFile(
  configPath: string | undefined,
  resolver: BaseResolver
): Promise<{ content: Record<string, Record<string, string[]>>; path: string } | undefined> {
  console.log('[loadIgnoreFile] start', { configPath, isBrowser });
  const configDir = configPath ? getDir(configPath) : isBrowser ? '' : process.cwd();
  console.log('[loadIgnoreFile] configDir:', configDir);
  const ignorePath = configDir ? resolvePath(configDir, IGNORE_FILE) : IGNORE_FILE;
  console.log('[loadIgnoreFile] ignorePath:', ignorePath);

  if (fs?.existsSync && !isAbsoluteUrlOrFileUrl(ignorePath) && !fs.existsSync(ignorePath)) {
    console.log('[loadIgnoreFile] ignore file does not exist, returning undefined');
    return undefined;
  }

  console.log('[loadIgnoreFile] resolving ignore document...');
  const ignoreDocument = await resolver.resolveDocument(null, ignorePath, true);

  if (ignoreDocument instanceof Error || !ignoreDocument.parsed) {
    console.log('[loadIgnoreFile] ignore document is error or not parsed:', {
      isError: ignoreDocument instanceof Error,
      hasParsed: !!(ignoreDocument instanceof Error ? false : ignoreDocument.parsed),
    });
    return undefined;
  }

  const resolvedIgnorePath =
    configDir ||
    (ignoreDocument.source?.absoluteRef ? getDir(ignoreDocument.source.absoluteRef) : '');
  console.log('[loadIgnoreFile] resolvedIgnorePath:', resolvedIgnorePath);
  console.log('[loadIgnoreFile] ignore content:', ignoreDocument.parsed);

  return {
    content: (ignoreDocument.parsed || {}) as Record<string, Record<string, string[]>>,
    path: resolvedIgnorePath,
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

  const ignoreResult = await loadIgnoreFile(configPath, resolver);

  console.log('[loadConfig] load Config with', {
    ignoreResult,
  });

  const config = new Config(resolvedConfig, {
    configPath,
    document: rawConfigDocument,
    resolvedRefMap: resolvedRefMap,
    plugins,
    rawIgnore: ignoreResult?.content,
    ignorePath: ignoreResult?.path,
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
  rawIgnore?: Record<string, Record<string, string[]>>;
  ignorePath?: string;
};

export async function createConfig(
  config?: string | RawUniversalConfig,
  { configPath, externalRefResolver, rawIgnore, ignorePath }: CreateConfigOptions = {}
): Promise<Config> {
  console.log('[createConfig] start', {
    hasConfig: !!config,
    configType: typeof config,
    configPath,
    hasRawIgnore: !!rawIgnore,
    ignorePath,
    rawIgnore,
  });

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

  console.log('[createConfig] creating Config with', {
    hasRawIgnore: !!rawIgnore,
    ignorePath,
    rawIgnoreKeys: rawIgnore ? Object.keys(rawIgnore) : [],
  });

  return new Config(resolvedConfig, {
    configPath,
    document: rawConfigDocument,
    resolvedRefMap,
    plugins,
    rawIgnore,
    ignorePath,
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
