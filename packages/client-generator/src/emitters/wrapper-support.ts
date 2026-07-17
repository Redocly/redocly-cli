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
import { ts } from './ts.js';

const { factory } = ts;

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

/**
 * The forwarding call to the sdk operation function. Argument order comes from the
 * shared `operationSignature`, so it lines up with the sdk's parameter list by
 * construction. `grouped` passes the source object (when inputs); `flat` spreads
 * `<source>.<pathIdent>` (URL-template order), then `<source>.params` / `.body` /
 * `.headers` for the slots the op has. `init` is appended last when `withInit`
 * (the sdk function's trailing `RequestOptions`).
 */
export function sdkCall(
  op: OperationModel,
  argsStyle: 'flat' | 'grouped',
  source: string,
  withInit: boolean
): ts.Expression {
  const sig = operationSignature(op);
  const sourceIdent = factory.createIdentifier(source);
  const args: ts.Expression[] = [];

  if (argsStyle === 'grouped') {
    if (sig.hasInputs) args.push(sourceIdent);
  } else {
    for (const { ident } of sig.pathParams) {
      args.push(factory.createPropertyAccessExpression(sourceIdent, ident));
    }
    if (sig.hasQuery) args.push(factory.createPropertyAccessExpression(sourceIdent, 'params'));
    if (sig.hasBody) args.push(factory.createPropertyAccessExpression(sourceIdent, 'body'));
    if (sig.hasHeaders) args.push(factory.createPropertyAccessExpression(sourceIdent, 'headers'));
  }
  if (withInit) args.push(factory.createIdentifier('init'));

  return factory.createCallExpression(factory.createIdentifier(op.name), undefined, args);
}

/**
 * The named import from the sdk module: the wrapped opFns as value specifiers, then
 * the referenced `<Op>Variables` types + `RequestOptions` (when any query op) as
 * `type` specifiers, each group sorted.
 */
export function sdkNamedImport(
  ops: OperationModel[],
  sdkModule: string,
  hasQuery: boolean
): ts.Statement {
  const values = ops.map((op) => op.name).sort();
  const types = ops.filter(hasInputs).map(variablesName).sort();
  if (hasQuery) types.push('RequestOptions');

  const specifiers = [
    ...values.map((name) =>
      factory.createImportSpecifier(false, undefined, factory.createIdentifier(name))
    ),
    ...types.map((name) =>
      factory.createImportSpecifier(true, undefined, factory.createIdentifier(name))
    ),
  ];
  return factory.createImportDeclaration(
    undefined,
    factory.createImportClause(false, undefined, factory.createNamedImports(specifiers)),
    factory.createStringLiteral(sdkModule)
  );
}
