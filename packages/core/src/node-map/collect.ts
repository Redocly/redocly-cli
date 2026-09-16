import type { SpecVersion } from '../oas-types.js';
import { isRef } from '../ref-utils.js';
import type { Document } from '../resolve.js';
import type { NormalizedNodeType } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isScalar, isScalarArray } from '../utils/is-scalar.js';
import { normalizeVisitors } from '../visitors.js';
import { walkDocument, type UserContext, type WalkContext } from '../walk.js';
import { ancestorChain } from './chain.js';
import type { IdentityFn, NodeEntry, NodeMap, UsageEdge } from './types.js';

export function collectNodeMap(opts: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  specVersion: SpecVersion;
  identityOf: IdentityFn;
}): NodeMap {
  const { document, types, specVersion, identityOf } = opts;
  const entries = new Map<string, NodeEntry>();
  const usageEdges: UsageEdge[] = [];
  // real pointer → key, filled top-down (the walk is pre-order)
  const keyByPointer = new Map<string, string>();
  const collisionCounts = new Map<string, number>();

  const visitor = {
    any: {
      enter(node: unknown, ctx: UserContext) {
        if (!isPlainObject(node) && !Array.isArray(node)) return;

        const { parentPointer, segment } = splitPointer(ctx.location.pointer);
        const parentKey =
          parentPointer === null ? null : (keyByPointer.get(parentPointer) ?? parentPointer);
        const ancestors =
          parentKey === null ? [] : ancestorChain(parentKey, (key) => entries.get(key));
        const identity = isPlainObject(node)
          ? identityOf(node, {
              typeName: ctx.type.name,
              key: ctx.key,
              parent: ctx.parent,
              ancestors,
            })
          : undefined;

        // The root's own key already ends in a slash, so a child of the root
        // must not add a second one.
        const prefix = parentKey === '#/' ? '#' : parentKey;
        let key = prefix === null ? segment : `${prefix}/${identity?.segment ?? segment}`;
        if (entries.has(key)) {
          const occurrence = (collisionCounts.get(key) ?? 1) + 1;
          collisionCounts.set(key, occurrence);
          key = `${key}#${occurrence}`;
        }
        keyByPointer.set(ctx.location.pointer, key);

        const properties: Record<string, unknown> = {};
        if (isPlainObject(node)) {
          for (const [name, value] of Object.entries(node)) {
            if (isRef(value)) {
              // The site is the node holding the reference: a `$ref` is not a node of its own.
              usageEdges.push({ site: key, target: value.$ref });
            }
            if (isRef(value) || isScalar(value) || isScalarArray(value)) {
              properties[name] = value;
            }
          }
        }

        entries.set(key, {
          key,
          parentKey,
          location: ctx.location,
          typeName: ctx.type.name,
          properties: { ...properties, ...identity?.properties },
          raw: node,
        });
      },
    },
  };

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'node-map', visitor }],
    types
  );
  const ctx: WalkContext = { problems: [], specVersion, visitorsData: {} };

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors,
    // Empty map: `$ref` nodes fail to resolve and are NOT traversed — a reference
    // is recorded as a property of the node holding it.
    resolvedRefMap: new Map(),
    ctx,
  });

  return { entries, usageEdges };
}

function splitPointer(pointer: string): { parentPointer: string | null; segment: string } {
  if (pointer === '#/' || pointer === '#') {
    return { parentPointer: null, segment: pointer };
  }
  const lastSlash = pointer.lastIndexOf('/');
  const parentPointer = lastSlash <= 1 ? '#/' : pointer.slice(0, lastSlash);
  return { parentPointer, segment: pointer.slice(lastSlash + 1) };
}
