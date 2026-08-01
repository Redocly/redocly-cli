import {
  analyzeApi,
  type ApiAnalysis,
  type BaseResolver,
  type Config,
  type Document,
  type NormalizedNodeType,
  type SpecVersion,
} from '@redocly/openapi-core';

export async function buildStructureGraph(options: {
  rootDocument: Document;
  specVersion: SpecVersion;
  types: Record<string, NormalizedNodeType>;
  config: Config;
  externalRefResolver: BaseResolver;
  cwd: string;
}): Promise<{ analysis: ApiAnalysis }> {
  const { rootDocument, specVersion, types, externalRefResolver, cwd } = options;
  const analysis = await analyzeApi({
    rootDocument,
    specVersion,
    types,
    externalRefResolver,
    cwd,
    resolveRef: (base, uri) => externalRefResolver.resolveExternalRef(base, uri),
  });
  return { analysis };
}
