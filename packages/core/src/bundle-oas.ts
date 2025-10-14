import { BaseResolver } from './resolve.js';
import { detectSpec } from './detect-spec.js';
import { bundleDocument } from './bundle-document.js';
import { Oas2Types } from './types/oas2.js';
import { Oas3Types } from './types/oas3.js';
import { Oas3_1Types } from './types/oas3_1.js';
import { Oas3_2Types } from './types/oas3_2.js';
import { Config } from './config/config.js';

import type { NodeType } from './types/index.js';
import type { Document } from './resolve.js';
import type { CollectFn } from './utils.js';

export type CoreBundleOptions = {
  externalRefResolver?: BaseResolver;
  config: Config;
  dereference?: boolean;
  base?: string | null;
  removeUnusedComponents?: boolean;
  keepUrlRefs?: boolean;
};

export async function bundleOas(
  opts: {
    ref?: string;
    doc?: Document;
    collectSpecData?: CollectFn;
  } & CoreBundleOptions
) {
  const {
    ref,
    doc,
    externalRefResolver = new BaseResolver(opts.config.resolve),
    base = null,
  } = opts;
  if (!(ref || doc)) {
    throw new Error('Document or reference is required.\n');
  }

  const document =
    doc === undefined ? await externalRefResolver.resolveDocument(base, ref!, true) : doc;

  if (document instanceof Error) {
    throw document;
  }
  opts.collectSpecData?.(document.parsed);

  const version = detectSpec(document.parsed);

  let types: Record<string, NodeType>;
  switch (version) {
    case 'oas2':
      types = Oas2Types;
      break;
    case 'oas3_0':
      types = Oas3Types;
      break;
    case 'oas3_1':
      types = Oas3_1Types;
      break;
    case 'oas3_2':
      types = Oas3_2Types;
      break;
    default:
      throw new Error(`Unsupported OpenAPI version: ${version}`);
  }

  return bundleDocument({
    document,
    ...opts,
    externalRefResolver,
    types,
  });
}

// export { loadConfig } from './config/load.js';

export function loadConfig(options: {
  configPath?: string;
  customExtends?: string[];
  externalRefResolver?: BaseResolver;
}) {
  // const resolvedConfig = externalRefResolver.resolveDocument<RawUniversalConfig>(null, options.configPath, true)
  return new Config(
    {
      rules: {},
      preprocessors: {},
      decorators: {},
      plugins: [],
    },
    {
      configPath: options.configPath,
    }
  );
}
