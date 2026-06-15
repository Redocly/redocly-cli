// The `<Op>*` derived type-alias builders (`<Op>Result`/`Error`/`Params`/`Body`/`Headers`/`Variables`).
// Split out of operations.ts: this is the cohesive cluster the sdk emits so callers can name
// intermediate values. Reuses the shared type builders (operation-types.ts) and the block-wide
// `EmitContext` (a type-only import from operations.ts — erased, so there is no runtime cycle).

import type { OperationModel, ParamModel } from '../ir/model.js';
import { jsdocText } from './jsdoc.js';
import { operationSignature } from './operation-signature.js';
import { bodyTypeNode, paramsTypeLiteral } from './operation-types.js';
import type { EmitContext } from './operations.js';
import { pascalCase } from './support.js';
import { jsdoc, ts } from './ts.js';
import { schemaToTypeNode } from './types.js';

const { factory } = ts;

/**
 * Emit derived type aliases for an operation so callers can name intermediate
 * values without re-deriving via `Awaited<ReturnType<...>>` plumbing.
 *
 * `*Result` is always emitted (even for `void`). The others are conditional on
 * the operation actually having the corresponding inputs — emitting empty
 * `*Params = {}` or `*Body = unknown` aliases would just be noise.
 */
export function renderOperationAliases(
  op: OperationModel,
  responseType: ts.TypeNode,
  orderedPathParams: ParamModel[],
  pathParamIdent: Map<string, string>,
  errorAlias: string,
  errorMembers: ts.TypeNode[],
  ctx: EmitContext,
  // SSE ops have no one-shot response, so they omit `*Result`/`*Error` and keep only the input
  // aliases. (Previously done by a `.slice(1)` on the result; an explicit flag is collision-safe.)
  emitResultAndError = true
): ts.Statement[] {
  const { dateType, schemaNames } = ctx;
  const name = pascalCase(op.name);
  const aliases: ts.Statement[] = [];

  // Every derived alias is suppressed when its name collides with an exported schema (a
  // duplicate `export type` is a TS2300 error). References to a suppressed alias inline the
  // underlying type instead — see `renderOperationParts` (Result/Error) and `renderVariablesAlias`
  // / the grouped signature (Params/Body/Headers/Variables).

  // Emit `export type <Op>Result = …` unless its name collides with an exported schema. Two
  // cases collide: self-referential (operation `search` returning schema `SearchResult` →
  // `export type SearchResult = SearchResult;`, circular) and plain (operation `login` returning
  // some other type while a `LoginResult` schema also exists). In both, call sites reference the
  // response type directly (`renderOperationParts`), so the alias is redundant.
  const resultName = `${name}Result`;
  if (emitResultAndError && !schemaNames.has(resultName)) {
    aliases.push(exportType(resultName, responseType));
  }

  // Result mode only, and only when the operation declares error responses: the typed `error`.
  if (emitResultAndError && errorAlias && !schemaNames.has(errorAlias)) {
    aliases.push(
      exportType(
        errorAlias,
        errorMembers.length === 1 ? errorMembers[0] : factory.createUnionTypeNode(errorMembers)
      )
    );
  }

  if (op.queryParams.length > 0 && !schemaNames.has(`${name}Params`)) {
    // Reuse the params type-literal builder so the alias body picks up per-prop
    // JSDoc automatically — no second renderer to keep in sync.
    aliases.push(exportType(`${name}Params`, paramsTypeLiteral(op.queryParams, dateType)));
  }

  if (op.requestBody && !schemaNames.has(`${name}Body`)) {
    // Use the same content-type → TS-type mapping as the function signature, so
    // `<Op>Body` matches the second-positional arg of the function exactly.
    aliases.push(exportType(`${name}Body`, bodyTypeNode(op.requestBody, dateType)));
  }

  if (op.headerParams.length > 0 && !schemaNames.has(`${name}Headers`)) {
    aliases.push(exportType(`${name}Headers`, paramsTypeLiteral(op.headerParams, dateType)));
  }

  if (!schemaNames.has(`${name}Variables`)) {
    const variables = renderVariablesAlias(op, name, orderedPathParams, pathParamIdent, ctx);
    if (variables) aliases.push(variables);
  }

  return aliases;
}

/**
 * An SSE op's input aliases (`*Params` / `*Body` / `*Headers` / `*Variables`) — but NOT
 * `*Result`/`*Error`, which describe a one-shot response an event stream has no equivalent of.
 * Passes the real `schemaNames` so the input aliases still get collision suppression, and sets
 * `emitResultAndError = false` to omit the result/error pair.
 */
