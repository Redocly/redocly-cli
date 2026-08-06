// Shared support for the data-fetching wrapper generators (`swr`, `tanstack-query`).
// Both wrap the sdk's exported operation functions, so they agree on which operations
// are wrappable and on the `vars`/`init` parameter shape. Keeping that agreement in one
// place stops the two emitters from drifting (and makes a third adapter cheap). The
// per-operation factory/hook bodies stay in each emitter — only the cross-cutting
// calling-convention pieces live here.

import { logger } from '@redocly/openapi-core';

import type { ApiModel, OperationModel } from '../intermediate-representation/model.js';
import { operationSignature } from './operation-signature.js';
import { isSseOp } from './sse.js';

/**
 * The operations a wrapper generator can wrap, with skips reported to the user under
 * `label` (the generator name). Two kinds are dropped:
 *
 * - **SSE operations** — the sdk exposes these as async generators (streams), not
 *   request/response functions, so a query/mutation hook cannot wrap them.
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
      `generate-client: ${label} skipped ${sse.length} server-sent-events operation(s) — iterate the sdk's exported async generators directly: ${sse
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

/** The forwarding-call ARGUMENT LIST to the sdk operation function, as text. Argument
 * order comes from the shared `operationSignature`, so it lines up with the sdk's
 * parameter list by construction. `grouped` passes the source object — `{}` for a
 * no-input op with an init, which must not land in the `(args?, init?)` args slot;
 * `flat` spreads `<source>.<pathIdent>` (URL-template order), then the slots the op
 * has. `withInit` appends `{ ...init, envelope: undefined }` — a runtime strip, since
 * the wrappers cache the fetched body and their `Omit`-typed init is type-only. */
export function sdkCallText(
  op: OperationModel,
  argsStyle: 'flat' | 'grouped',
  source: string,
  withInit: boolean
): string {
  const sig = operationSignature(op);
  const args: string[] = [];
  if (argsStyle === 'grouped') {
    if (sig.hasInputs) args.push(source);
    else if (withInit) args.push('{}');
  } else {
    for (const { ident } of sig.pathParams) args.push(`${source}.${ident}`);
    if (sig.hasQuery) args.push(`${source}.params`);
    if (sig.hasBody) args.push(`${source}.body`);
    if (sig.hasHeaders) args.push(`${source}.headers`);
    if (sig.hasCookies) args.push(`${source}.cookies`);
  }
  if (withInit) args.push('{ ...init, envelope: undefined }');
  return `${op.name}(${args.join(', ')})`;
}

/** The named import from the sdk module: wrapped opFns, then the referenced
 * `<Op>Variables` types + `RequestOptions` (when any query op) as `type` specifiers. */
export function sdkNamedImportText(
  ops: OperationModel[],
  sdkModule: string,
  hasQuery: boolean
): string {
  const values = ops.map((op) => op.name).sort();
  const types = ops.filter(hasInputs).map(variablesName).sort();
  if (hasQuery) types.push('RequestOptions');
  const specifiers = [...values, ...types.map((name) => `type ${name}`)].join(', ');
  return `import { ${specifiers} } from ${JSON.stringify(sdkModule)};`;
}
