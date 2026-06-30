// Emits an idiomatic TanStack Query v5 (React) module wrapping the sdk operation
// functions. Per query operation (GET/HEAD) a `<op>QueryKey(vars)` +
// `<op>Options(vars, init?)` (`queryOptions({ queryKey, queryFn })`); per mutation
// (everything else) a `<op>Mutation()` (`{ mutationKey, mutationFn }`). Each
// factory forwards to the sdk function per the configured args style — grouped
// (`getPet(vars, init)`) or flat (`getPet(vars.petId, vars.params, …, init)`),
// matching `operations.ts` positional order so the call type-checks against the
// generated sdk. AST-native via `ts.factory`.

import type { ApiModel, OperationModel } from '../ir/model.js';
import { operationSignature } from './operation-signature.js';
import {
  arrow,
  constArray,
  exportConstStatement as exportConst,
  printStatements,
  ts,
} from './ts.js';
import {
  hasInputs,
  initParam,
  isQuery,
  variablesName,
  varsParam,
  wrappableOperations,
} from './wrapper-support.js';

const { factory } = ts;

export type TanstackOptions = {
  argsStyle: 'flat' | 'grouped';
  /** Import specifier for the sdk entry the operation functions/types live in. */
  sdkModule: string;
  /** TanStack adapter to import `queryOptions` from (`@tanstack/${framework}-query`). */
  framework: 'react' | 'vue' | 'svelte' | 'solid';
};

/** Render the full TanStack Query module source. `''` when there are no wrappable operations. */
export function renderTanstackModule(model: ApiModel, opts: TanstackOptions): string {
  const ops = wrappableOperations(model, 'tanstack-query');
  if (ops.length === 0) return '';
  return printStatements(tanstackStatements(ops, opts));
}

/** The TanStack module statements: the import header followed by per-op factories. */
function tanstackStatements(ops: OperationModel[], opts: TanstackOptions): ts.Statement[] {
  const hasQuery = ops.some(isQuery);
  const statements: ts.Statement[] = [];
  for (const op of ops) {
    statements.push(...(isQuery(op) ? queryStatements(op, opts) : [mutationStatement(op, opts)]));
  }
  return [...importHeader(ops, opts, hasQuery), ...statements];
}

/**
 * The forwarding call to the sdk operation function. Argument order comes from the
 * shared `operationSignature`, so it lines up with the sdk's parameter list by
 * construction. `grouped` passes `vars` (when inputs) then `init` (query only); `flat`
 * spreads `vars.<pathIdent>` (URL-template order), then `vars.params` / `vars.body` /
 * `vars.headers` for the slots the op has, then `init` (query only).
 */
function sdkCall(op: OperationModel, opts: TanstackOptions, query: boolean): ts.Expression {
  const sig = operationSignature(op);
  const vars = factory.createIdentifier('vars');
  const init = factory.createIdentifier('init');
  const args: ts.Expression[] = [];

  if (opts.argsStyle === 'grouped') {
    if (sig.hasInputs) args.push(vars);
  } else {
    for (const { ident } of sig.pathParams) {
      args.push(factory.createPropertyAccessExpression(vars, ident));
    }
    if (sig.hasQuery) args.push(factory.createPropertyAccessExpression(vars, 'params'));
    if (sig.hasBody) args.push(factory.createPropertyAccessExpression(vars, 'body'));
    if (sig.hasHeaders) args.push(factory.createPropertyAccessExpression(vars, 'headers'));
  }
  if (query) args.push(init);

  return factory.createCallExpression(factory.createIdentifier(op.name), undefined, args);
}

/** A query op's `<op>QueryKey` + `<op>Options` statements. */
function queryStatements(op: OperationModel, opts: TanstackOptions): ts.Statement[] {
  const inputs = hasInputs(op);
  const keyId = factory.createStringLiteral(op.name);
  const keyParams = inputs ? [varsParam(op)] : [];
  const keyElements = inputs ? [keyId, factory.createIdentifier('vars')] : [keyId];

  const queryKey = exportConst(`${op.name}QueryKey`, arrow(keyParams, constArray(keyElements)));

  const keyCall = factory.createCallExpression(
    factory.createIdentifier(`${op.name}QueryKey`),
    undefined,
    inputs ? [factory.createIdentifier('vars')] : []
  );
  const queryOptionsCall = factory.createCallExpression(
    factory.createIdentifier('queryOptions'),
    undefined,
    [
      factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment('queryKey', keyCall),
          factory.createPropertyAssignment('queryFn', arrow([], sdkCall(op, opts, true))),
        ],
        true
      ),
    ]
  );
  const optionsParams = inputs ? [varsParam(op), initParam()] : [initParam()];
  const options = exportConst(`${op.name}Options`, arrow(optionsParams, queryOptionsCall));

  return [queryKey, options];
}

/** A mutation op's `<op>Mutation` statement. */
function mutationStatement(op: OperationModel, opts: TanstackOptions): ts.Statement {
  const inputs = hasInputs(op);
  const mutationFn = arrow(inputs ? [varsParam(op)] : [], sdkCall(op, opts, false));

  const obj = factory.createObjectLiteralExpression(
    [
      factory.createPropertyAssignment(
        'mutationKey',
        constArray([factory.createStringLiteral(op.name)])
      ),
      factory.createPropertyAssignment('mutationFn', mutationFn),
    ],
    true
  );

  // Wrap in parens so the arrow body is an object literal, not a block.
  return exportConst(`${op.name}Mutation`, arrow([], factory.createParenthesizedExpression(obj)));
}

/**
 * The import header: `queryOptions` from `@tanstack/${framework}-query` (when any
 * query op), and the wrapped opFns + referenced `<Op>Variables` types + `RequestOptions`
 * (when any query) from the sdk module. Value specifiers then `type` specifiers,
 * each group sorted.
 */
function importHeader(
  ops: OperationModel[],
  opts: TanstackOptions,
  hasQuery: boolean
): ts.Statement[] {
  const tanstack = factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      false,
      undefined,
      factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('queryOptions')),
      ])
    ),
    factory.createStringLiteral(`@tanstack/${opts.framework}-query`)
  );

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
  const sdkImport = factory.createImportDeclaration(
    undefined,
    factory.createImportClause(false, undefined, factory.createNamedImports(specifiers)),
    factory.createStringLiteral(opts.sdkModule)
  );

  return hasQuery ? [tanstack, sdkImport] : [sdkImport];
}
