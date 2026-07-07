import {
  isPlainObject,
  isRef,
  normalizeVisitors,
  walkDocument,
  type Config,
  type Document,
  type NormalizedNodeType,
  type SpecVersion,
  type UserContext,
  type WalkContext,
} from '@redocly/openapi-core';

import { getIdentityKey } from './node-identity.js';
import { isScalar, isScalarArray } from './predicates.js';
import type { NodeEntry } from './types.js';

export interface CollectedDocument {
  entries: Map<string, NodeEntry>;
  usageEdges: Array<{ site: string; target: string }>;
}

export function collectDocumentMap(opts: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  specVersion: SpecVersion;
  config: Config;
}): CollectedDocument {
  const { document, types, specVersion, config } = opts;
  const entries = new Map<string, NodeEntry>();
  const usageEdges: Array<{ site: string; target: string }> = [];
  // realPointer → stablePointer, filled top-down (walk is pre-order)
  const stableByReal = new Map<string, string>();
  const collisionCounts = new Map<string, number>();

  const visitor = {
    any: {
      enter(node: unknown, ctx: UserContext) {
        if (!isPlainObject(node) && !Array.isArray(node)) return;

        const realPointer = ctx.location.pointer;
        const { parentReal, segment } = splitPointer(realPointer);
        const stableParent =
          parentReal === null ? null : (stableByReal.get(parentReal) ?? parentReal);

        let stableSegment = segment;
        if (Array.isArray(ctx.parent)) {
          const identity = getIdentityKey(ctx.type.name, node);
          if (identity !== undefined) stableSegment = identity;
        }

        let pointer =
          stableParent === null
            ? realPointer
            : stableParent === '#/'
              ? `#/${stableSegment}`
              : `${stableParent}/${stableSegment}`;

        if (entries.has(pointer)) {
          const next = (collisionCounts.get(pointer) ?? 1) + 1;
          collisionCounts.set(pointer, next);
          pointer = `${pointer}#${next}`;
        }
        stableByReal.set(realPointer, pointer);

        const scalars: Record<string, unknown> = {};
        const refs: Record<string, string> = {};
        if (isPlainObject(node)) {
          for (const [prop, value] of Object.entries(node)) {
            if (isRef(value)) {
              refs[prop] = value.$ref;
              usageEdges.push({ site: `${pointer}/${prop}`, target: value.$ref });
            } else if (isScalar(value) || isScalarArray(value)) {
              scalars[prop] = value;
            }
          }
        }

        entries.set(pointer, {
          pointer,
          realPointer,
          parentPointer: stableParent,
          typeName: ctx.type.name,
          scalars,
          refs,
          raw: node,
        });
      },
    },
  };

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'diff-collect', visitor }],
    types
  );
  const ctx: WalkContext = { problems: [], specVersion, config, visitorsData: {} };

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors,
    // Empty map: $ref nodes fail to resolve and are NOT traversed —
    // refs are recorded as node attributes above ($ref-as-scalar, spec §5.3).
    resolvedRefMap: new Map(),
    ctx,
  });

  return { entries, usageEdges };
}

function splitPointer(pointer: string): { parentReal: string | null; segment: string } {
  if (pointer === '#/' || pointer === '#') {
    return { parentReal: null, segment: pointer };
  }
  const idx = pointer.lastIndexOf('/');
  const parentReal = idx <= 1 ? '#/' : pointer.slice(0, idx);
  return { parentReal, segment: pointer.slice(idx + 1) };
}
