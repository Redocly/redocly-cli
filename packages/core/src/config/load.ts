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
import { isAbsoluteUrl } from '../ref-utils.js';

import type { RawUniversalConfig } from './types.js';

// Check if path is a URL (http://, https://, or file://)
function isUrl(ref: string): boolean {
  return ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('file://');
}

// Get directory from path or URL
function getConfigDir(configPath: string): string {
  if (configPath.startsWith('file://')) {
    // Handle file:// URLs using URL API
    const url = new URL(configPath);
    const pathPart = url.pathname;
    // Check if it's a yaml file or directory
    if (pathPart.endsWith('.yaml') || pathPart.endsWith('.yml')) {
      url.pathname = pathPart.substring(0, pathPart.lastIndexOf('/'));
    }
    return url.href;
  } else if (isAbsoluteUrl(configPath)) {
    // Handle http/https URLs
    if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      return configPath.substring(0, configPath.lastIndexOf('/'));
    }
    return configPath;
  } else {
    // Handle file paths
    if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      return path.dirname(configPath);
    }
    return configPath;
  }
}

// Join path or URL with ignore file name
function joinIgnorePath(configDir: string, ignoreFile: string): string {
  if (isUrl(configDir)) {
    const separator = configDir.endsWith('/') ? '' : '/';
    return configDir + separator + ignoreFile;
  }
  return path.join(configDir, ignoreFile);
}

async function loadIgnoreFile(
  configPath: string | undefined,
  resolver: BaseResolver
): Promise<Record<string, Record<string, Set<string>>> | undefined> {
  console.log('[loadIgnoreFile] configPath:', configPath);
  console.log('[loadIgnoreFile] typeof configPath:', typeof configPath);

  if (!configPath) {
    console.log('[loadIgnoreFile] configPath is falsy, returning undefined');
    return undefined;
  }

  const configDir = getConfigDir(configPath);
  const ignorePath = joinIgnorePath(configDir, IGNORE_FILE);
  console.log('[loadIgnoreFile] configDir:', configDir);
  console.log('[loadIgnoreFile] ignorePath:', ignorePath);
  console.log('[loadIgnoreFile] isUrl(ignorePath):', isUrl(ignorePath));

  // For local file system (not URL), check if file exists before loading
  const hasFs = !!fs?.existsSync;
  console.log('[loadIgnoreFile] fs?.existsSync available:', hasFs);

  if (hasFs && !isUrl(ignorePath) && !fs.existsSync(ignorePath)) {
    console.log('[loadIgnoreFile] file does not exist locally, returning undefined');
    return undefined;
  }

  console.log('[loadIgnoreFile] calling resolver.resolveDocument...');
  const ignoreDocument = await resolver.resolveDocument(null, ignorePath, true);
  console.log('[loadIgnoreFile] ignoreDocument instanceof Error:', ignoreDocument instanceof Error);
  console.log(
    '[loadIgnoreFile] ignoreDocument.parsed:',
    ignoreDocument instanceof Error ? 'N/A' : !!ignoreDocument.parsed
  );

  if (ignoreDocument instanceof Error || !ignoreDocument.parsed) {
    console.log('[loadIgnoreFile] ignoreDocument is Error or no parsed, returning undefined');
    return undefined;
  }

  console.log('[loadIgnoreFile] successfully loaded ignore file');
  const ignore = (ignoreDocument.parsed || {}) as Record<string, Record<string, Set<string>>>;
  console.log('[loadIgnoreFile] ignore keys:', Object.keys(ignore));

  for (const fileName of Object.keys(ignore)) {
    let resolvedFileName: string;
    if (isUrl(fileName)) {
      resolvedFileName = fileName;
    } else if (isUrl(configDir)) {
      // For file:// or http(s):// URLs, join properly
      const separator = configDir.endsWith('/') ? '' : '/';
      resolvedFileName = configDir + separator + fileName;
    } else {
      resolvedFileName = path.resolve(configDir, fileName);
    }
    console.log('[loadIgnoreFile] resolving fileName:', fileName, '->', resolvedFileName);

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
