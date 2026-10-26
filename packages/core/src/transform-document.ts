import type { InitializedRule } from './config/rules.js';
import {
  resolveDocument,
  type BaseResolver,
  type Document,
  type ResolvedRefMap,
} from './resolve.js';
import type { NormalizedNodeType } from './types/index.js';
import { normalizeVisitors } from './visitors.js';
import { walkDocument, type WalkContext } from './walk.js';

/**
 * Walks the document with the visitors that change it, such as preprocessors or decorators, and
 * resolves its `$ref`s again, since the visitors can add or move them.
 */
export async function transformDocument(opts: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  visitors: InitializedRule[];
  resolvedRefMap: ResolvedRefMap;
  externalRefResolver: BaseResolver;
  ctx: WalkContext;
}): Promise<ResolvedRefMap> {
  const { document, types, visitors, resolvedRefMap, externalRefResolver, ctx } = opts;

  if (visitors.length === 0) return resolvedRefMap;

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(visitors, types),
    resolvedRefMap,
    ctx,
  });

  return resolveDocument({ rootDocument: document, rootType: types.Root, externalRefResolver });
}
