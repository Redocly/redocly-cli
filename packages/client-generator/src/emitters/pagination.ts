// Auto-pagination resolution: turns config rules and `x-pagination` extensions into the
// normalized descriptor `PaginationSpec`, statically VERIFYING each rule fits its
// operation (the advance param is a declared query param whose schema fits the style —
// string-ish for `cursor`, a numeric scalar for `offset`/`page`; the JSON pointers
// resolve over the success response schema). A convention rule that doesn't fit silently skips the
// operation; an explicit rule (per-op config or extension) that doesn't fit — and a
// malformed rule from ANY source — is a generate-time error. No heuristics, ever.

import { isPlainObject } from '@redocly/openapi-core';

import type {
  ApiModel,
  OperationModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import type { PaginationSpec } from '../runtime/types.js';
import { allOperations } from '../writers/util.js';
import { isSseOp } from './sse.js';

/** The pagination styles the generated runtime can drive. */
export type PaginationStyle = 'cursor' | 'offset' | 'page';

/**
 * One user-facing pagination rule — the shared shape of the `x-pagination` operation
 * extension and every `pagination` config rule. `nextCursor` and `items` are RFC 6901
 * JSON pointers (starting with `/`) into the operation's success response.
 */
export type PaginationRule = {
  /** `cursor` follows a response cursor; `offset`/`page` increment a numeric param. */
  style: PaginationStyle;
  /** Cursor style: the request query param that receives the cursor. */
  cursorParam?: string;
  /** Cursor style: JSON pointer to the next cursor in the response. */
  nextCursor?: string;
  /** Offset/page styles: the request query param the iterator advances. */
  offsetParam?: string;
  /** Optional page-size query param (any style; recorded for tooling). */
  limitParam?: string;
  /** JSON pointer to the page's item array in the response. */
  items: string;
};

/**
 * The `pagination` config block: an optional convention rule (the top-level rule
 * fields, applied to every operation it structurally fits when `style` is set), plus
 * per-operation overrides and exclusions. Precedence per operation:
 * `operations[id]` > the spec's `x-pagination` extension > the convention rule.
 */
export type PaginationConfig = Partial<PaginationRule> & {
  /** operationIds no source may paginate. */
  exclude?: string[];
  /** Per-operation rules, keyed by operationId (beat `x-pagination` and the convention). */
  operations?: Record<string, PaginationRule>;
};

/** One operation's resolution: the normalized spec + item element schema, or an error. */
export type ResolvedPagination = {
  spec?: PaginationSpec;
  itemSchema?: SchemaModel;
  error?: string;
};

/** Every paginated operation's spec + item schema, keyed by operation name. */
export type ModelPagination = Map<string, { spec: PaginationSpec; itemSchema: SchemaModel }>;

/**
 * Resolve one operation's pagination across the three sources (per-op config >
 * `x-pagination` > convention); `config.exclude` kills all of them. Returns the
 * normalized spec + the item element schema, `{}` when the operation doesn't paginate
 * (no source, or a convention that doesn't fit), or an `error` for a malformed rule
 * (any source) and for an explicit rule that doesn't fit the operation.
 */
export function resolveOperationPagination(
  op: OperationModel,
  model: ApiModel,
  config: PaginationConfig | undefined
): ResolvedPagination {
  if (config?.exclude?.includes(op.name)) return {};
  const perOp = config?.operations?.[op.name];
  if (perOp !== undefined) {
    return applyRule(op, model, perOp, `pagination.operations["${op.name}"]`, true);
  }
  if (op.paginationExtension !== undefined) {
    return applyRule(op, model, op.paginationExtension, 'x-pagination', true);
  }
  if (config?.style !== undefined) {
    const { exclude: _exclude, operations: _operations, ...convention } = config;
    return applyRule(op, model, convention, 'pagination convention', false);
  }
  return {};
}

/**
 * Resolve pagination for every operation of the model. Errors (malformed rules,
 * explicit rules that don't fit) are aggregated into ONE throw listing every
 * failing operation, so a generate run reports the whole problem set at once.
 */
export function resolveModelPagination(
  model: ApiModel,
  config: PaginationConfig | undefined
): ModelPagination {
  const resolved: ModelPagination = new Map();
  const errors: string[] = [];
  for (const op of allOperations(model.services)) {
    const result = resolveOperationPagination(op, model, config);
    if (result.error !== undefined) errors.push(result.error);
    else if (result.spec !== undefined) {
      resolved.set(op.name, { spec: result.spec, itemSchema: result.itemSchema! });
    }
  }
  if (errors.length > 0) {
    throw new Error(['Invalid pagination configuration:', ...errors].join('\n  - '));
  }
  return resolved;
}

/** Validate the rule's shape and fit, then normalize it into a descriptor spec. */
function applyRule(
  op: OperationModel,
  model: ApiModel,
  rule: unknown,
  source: string,
  explicit: boolean
): ResolvedPagination {
  const label = `Pagination for operation "${op.name}" (${source})`;
  // Shape problems are errors from EVERY source — a malformed convention is a config bug.
  const shapeProblem = ruleShapeProblem(rule);
  if (shapeProblem !== undefined) return { error: `${label}: ${shapeProblem}` };
  const valid = rule as PaginationRule;
  // Fit problems: explicit declarations fail generation; a convention silently skips.
  const misfit = (problem: string): ResolvedPagination =>
    explicit ? { error: `${label}: ${problem}` } : {};

  if (isSseOp(op)) return misfit('the operation is a Server-Sent Events stream');
  const paramField = valid.style === 'cursor' ? 'cursorParam' : 'offsetParam';
  const param = valid.style === 'cursor' ? valid.cursorParam! : valid.offsetParam!;
  const advance = op.queryParams.find((p) => p.name === param);
  if (!advance) {
    return misfit(`query parameter "${param}" is not declared on the operation`);
  }
  // The advance param must accept what the runtime sends: the response's cursor
  // (string-ish, same predicate as nextCursor) or the incremented number.
  const advanceSchema = deref(advance.schema, model);
  const advanceFits =
    advanceSchema !== undefined &&
    (valid.style === 'cursor'
      ? isStringish(advanceSchema, model)
      : advanceSchema.kind === 'scalar' &&
        (advanceSchema.scalar === 'number' || advanceSchema.scalar === 'integer'));
  if (!advanceFits) {
    const expected = valid.style === 'cursor' ? 'a string' : 'a number';
    return misfit(
      `the "${paramField}" query parameter "${param}" must accept ${expected} (got ${describeSchema(advanceSchema)})`
    );
  }
  // The page the pointers address is the operation's primary JSON success response —
  // the same response `computeResponse` types (JSON preferred over other content types).
  const page = op.successResponses.find((r) => r.contentType.toLowerCase().includes('json'));
  if (!page) return misfit('the operation has no JSON success response');
  const itemsTarget = resolveSchemaPointer(page.schema, valid.items, model);
  if (itemsTarget === undefined) {
    return misfit(
      `the "items" pointer "${valid.items}" does not resolve in the success response schema`
    );
  }
  if (itemsTarget.kind !== 'array') {
    return misfit(
      `the "items" pointer "${valid.items}" must point at an array (got ${itemsTarget.kind})`
    );
  }
  if (valid.style === 'cursor') {
    const cursorTarget = resolveSchemaPointer(page.schema, valid.nextCursor!, model);
    if (cursorTarget === undefined) {
      return misfit(
        `the "nextCursor" pointer "${valid.nextCursor}" does not resolve in the success response schema`
      );
    }
    if (!isStringish(cursorTarget, model)) {
      return misfit(
        `the "nextCursor" pointer "${valid.nextCursor}" must point at a string (got ${cursorTarget.kind})`
      );
    }
  }
  return {
    spec: {
      style: valid.style,
      param,
      ...(valid.limitParam !== undefined ? { limitParam: valid.limitParam } : {}),
      ...(valid.style === 'cursor' ? { nextCursor: valid.nextCursor! } : {}),
      items: valid.items,
    },
    itemSchema: itemsTarget.items,
  };
}

/**
 * The rule's structural problem, or `undefined` when it is a well-formed
 * `PaginationRule`. Works over `unknown` — the extension is arbitrary spec data and
 * config arrives from YAML, so both are checked field-by-field.
 */
function ruleShapeProblem(rule: unknown): string | undefined {
  if (!isPlainObject(rule)) return 'the rule must be an object';
  const { style, cursorParam, nextCursor, offsetParam, limitParam, items } = rule;
  if (style !== 'cursor' && style !== 'offset' && style !== 'page') {
    return `"style" must be one of "cursor" | "offset" | "page" (got ${JSON.stringify(style)})`;
  }
  if (typeof items !== 'string' || !items.startsWith('/')) {
    return '"items" must be a JSON pointer starting with "/"';
  }
  if (style === 'cursor') {
    if (typeof cursorParam !== 'string' || cursorParam === '') {
      return 'cursor style requires a "cursorParam" query parameter name';
    }
    if (typeof nextCursor !== 'string' || !nextCursor.startsWith('/')) {
      return 'cursor style requires a "nextCursor" JSON pointer starting with "/"';
    }
  } else if (typeof offsetParam !== 'string' || offsetParam === '') {
    return `${style} style requires an "offsetParam" query parameter name`;
  }
  if (limitParam !== undefined && typeof limitParam !== 'string') {
    return '"limitParam" must be a query parameter name';
  }
  return undefined;
}

/**
 * Resolve an RFC 6901 JSON pointer (`~1` → `/`, `~0` → `~`) over a schema, walking the
 * VALUE shape it describes: object property steps by name, record values for any token,
 * array items for numeric tokens, with `ref` steps resolved through the model's named
 * schemas (cycle-guarded). Unions and intersections bail (v1 is strict). Returns
 * `undefined` on any miss — the caller decides whether that is an error.
 */
export function resolveSchemaPointer(
  schema: SchemaModel,
  pointer: string,
  model: ApiModel
): SchemaModel | undefined {
  let current = deref(schema, model);
  if (current === undefined || (pointer !== '' && !pointer.startsWith('/'))) return undefined;
  if (pointer === '') return current;
  for (const token of pointer.slice(1).split('/')) {
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~');
    let next: SchemaModel | undefined;
    if (current.kind === 'object') {
      next = current.properties.find((p) => p.name === key)?.schema;
    } else if (current.kind === 'record') {
      next = current.value;
    } else if (current.kind === 'array' && /^(0|[1-9]\d*)$/.test(key)) {
      next = current.items;
    }
    if (next === undefined) return undefined;
    current = deref(next, model);
    if (current === undefined) return undefined;
  }
  return current;
}

/** A (dereferenced) schema named for a fit-error message; scalars/enums by their scalar. */
function describeSchema(schema: SchemaModel | undefined): string {
  if (schema === undefined) return 'an unresolvable ref';
  return schema.kind === 'scalar' || schema.kind === 'enum' ? schema.scalar : schema.kind;
}

/** Follow a `ref` chain through the model's named schemas; `undefined` on a miss or cycle. */
function deref(schema: SchemaModel, model: ApiModel): SchemaModel | undefined {
  const seen = new Set<string>();
  let current = schema;
  while (current.kind === 'ref') {
    const { name } = current;
    if (seen.has(name)) return undefined;
    seen.add(name);
    const named = model.schemas.find((s) => s.name === name);
    if (named === undefined) return undefined;
    current = named.schema;
  }
  return current;
}

/**
 * Whether a (dereferenced) schema is string-ish per the cursor contract: a string
 * scalar, an enum of strings, or a literal string — nullable ok (a union whose members
 * are `null` or string-ish leaves; nested unions stay out, v1 is strict).
 */
function isStringish(schema: SchemaModel, model: ApiModel): boolean {
  if (schema.kind === 'scalar' || schema.kind === 'enum') return schema.scalar === 'string';
  if (schema.kind === 'literal') return typeof schema.value === 'string';
  if (schema.kind === 'union') {
    return schema.members.every((member) => {
      const resolved = deref(member, model);
      return (
        resolved !== undefined &&
        (resolved.kind === 'null' || (resolved.kind !== 'union' && isStringish(resolved, model)))
      );
    });
  }
  return false;
}
