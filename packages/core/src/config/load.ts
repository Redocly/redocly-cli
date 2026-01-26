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

import type { RawUniversalConfig, IgnoreConfig } from './types.js';

type IgnoreFileContent = Record<string, Record<string, string[]>>;

function resolveIgnore(content: IgnoreFileContent, dir: string): IgnoreConfig {
  const ignore: IgnoreConfig = Object.create(null);

  for (const fileName of Object.keys(content)) {
    const fileIgnore = content[fileName];

    const resolvedFileName = isAbsoluteUrl(fileName) ? fileName : resolvePath(dir, fileName);

    ignore[resolvedFileName] = Object.create(null);

    for (const ruleId of Object.keys(fileIgnore)) {
      ignore[resolvedFileName][ruleId] = new Set(fileIgnore[ruleId]);
    }
  }

  return ignore;
}

export async function loadIgnoreConfig(
  configPath: string | undefined,
  resolver: BaseResolver
): Promise<IgnoreConfig | undefined> {
  const configDir = configPath ? getDir(configPath) : isBrowser ? '' : process.cwd();
  const ignorePath = configDir ? resolvePath(configDir, IGNORE_FILE) : IGNORE_FILE;

  if (fs?.existsSync && !isAbsoluteUrl(ignorePath) && !fs.existsSync(ignorePath)) {
    return undefined;
  }

  const ignoreDocument = await resolver.resolveDocument<IgnoreFileContent>(null, ignorePath, true);

  if (ignoreDocument instanceof Error || !ignoreDocument.parsed) {
    return undefined;
  }

  return resolveIgnore(ignoreDocument.parsed || {}, configDir);
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

  const ignore = await loadIgnoreConfig(configPath, resolver);

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
  ignore?: IgnoreConfig;
};

export async function createConfig(
  config?: string | RawUniversalConfig,
  { configPath, externalRefResolver, ignore }: CreateConfigOptions = {}
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
