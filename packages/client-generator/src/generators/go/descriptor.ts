// The `descriptor` stage: the operations-table composite literals — security
// OR-alternatives and the pagination spec.

import {
  type ApiModel,
  type NeutralPaginationRule,
  type OperationModel,
  securityRequirements,
} from '@redocly/client-generator';

import { naming } from './naming.js';

/** Go composite literal for one operation's security OR-alternatives. */
export function goSecurityLiteral(op: OperationModel, model: ApiModel): string | undefined {
  const alternatives = securityRequirements(op, model).map((alternative) =>
    alternative.map((spec) =>
      spec.kind === 'apiKey'
        ? `{Scheme: ${naming.string(spec.scheme)}, Kind: "apiKey", Name: ${naming.string(spec.name)}, In: ${naming.string(spec.in)}}`
        : `{Scheme: ${naming.string(spec.scheme)}, Kind: ${naming.string(spec.kind)}}`
    )
  );
  if (alternatives.length === 0) return undefined;
  return `[][]SecuritySpec{${alternatives.map((specs) => `{${specs.join(', ')}}`).join(', ')}}`;
}

/** The neutral rule as a `&PaginationSpec{…}` composite literal for the operations table. */
export function goPaginationLiteral(rule: NeutralPaginationRule): string {
  const fields = [
    `Style: ${naming.string(rule.style)}`,
    ...(rule.param !== undefined ? [`Param: ${naming.string(rule.param)}`] : []),
    ...(rule.nextCursor !== undefined ? [`NextCursor: ${naming.string(rule.nextCursor)}`] : []),
    ...(rule.hasMore !== undefined ? [`HasMore: ${naming.string(rule.hasMore)}`] : []),
    ...(rule.limitParam !== undefined ? [`LimitParam: ${naming.string(rule.limitParam)}`] : []),
    ...(rule.items !== undefined ? [`Items: ${naming.string(rule.items)}`] : []),
  ];
  return `&PaginationSpec{${fields.join(', ')}}`;
}
