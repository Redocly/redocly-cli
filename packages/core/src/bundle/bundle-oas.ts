import { Config } from '../config/config.js';
import { detectSpec } from '../detect-spec.js';
// Specialized OAS only bundle export for vite bundle
import { BaseResolver } from '../resolve.js';
import { bundleDocument, type CoreBundleOptions } from './bundle-document.js';
import { Oas2Types } from '../types/oas2.js';
import { Oas3Types } from '../types/oas3.js';
import { Oas3_1Types } from '../types/oas3_1.js';
import { Oas3_2Types } from '../types/oas3_2.js';

import type { Document } from '../resolve.js';
import type { NodeType } from '../types/index.js';

export { Source, Document } from '../resolve.js';

export async function bundleOas(
  opts: {
    ref?: string;
    doc?: Document;
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

export function createEmptyRedoclyConfig(
  options: {
    configPath?: string;
    customExtends?: string[];
    externalRefResolver?: BaseResolver;
  } = {}
) {
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
