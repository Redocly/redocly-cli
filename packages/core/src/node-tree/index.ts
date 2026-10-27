import type { Document, ResolvedRefMap } from '../resolve.js';
import { NoUnresolvedRefs } from '../rules/common/no-unresolved-refs.js';
import type { NormalizedNodeType } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import {
  normalizeVisitors,
  type BaseVisitor,
  type NestedVisitObject,
  type RuleInstanceConfig,
} from '../visitors.js';
import { walkDocument, type UserContext, type WalkContext } from '../walk.js';
import type { NodeEntry, NodeValue } from './types.js';

export function buildNodeTree(opts: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  resolvedRefMap: ResolvedRefMap;
  ctx: WalkContext;
}): NodeEntry {
  const { document, types, resolvedRefMap, ctx } = opts;

  const nodes = new Map<unknown, NodeEntry>();
  const waitingRefs = new Map<unknown, NodeEntry[]>();

  const add = (value: NodeValue, { type, key, location }: UserContext, parent?: NodeEntry) => {
    const node: NodeEntry = {
      type,
      key,
      location,
      value,
      parent: parent ?? null,
      children: [],
    };

    parent?.children.push(node);
    nodes.set(value, node);

    for (const waiting of waitingRefs.get(value) ?? []) waiting.resolved = node;

    return node;
  };

  const visitor: BaseVisitor = {
    any: {
      enter(value: unknown, context) {
        const isContainer = isPlainObject(value) || Array.isArray(value);

        if (!isContainer || nodes.has(value)) return;

        const reachedFrom = nodes.get(context.rawNode);

        if (reachedFrom) {
          add(value, context).referencedFrom = reachedFrom;
        } else {
          add(value, context, nodes.get(context.parent));
        }
      },
      // A target the walker reached through a `$ref` before its own place joins it here
      leave(value: unknown) {
        const container = nodes.get(value);

        if (!container) return;

        for (const [key, childValue] of Object.entries(container.value)) {
          const child = nodes.get(childValue);

          if (!child || child.parent) continue;

          child.parent = container;
          child.key = Array.isArray(container.value) ? Number(key) : key;
          container.children.push(child);
        }
      },
    },
    ref(value: { $ref: string }, context, resolved) {
      if (nodes.has(value)) return;

      const ref = add(value, context, nodes.get(context.parent));
      const target = resolved.chain?.[0]?.node ?? resolved.node;
      const resolvedNode = nodes.get(target);

      if (resolvedNode) {
        ref.resolved = resolvedNode;
      } else {
        waitingRefs.set(target, [...(waitingRefs.get(target) ?? []), ref]);
      }
    },
  };

  const visitors: Array<
    RuleInstanceConfig & { visitor: NestedVisitObject<unknown, BaseVisitor | BaseVisitor[]> }
  > = [
    { severity: 'warn', ruleId: 'node-tree', visitor },
    { severity: 'error', ruleId: 'no-unresolved-refs', visitor: NoUnresolvedRefs({}) },
  ];

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(visitors, types),
    resolvedRefMap,
    ctx,
  });

  return nodes.get(document.parsed)!;
}
