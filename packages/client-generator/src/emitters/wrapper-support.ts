// Shared support for the data-fetching wrapper generators (`swr`, `tanstack-query`).
// Both wrap the sdk's exported operation functions, so they agree on which operations
// are wrappable and on the `vars`/`init` parameter shape. Keeping that agreement in one
// place stops the two emitters from drifting (and makes a third adapter cheap). The
// per-operation factory/hook bodies stay in each emitter — only the cross-cutting
// calling-convention pieces live here.

import { logger } from '@redocly/openapi-core';

import type { ApiModel, OperationModel } from '../ir/model.js';
import { operationSignature } from './operation-signature.js';
import { isSseOp } from './sse.js';
import { ts } from './ts.js';

const { factory } = ts;

/**
 * The operations a wrapper generator can wrap, with skips reported to the user under
 * `label` (the generator name). Two kinds are dropped:
 *
 * - **SSE operations** — the sdk emits these as a private `sse.*` async-iterator surface,
 *   not exported request/response functions, so there is nothing to wrap.
 * - **`<Op>Variables` name collisions** — a wrapper types its inputs as the sdk's
 *   `<Op>Variables`; when that name collides with a schema the sdk suppresses the alias,
 *   so the import would resolve to the schema (a wrong/broken type). The sdk function still
 *   works; renaming the schema or the operation restores the wrapper.
 */
export function wrappableOperations(model: ApiModel, label: string): OperationModel[] {
  const all = model.services.flatMap((s) => s.operations);
  const sse = all.filter(isSseOp);
  if (sse.length > 0) {
    logger.warn(
      `generate-client: ${label} skipped ${sse.length} server-sent-events operation(s) — consume them via the sdk \`sse.*\` surface: ${sse
        .map((op) => op.name)
        .join(', ')}.\n`
    );
  }
  const schemaNames = new Set(model.schemas.map((s) => s.name));
  const clashing = all.filter((op) => !isSseOp(op) && collides(op, schemaNames));
  if (clashing.length > 0) {
    logger.warn(
      `generate-client: ${label} skipped ${clashing.length} operation(s) whose variables type name collides with a schema — rename the schema or the operation: ${clashing
        .map((op) => op.name)
        .join(', ')}.\n`
    );
  }
  return all.filter((op) => !isSseOp(op) && !collides(op, schemaNames));
}

/** Whether the operation's `<Op>Variables` type name collides with a named schema. */
function collides(op: OperationModel, schemaNames: Set<string>): boolean {
  const sig = operationSignature(op);
  return sig.hasInputs && schemaNames.has(sig.variablesTypeName);
}

/** Query operations are the safe, cacheable methods. Everything else is a mutation. */
export function isQuery(op: OperationModel): boolean {
  return op.method === 'get' || op.method === 'head';
}

/** Whether the operation has any inputs — i.e. a `<Op>Variables` type exists in the sdk. */
export function hasInputs(op: OperationModel): boolean {
  return operationSignature(op).hasInputs;
}

/** The operation's `<Op>Variables` type name (the sdk's grouped-input alias). */
export function variablesName(op: OperationModel): string {
  return operationSignature(op).variablesTypeName;
}

/** A `vars: <Op>Variables` parameter. */
export function varsParam(op: OperationModel): ts.ParameterDeclaration {
  return factory.createParameterDeclaration(
    undefined,
    undefined,
    'vars',
    undefined,
    factory.createTypeReferenceNode(variablesName(op))
  );
}

/** An `init?: RequestOptions` parameter. */
export function initParam(): ts.ParameterDeclaration {
  return factory.createParameterDeclaration(
    undefined,
    undefined,
    'init',
    factory.createToken(ts.SyntaxKind.QuestionToken),
    factory.createTypeReferenceNode('RequestOptions')
  );
}
