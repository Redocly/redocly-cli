import { isPlainObject } from '@redocly/openapi-core';

import { MAX_DEPTH, matches, resolve, VARIANT_KEYWORDS, type Schema } from './schema.js';
import { siteKey } from './sites.js';

export interface Coverage {
  /** Named schema → property paths a value carried. */
  properties: Map<string, Set<string>>;
  /** Union site key → branch indices a value matched. */
  variants: Map<string, Set<number>>;
}

export function createCoverage(): Coverage {
  return { properties: new Map(), variants: new Map() };
}

interface WalkContext {
  spec: Schema;
  coverage: Coverage;
  /** Nearest named schema, so an inline sub-schema attributes to something stable. */
  owner: string;
  prefix: string;
  depth: number;
}

export function walk(schema: Schema | undefined, value: unknown, context: WalkContext): void {
  if (!schema || value === undefined || context.depth > MAX_DEPTH) return;

  const { schema: target, name } = resolve(context.spec, schema);
  if (!target) return;

  const next: WalkContext = name
    ? { ...context, owner: name, prefix: '', depth: context.depth + 1 }
    : { ...context, depth: context.depth + 1 };

  for (const keyword of VARIANT_KEYWORDS) {
    const branches: Schema[] | undefined = target[keyword];
    if (!branches?.length) continue;

    const key = siteKey(next.owner, next.prefix, keyword);
    if (!next.coverage.variants.has(key)) next.coverage.variants.set(key, new Set());

    for (const [index, branch] of branches.entries()) {
      if (!matches(next.spec, branch, value)) continue;

      next.coverage.variants.get(key)!.add(index);
      walk(branch, value, next);
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
    if (!next.coverage.properties.has(next.owner)) {
      next.coverage.properties.set(next.owner, new Set());
    }
    next.coverage.properties.get(next.owner)!.add(path);

    walk(sub, (value as Record<string, unknown>)[property], { ...next, prefix: path });
  }

  if (isPlainObject(target.additionalProperties)) {
    for (const item of Object.values(value)) walk(target.additionalProperties, item, next);
  }
}

export function walkRoot(spec: Schema, coverage: Coverage, schema: Schema, value: unknown): void {
  walk(schema, value, { spec, coverage, owner: '(inline)', prefix: '', depth: 0 });
}
