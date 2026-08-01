import {
  buildApiGraph,
  type BaseResolver,
  type Config,
  type Document,
  type NormalizedNodeType,
  type SpecVersion,
} from '@redocly/openapi-core';

import type { DependencyGraph } from './types.js';

export async function buildStructureGraph(options: {
  rootDocument: Document;
  specVersion: SpecVersion;
  types: Record<string, NormalizedNodeType>;
  config: Config;
  externalRefResolver: BaseResolver;
  cwd: string;
}): Promise<{ graph: DependencyGraph }> {
  const { rootDocument, specVersion, types, externalRefResolver, cwd } = options;
  const graph = await buildApiGraph({
    rootDocument,
    specVersion,
    types,
    externalRefResolver,
    cwd,
    resolveRef: (base, uri) => externalRefResolver.resolveExternalRef(base, uri),
  });
  return { graph };
}
