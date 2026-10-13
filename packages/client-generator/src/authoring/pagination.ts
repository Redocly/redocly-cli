// Language-neutral pagination-rule resolution: which rule applies to an operation
// (per-op config > the `x-redoclyPagination` extension > a fitting convention) and
// its normalized shape. Declaration-based — the TS toolkit's static fit VERIFICATION
// (schema-level advance-param/pointer checks) remains generation-side; this helper is
// what every language generator shares.

import type { ApiModel, OperationModel } from '../intermediate-representation/model.js';
import { deref, schemaAtPointer, unwrapNullable } from './schema.js';

/** The normalized rule a generator renders into its runtime's pagination spec. */
export type NeutralPaginationRule = {
  style: string;
  /** The advance query parameter (cursor/offset/page styles). */
  param?: string;
  nextCursor?: string;
  hasMore?: string;
  /** Body-link style: the pointer to the next page's URL in the response. */
  nextLink?: string;
  limitParam?: string;
  items?: string;
};

/**
 * Pagination for one operation. The convention rule applies only where it structurally
 * fits (see `conventionFits`); `exclude` kills every source.
 * Returns undefined when the operation does not paginate.
 */
export function paginationRuleFor(
  op: OperationModel,
  config: Record<string, unknown> | undefined,
  model?: ApiModel
): NeutralPaginationRule | undefined {
  const configuration = config ?? {};
  const id = op.specName ?? op.name;
  if (Array.isArray(configuration.exclude) && configuration.exclude.includes(id)) {
    return undefined;
  }
  const operations = (configuration.operations ?? {}) as Record<string, Record<string, unknown>>;
  let rule: Record<string, unknown> | undefined =
    operations[id] ?? (op.paginationExtension as Record<string, unknown> | undefined);
  if (rule === undefined && typeof configuration.style === 'string') {
    const { exclude: _exclude, operations: _operations, ...convention } = configuration;
    if (conventionFits(op, convention, model)) rule = convention as Record<string, unknown>;
  }
  if (rule === undefined || typeof rule.style !== 'string') return undefined;
  const param = rule.style === 'cursor' ? rule.cursorParam : rule.offsetParam;
  return {
    style: rule.style,
    ...(typeof param === 'string' ? { param } : {}),
    ...(typeof rule.nextCursor === 'string' ? { nextCursor: rule.nextCursor } : {}),
    ...(typeof rule.hasMore === 'string' ? { hasMore: rule.hasMore } : {}),
    ...(typeof rule.nextLink === 'string' ? { nextLink: rule.nextLink } : {}),
    ...(typeof rule.limitParam === 'string' ? { limitParam: rule.limitParam } : {}),
    ...(typeof rule.items === 'string' ? { items: rule.items } : {}),
  };
}

/**
 * Whether a convention rule structurally fits the operation — the same gate the TypeScript
 * emitter applies. Without it, a link convention would attach page iterators to every
 * operation in the description.
 */
function conventionFits(
  op: OperationModel,
  convention: Record<string, unknown>,
  model: ApiModel | undefined
): boolean {
  // `link` has no advance parameter: the success response must document a `Link` header.
  if (convention.style === 'link') {
    return op.successResponseHeaders?.some((header) => header.name === 'link') === true;
  }
  // `body-link` has none either: its `nextLink` pointer must resolve to a string.
  if (convention.style === 'body-link') {
    if (typeof convention.nextLink !== 'string' || model === undefined) return false;
    const page = op.successResponses.find((response) =>
      response.contentType.toLowerCase().includes('json')
    );
    const target = page && schemaAtPointer(page.schema, convention.nextLink, model);
    const link = target && deref(unwrapNullable(target), model);
    return (link?.kind === 'scalar' || link?.kind === 'enum') && link.scalar === 'string';
  }
  // cursor/offset/page: the advance parameter must be declared on the operation.
  const advance = convention.style === 'cursor' ? convention.cursorParam : convention.offsetParam;
  return typeof advance === 'string' && op.queryParams.some((param) => param.name === advance);
}