export function sseAliases(
  op: OperationModel,
  orderedPathParams: ParamModel[],
  pathParamIdent: Map<string, string>,
  ctx: EmitContext
): ts.Statement[] {
  return renderOperationAliases(
    op,
    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
    orderedPathParams,
    pathParamIdent,
    '',
    [],
    ctx,
    false
  );
}

/** `export type <name> = <type>;` */
function exportType(name: string, type: ts.TypeNode): ts.TypeAliasDeclaration {
  return factory.createTypeAliasDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    name,
    undefined,
    type
  );
}

/**
 * Combined inputs alias — a single object that bundles every positional input
 * the operation function accepts. The seam React Query / SWR wrappers use:
 *
 *   useMutation({ mutationFn: (vars: UpdateOrderVariables) => updateOrder(vars.orderId, vars.params, vars.body) })
 *
 * Conventions:
 * - Property order: path params (URL-template order), then `params`, then `body`,
 *   then `headers`. Mirrors the function's positional argument order.
 * - Path-param props carry the same JSDoc (description + schema metadata) the
 *   function declaration omits.
 * - `params?` is optional iff the function signature defaults to `= {}` (all query
 *   params optional). Same rule for `body?` / `headers?`.
 * - References `<Op>Params` / `<Op>Body` / `<Op>Headers` when those aliases were
 *   also emitted, so the aliases stay in sync without duplicating their bodies.
 *
 * Returns `undefined` for operations with no inputs at all.
 */
function renderVariablesAlias(
  op: OperationModel,
  name: string,
  orderedPathParams: ParamModel[],
  pathParamIdent: Map<string, string>,
  ctx: EmitContext
): ts.TypeAliasDeclaration | undefined {
  if (!hasInputs(op)) return undefined;
  return exportType(
    name + 'Variables',
    variablesTypeLiteral(op, name, orderedPathParams, pathParamIdent, ctx)
  );
}

/** Whether an operation accepts any input (path/query/body/header). */
function hasInputs(op: OperationModel): boolean {
  return (
    operationSignature(op).pathParams.length > 0 ||
    op.queryParams.length > 0 ||
    Boolean(op.requestBody) ||
    op.headerParams.length > 0
  );
}

/**
 * The `<Op>Variables` object type literal (the body of the alias, reused inline by the grouped
 * signature when the alias name itself collides). Each `params`/`body`/`headers` property
 * references its `<Op>X` alias, or inlines the type when that alias name collides with a schema
 * (so a suppressed alias is never referenced).
 */
export function variablesTypeLiteral(
  op: OperationModel,
  name: string,
  orderedPathParams: ParamModel[],
  pathParamIdent: Map<string, string>,
  ctx: EmitContext
): ts.TypeNode {
  const { dateType, schemaNames } = ctx;
  const props: ts.PropertySignature[] = [];

  for (const p of orderedPathParams) {
    // Same safe identifier the function uses, so a wrapper can map
    // `vars.<ident>` straight onto the positional argument.
    const sig = factory.createPropertySignature(
      undefined,
      pathParamIdent.get(p.name)!,
      undefined,
      schemaToTypeNode(p.schema, dateType)
    );
    const doc = jsdocText(p.description, p.schema.metadata);
    props.push(doc === undefined ? sig : jsdoc(sig, doc));
  }

  if (op.queryParams.length > 0) {
    props.push(
      inputProp(
        'params',
        `${name}Params`,
        () => paramsTypeLiteral(op.queryParams, dateType),
        op.queryParams.some((p) => p.required),
        schemaNames
      )
    );
  }
  if (op.requestBody) {
    props.push(
      inputProp(
        'body',
        `${name}Body`,
        () => bodyTypeNode(op.requestBody!, dateType),
        op.requestBody.required,
        schemaNames
      )
    );
  }
  if (op.headerParams.length > 0) {
    props.push(
      inputProp(
        'headers',
        `${name}Headers`,
        () => paramsTypeLiteral(op.headerParams, dateType),
        op.headerParams.some((p) => p.required),
        schemaNames
      )
    );
  }

  return factory.createTypeLiteralNode(props);
}

/** A `<key>(?): <Alias>` property, or an inline-typed one when `<Alias>` collides with a schema. */
function inputProp(
  key: string,
  alias: string,
  inlineType: () => ts.TypeNode,
  required: boolean,
  schemaNames: Set<string>
): ts.PropertySignature {
  return factory.createPropertySignature(
    undefined,
    key,
    required ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
    schemaNames.has(alias) ? inlineType() : factory.createTypeReferenceNode(alias)
  );
}
