// The shared calling-convention description for an operation. Both the sdk (which
// emits each operation's parameter list) and the wrapper generators (tanstack-query,
// and any future framework adapter, which emit the forwarding call) derive their
// argument *order*, slot presence, and `<Op>Variables` naming from this one source —
// so a flat-mode signature and its call site can never drift. Previously each side
// recomputed this independently, kept in sync only by a "matching exactly" comment.

import type { OperationModel, ParamModel } from '../ir/model.js';
import { uniqueIdent } from './identifier.js';
import { pascalCase } from './support.js';

/** A path parameter paired with the unique JS identifier used for it in flat mode. */
export type SignaturePathParam = { param: ParamModel; ident: string };

export type OperationSignature = {
  /** Path params in URL-template order, each with its unique JS identifier. */
  pathParams: SignaturePathParam[];
  /** Slot presence, in the order flat-mode arguments follow the path params. */
  hasQuery: boolean;
  hasBody: boolean;
  hasHeaders: boolean;
  /** Any input at all — i.e. a `<Op>Variables` type exists for the operation. */
  hasInputs: boolean;
  /** Grouped mode: whether `vars` is required (else it defaults to `= {}`). */
  varsRequired: boolean;
  /** The `<Op>Variables` type-alias name. */
  variablesTypeName: string;
};

/** Compute the calling-convention description for `op`. Pure; no AST. */
export function operationSignature(op: OperationModel): OperationSignature {
  const byName = new Map(op.pathParams.map((p) => [p.name, p] as const));
  const ordered: ParamModel[] = [];
  for (const match of op.path.matchAll(/\{([^}]+)\}/g)) {
    const p = byName.get(match[1]);
    if (p) ordered.push(p);
  }
  const used = new Set<string>();
  const pathParams = ordered.map((param) => ({ param, ident: uniqueIdent(param.name, used) }));

  const hasQuery = op.queryParams.length > 0;
  const hasBody = Boolean(op.requestBody);
  const hasHeaders = op.headerParams.length > 0;
  return {
    pathParams,
    hasQuery,
    hasBody,
    hasHeaders,
    hasInputs: pathParams.length > 0 || hasQuery || hasBody || hasHeaders,
    varsRequired:
      pathParams.length > 0 ||
      op.queryParams.some((p) => p.required) ||
      (op.requestBody?.required ?? false) ||
      op.headerParams.some((p) => p.required),
    variablesTypeName: `${pascalCase(op.name)}Variables`,
  };
}
