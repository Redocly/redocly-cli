import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import {
  BaseResolver,
  makeDocumentFromString,
  resolveDocument,
  type Document,
} from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import type { WalkContext } from '../../walk.js';
import { buildNodeTree } from '../index.js';
import type { NodeEntry } from '../types.js';

export const cafe = (description: string) =>
  makeDocumentFromString(
    `openapi: 3.1.0\ninfo: { title: Cafe, version: 1.0.0 }\n${description}`,
    'cafe.yaml'
  );

export async function buildTree(document: Document, externalRefResolver = new BaseResolver()) {
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(getTypes(specVersion));
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });
  const ctx: WalkContext = { problems: [], specVersion, visitorsData: {} };
  const root = buildNodeTree({ document, types, resolvedRefMap, ctx });
  return { root, problems: ctx.problems };
}

export function nodeAt(node: NodeEntry, pointer: string): NodeEntry | undefined {
  if (node.location.pointer === pointer) return node;
  for (const child of node.children) {
    const found = nodeAt(child, pointer);
    if (found) return found;
  }
  return undefined;
}
