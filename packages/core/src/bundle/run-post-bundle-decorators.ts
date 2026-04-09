import { resolveDocument, type Document, type BaseResolver } from '../resolve.js';
import { type NormalizedNodeType } from '../types/index.js';
import { normalizeVisitors } from '../visitors.js';
import { walkDocument, type WalkContext, type ProblemSeverity } from '../walk.js';

export async function runPostBundleDecorators(opts: {
  document: Document;
  normalizedTypes: Record<string, NormalizedNodeType>;
  postBundleDecorators: { severity: ProblemSeverity; ruleId: string; visitor: any }[];
  externalRefResolver: BaseResolver;
  ctx: WalkContext;
}): Promise<void> {
  const { document, normalizedTypes, postBundleDecorators, externalRefResolver, ctx } = opts;

  if (postBundleDecorators.length === 0) return;

  const postBundleRefMap = await resolveDocument({
    rootDocument: document,
    rootType: normalizedTypes.Root,
    externalRefResolver,
  });
  const postBundleVisitors = normalizeVisitors(postBundleDecorators, normalizedTypes);

  walkDocument({
    document,
    rootType: normalizedTypes.Root,
    normalizedVisitors: postBundleVisitors,
    resolvedRefMap: postBundleRefMap,
    ctx,
  });
}
