// The shared calling-convention description for an operation. The sdk (which emits each
// operation's input type) and the wrapper generators (which forward it) read slot presence
// and `<Op>Variables` naming from this one source, so a call and its type cannot drift.

import type { OperationModel, ParamModel } from '@redocly/client-generator';
import { pascalCase } from '@redocly/client-generator/printers/typescript';

export type OperationSignature = {
  /** Slot presence — which input layers the operation has. */
  hasQuery: boolean;
  hasBody: boolean;
  hasHeaders: boolean;
  hasCookies: boolean;
  /** Any input at all — i.e. a `<Op>Variables` type exists for the operation. */
  hasInputs: boolean;
  /** Whether the input argument is required (else it defaults to `= {}`). */
  varsRequired: boolean;
  /** The `<Op>Variables` type-alias name. */
  variablesTypeName: string;
};

/**
 * Path parameters in URL-template order — the order a reader sees them in the path, and the
 * order the old positional signature used. A parameter declared but absent from the template
 * is dropped: it has nowhere to go in the URL, so asking for a value would mislead.
 */
export function templatePathParams(op: OperationModel): ParamModel[] {
  const byName = new Map(op.pathParams.map((param) => [param.name, param] as const));
  const ordered: ParamModel[] = [];
  for (const match of op.path.matchAll(/\{([^{}]+)\}/g)) {
    const param = byName.get(match[1]);
    if (param !== undefined) ordered.push(param);
  }
  return ordered;
}

/** Compute the calling-convention description for `op`. Pure; no AST. */
export function operationSignature(op: OperationModel): OperationSignature {
  const pathParams = templatePathParams(op);
  const hasQuery = op.queryParams.length > 0;
  const hasBody = Boolean(op.requestBody);
  const hasHeaders = op.headerParams.length > 0;
  const hasCookies = op.cookieParams.length > 0;
  return {
    hasQuery,
    hasBody,
    hasHeaders,
    hasCookies,
    hasInputs: pathParams.length > 0 || hasQuery || hasBody || hasHeaders || hasCookies,
    varsRequired:
      pathParams.length > 0 ||
      op.queryParams.some((p) => p.required) ||
      (op.requestBody?.required ?? false) ||
      op.headerParams.some((p) => p.required) ||
      op.cookieParams.some((p) => p.required),
    variablesTypeName: `${pascalCase(op.name)}Variables`,
  };
}
