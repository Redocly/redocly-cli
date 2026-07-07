import type { Config } from '../config/index.js';
import { detectSpec } from '../detect-spec.js';
import { getTypes } from '../oas-types.js';
import { BaseResolver, resolveDocument, type Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import {
  normalizeVisitors,
  type Async2Visitor,
  type Async3Visitor,
  type NestedVisitObject,
  type Oas2Visitor,
  type Oas3Visitor,
} from '../visitors.js';
import { walkDocument, type WalkContext } from '../walk.js';
import { ApiMapAsync2, ApiMapAsync3 } from './async.js';
import { ApiMapOAS2, ApiMapOAS3 } from './oas.js';
import type { ApiMapNode } from './types.js';

export async function buildApiMap({
  document,
  config,
  externalRefResolver = new BaseResolver(config.resolve),
  sourceLocations = false,
}: {
  document: Document;
  config: Config;
  externalRefResolver?: BaseResolver;
  sourceLocations?: boolean;
}): Promise<ApiMapNode> {
  const specVersion = detectSpec(document.parsed);
  const root: ApiMapNode = {
    title: 'API',
    kind: 'Root',
    pointer: '#/',
    ...(sourceLocations && { source: { file: document.source.absoluteRef, pointer: '#/' } }),
    nodes: [],
  };

  let visitor: NestedVisitObject<
    unknown,
    Oas3Visitor | Oas2Visitor | Async2Visitor | Async3Visitor
  >;
  switch (specVersion) {
    case 'oas2':
      visitor = ApiMapOAS2(root, { sourceLocations });
      break;
    case 'oas3_0':
    case 'oas3_1':
    case 'oas3_2':
      visitor = ApiMapOAS3(root, { sourceLocations });
      break;
    case 'async2':
      visitor = ApiMapAsync2(root, { sourceLocations });
      break;
    case 'async3':
      visitor = ApiMapAsync3(root, { sourceLocations });
      break;
    default:
      throw new Error(`Unsupported spec version for API map generation: ${specVersion}`);
  }

  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(
      [{ severity: 'warn', ruleId: 'api-map', visitor }],
      types
    ),
    resolvedRefMap,
    ctx,
  });

  return root;
}
