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

import type { RawUniversalConfig } from './types.js';

function isUrl(ref: string): boolean {
  return ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('file://');
}

function getConfigDir(configPath: string): string {
  // If no extension, treat as directory
  if (!path.extname(configPath)) {
    return configPath;
  }
  // Get parent directory for config file
  return isUrl(configPath)
    ? configPath.substring(0, configPath.lastIndexOf('/'))
    : path.dirname(configPath);
}

async function loadIgnoreFile(
  configPath: string | undefined,
  resolver: BaseResolver
): Promise<Record<string, Record<string, Set<string>>> | undefined> {
  console.log('#### loadIgnoreFile configPath:', configPath);
  if (!configPath) return undefined;

  const configDir = getConfigDir(configPath);
  const ignorePath = isUrl(configDir)
    ? configDir + '/' + IGNORE_FILE
    : path.join(configDir, IGNORE_FILE);

  console.log('#### loadIgnoreFile configDir:', configDir);
  console.log('#### loadIgnoreFile ignorePath:', ignorePath);
  console.log('#### loadIgnoreFile isUrl(ignorePath):', isUrl(ignorePath));
  console.log('#### loadIgnoreFile fs?.existsSync:', !!fs?.existsSync);

  // For local file system (not URL), check if file exists before loading
  if (fs?.existsSync && !isUrl(ignorePath) && !fs.existsSync(ignorePath)) {
    console.log('#### loadIgnoreFile: file does not exist, returning undefined');
    return undefined;
  }

  console.log('#### loadIgnoreFile: calling resolver.resolveDocument');
  const ignoreDocument = await resolver.resolveDocument(null, ignorePath, true);
  console.log(
    '#### loadIgnoreFile ignoreDocument:',
    ignoreDocument instanceof Error ? 'Error' : !!ignoreDocument?.parsed
  );

  if (ignoreDocument instanceof Error || !ignoreDocument.parsed) {
    console.log('#### loadIgnoreFile: no parsed document, returning undefined');
    return undefined;
  }

  const ignore = (ignoreDocument.parsed || {}) as Record<string, Record<string, Set<string>>>;

  for (const fileName of Object.keys(ignore)) {
    const resolvedFileName = isUrl(fileName)
      ? fileName
      : isUrl(configDir)
      ? configDir + '/' + fileName
      : path.resolve(configDir, fileName);

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
