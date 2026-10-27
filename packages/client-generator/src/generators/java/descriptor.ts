// The `descriptor` stage: the per-operation `Operation` literal — security
// OR-alternatives and the pagination spec — and the envelope-header coerce specs.

import {
  type ApiModel,
  headerCoerceType,
  type NeutralPaginationRule,
  type OperationModel,
  securityRequirements,
  uniqueIdentifiers,
} from '@redocly/client-generator';

import { JAVA, javaString } from './naming.ts';

/** `List.of(List.of(SecuritySpec…))` for the operation's security OR-alternatives. */
export function javaSecurityLiteral(op: OperationModel, model: ApiModel): string {
  const alternatives = securityRequirements(op, model).map((alternative) => {
    const specs = alternative.map((spec) =>
      spec.kind === 'apiKey'
        ? `new SecuritySpec(${javaString(spec.scheme)}, "apiKey", ${javaString(spec.name)}, ${javaString(spec.in)})`
        : `SecuritySpec.of(${javaString(spec.scheme)}, ${javaString(spec.kind)})`
    );
    return `List.of(${specs.join(', ')})`;
  });
  return `List.of(${alternatives.join(', ')})`;
}

/** The neutral rule as a `new PaginationSpec(…)` literal, or `null` when the operation does not paginate. */
export function javaPaginationLiteral(rule: NeutralPaginationRule | undefined): string {
  if (rule === undefined) return 'null';
  const field = (value: string | undefined) => (value === undefined ? 'null' : javaString(value));
  return `new PaginationSpec(${[
    javaString(rule.style),
    field(rule.param),
    field(rule.nextCursor),
    field(rule.hasMore),
    field(rule.nextLink),
    field(rule.limitParam),
    field(rule.items),
  ].join(', ')})`;
}

/**
 * The operation as the runtime describes it, built where it is used: a table of every
 * operation in one static initializer would exceed the JVM's method size on a large
 * description, and the record is a trivial allocation.
 */
export function javaOperationLiteral(
  op: OperationModel,
  model: ApiModel,
  rule: NeutralPaginationRule | undefined
): string {
  return `new Operation(${javaString(op.specName ?? op.name)}, ${javaString(op.method.toUpperCase())}, ${javaString(op.path)}, ${javaSecurityLiteral(op, model)}, ${javaPaginationLiteral(rule)})`;
}

/** Declared response headers as runtime coerce specs: `{wire name, camelCase key, type}`. */
export function envelopeHeaderSpecs(op: OperationModel, model: ApiModel): string {
  const headers = op.successResponseHeaders ?? [];
  const keys = uniqueIdentifiers(
    headers.map((header) => header.name),
    { style: 'camel', reserved: JAVA }
  );
  const specs = headers.map((header, index) => {
    const type = headerCoerceType(header.schema, model);
    return `{${javaString(header.name)}, ${javaString(keys[index])}, ${javaString(type)}}`;
  });
  return `new String[][] {${specs.join(', ')}}`;
}
