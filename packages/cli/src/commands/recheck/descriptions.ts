import {
  BaseResolver,
  detectSpec,
  getTypes,
  isPlainObject,
  normalizeTypes,
  normalizeVisitors,
  resolveDocument,
  walkDocument,
  type Config,
  type Document,
  type Oas3Visitor,
  type Source,
} from '@redocly/openapi-core';

export interface CollectedDescription {
  source: Source;
  pointer: string;
  text: string;
}

// Walks one API document, external $ref files included, and returns every
// string `description` with the file that owns it. `summary` stays out.
export async function collectDescriptions(
  apiPath: string,
  config: Config
): Promise<CollectedDescription[]> {
  const resolver = new BaseResolver(config.resolve);
  const loaded = await resolver.resolveDocument(null, apiPath, true);
  if (loaded instanceof Error) throw loaded;
  const document = loaded as Document;
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver: resolver,
  });

  const seen = new Set<string>();
  const collected: CollectedDescription[] = [];
  const visitor: Oas3Visitor = {
    any: {
      enter(node, ctx) {
        if (!isPlainObject(node) || typeof node.description !== 'string') return;
        const location = ctx.location.child('description');
        if (seen.has(location.absolutePointer)) return;
        seen.add(location.absolutePointer);
        collected.push({
          source: location.source,
          pointer: location.pointer,
          text: node.description,
        });
      },
    },
  };
  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(
      [{ ruleId: 'recheck/descriptions', severity: 'error', visitor }],
      types
    ),
    resolvedRefMap,
    ctx: { problems: [], specVersion, visitorsData: {} },
  });
  return collected;
}
