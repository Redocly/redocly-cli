// Ejected from @redocly/client-generator@0.3.8 — the built-in "php" generator.
// This file is yours: edit freely; the generated client stays machine-owned and is
// rebuilt by `redocly generate-client`. Newer generator versions merge in with
// `redocly eject-generator php --update`.
// The `descriptor` stage: the operations-table array literals — security
// OR-alternatives, the pagination spec, and envelope-header coerce specs.

import {
  type ApiModel,
  headerCoerceType,
  identifierFor,
  type NeutralPaginationRule,
  type OperationModel,
  securityRequirements,
} from '@redocly/client-generator';

import { PHP, phpString } from './naming.ts';

/** Security literal for the operations table, denormalized from the model's schemes. */
export function phpSecurityLiteral(op: OperationModel, model: ApiModel): string | undefined {
  const alternatives = securityRequirements(op, model).map((alternative) => {
    const specs = alternative.map((spec) =>
      spec.kind === 'apiKey'
        ? `['kind' => 'apiKey', 'scheme' => ${phpString(spec.scheme)}, 'name' => ${phpString(spec.name)}, 'in' => ${phpString(spec.in)}]`
        : `['kind' => ${phpString(spec.kind)}, 'scheme' => ${phpString(spec.scheme)}]`
    );
    return `[${specs.join(', ')}]`;
  });
  if (alternatives.length === 0) return undefined;
  return `[${alternatives.join(', ')}]`;
}

export function phpPaginationLiteral(rule: NeutralPaginationRule): string {
  const fields = [
    `'style' => ${phpString(rule.style)}`,
    ...(rule.param !== undefined ? [`'param' => ${phpString(rule.param)}`] : []),
    ...(rule.nextCursor !== undefined ? [`'nextCursor' => ${phpString(rule.nextCursor)}`] : []),
    ...(rule.hasMore !== undefined ? [`'hasMore' => ${phpString(rule.hasMore)}`] : []),
    ...(rule.limitParam !== undefined ? [`'limitParam' => ${phpString(rule.limitParam)}`] : []),
    ...(rule.items !== undefined ? [`'items' => ${phpString(rule.items)}`] : []),
  ];
  return `[${fields.join(', ')}]`;
}

/** Declared response headers as runtime coerce specs: `[wire name, camelCase key, type]`. */
export function envelopeHeaderSpecs(op: OperationModel, model: ApiModel): string {
  const used = new Set<string>();
  const specs = (op.successResponseHeaders ?? []).map((header) => {
    let key = identifierFor(header.name, { style: 'camel', reserved: PHP });
    let suffix = 2;
    while (used.has(key))
      key = `${identifierFor(header.name, { style: 'camel', reserved: PHP })}_${suffix++}`;
    used.add(key);
    const type = headerCoerceType(header.schema, model);
    return `[${phpString(header.name)}, ${phpString(key)}, ${phpString(type)}]`;
  });
  return `[${specs.join(', ')}]`;
}
