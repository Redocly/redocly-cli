import { isPlainObject } from '@redocly/openapi-core';

import {
  composedNames,
  MAX_DEPTH,
  resolve,
  selectBranches,
  VARIANT_KEYWORDS,
  type Schema,
} from './schema.js';
import { siteKey } from './sites.js';

export interface Coverage {
  /** Named schema → property paths a value carried. */
  properties: Map<string, Set<string>>;
  /** Union site key → branch indices a value matched. */
  variants: Map<string, Set<number>>;
  /**
   * Named schemas a value reached. Tracked apart from `properties` because a
   * schema can be reached without carrying one: a union holds only branches,
   * and an object can inherit every property it has.
   */
  visited: Set<string>;
}

export function createCoverage(): Coverage {
  return { properties: new Map(), variants: new Map(), visited: new Set() };
}

interface WalkContext {
  spec: Schema;
  coverage: Coverage;
  /** Nearest named schema, so an inline sub-schema attributes to something stable. */
  owner: string;
  prefix: string;
  depth: number;
  /**
   * Whether the walk is inside an inline `additionalProperties`. Those values
   * sit outside the owner's property paths, so recording their names would
   * credit a parent property that shares one.
   */
  mapped: boolean;
}

export function walk(schema: Schema | undefined, value: unknown, context: WalkContext): void {
  if (!schema || value === undefined || context.depth > MAX_DEPTH) return;

  const { schema: target, name } = resolve(context.spec, schema);
  if (!target) return;

  // A `$ref` puts the walk back inside a named schema, where paths count again.
  const next: WalkContext = name
    ? { ...context, owner: name, prefix: '', depth: context.depth + 1, mapped: false }
    : { ...context, depth: context.depth + 1 };

  if (name) next.coverage.visited.add(name);

  for (const keyword of VARIANT_KEYWORDS) {
    const branches: Schema[] | undefined = target[keyword];
    if (!branches?.length) continue;

    const key = siteKey(next.owner, next.prefix, keyword);
    if (!next.coverage.variants.has(key)) next.coverage.variants.set(key, new Set());

    for (const index of selectBranches(next.spec, target, branches, value)) {
      next.coverage.variants.get(key)!.add(index);
      walk(branches[index], value, next);
    }
  }

  for (const branch of target.allOf ?? []) walk(branch, value, next);

  if (Array.isArray(value)) {
    for (const item of value) walk(target.items, item, next);
    return;
  }

  if (!isPlainObject(value)) return;

  for (const [property, sub] of Object.entries(target.properties ?? {}) as [string, Schema][]) {
    if (!(property in value)) continue;

    const path = next.prefix ? `${next.prefix}.${property}` : property;
    if (!next.mapped) {
      if (!next.coverage.properties.has(next.owner)) {
        next.coverage.properties.set(next.owner, new Set());
      }
      next.coverage.properties.get(next.owner)!.add(path);
    }

    walk(sub, (value as Record<string, unknown>)[property], { ...next, prefix: path });
  }

  // `additionalProperties` describes only the keys the schema does not declare,
  // counting the ones it composes in through `allOf`.
  if (isPlainObject(target.additionalProperties)) {
    const declaredKeys = composedNames(next.spec, target);

    for (const [key, item] of Object.entries(value)) {
      if (declaredKeys.has(key)) continue;

      walk(target.additionalProperties, item, { ...next, mapped: true });
    }
  }
}

export function walkRoot(spec: Schema, coverage: Coverage, schema: Schema, value: unknown): void {
  walk(schema, value, { spec, coverage, owner: '(inline)', prefix: '', depth: 0, mapped: false });
}
