// Language-neutral pagination-rule resolution: which rule applies to an operation
// (per-op config > the `x-redocly-pagination` extension > a fitting convention) and
// its normalized shape. Declaration-based — the TS toolkit's static fit VERIFICATION
// (schema-level advance-param/pointer checks) remains generation-side; this helper is
// what every language generator shares.

import type { ApiModel, OperationModel } from '../intermediate-representation/model.js';

/** The normalized rule a generator renders into its runtime's pagination spec. */
export type NeutralPaginationRule = {
  style: string;
  /** The advance query parameter (cursor/offset/page styles). */
  param?: string;
  nextCursor?: string;
  hasMore?: string;
  limitParam?: string;
  items?: string;
};

/**
 * Pagination for one operation. The convention rule applies only when its advance
 * parameter exists on the operation (`link` needs none); `exclude` kills every source.
 * Returns undefined when the operation does not paginate.
 */
export function paginationRuleFor(
  op: OperationModel,
  config: Record<string, unknown> | undefined,
  _model?: ApiModel
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
    const advance = convention.style === 'cursor' ? convention.cursorParam : convention.offsetParam;
    const fits =
      convention.style === 'link' ||
      (typeof advance === 'string' && op.queryParams.some((param) => param.name === advance));
    if (fits) rule = convention as Record<string, unknown>;
  }
  if (rule === undefined || typeof rule.style !== 'string') return undefined;
  const param = rule.style === 'cursor' ? rule.cursorParam : rule.offsetParam;
  return {
    style: rule.style,
    ...(typeof param === 'string' ? { param } : {}),
    ...(typeof rule.nextCursor === 'string' ? { nextCursor: rule.nextCursor } : {}),
    ...(typeof rule.hasMore === 'string' ? { hasMore: rule.hasMore } : {}),
    ...(typeof rule.limitParam === 'string' ? { limitParam: rule.limitParam } : {}),
    ...(typeof rule.items === 'string' ? { items: rule.items } : {}),
  };
}
