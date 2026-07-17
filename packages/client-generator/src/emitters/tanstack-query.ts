// Emits an idiomatic TanStack Query v5 (React) module wrapping the sdk operation
// functions. Per query operation (GET/HEAD) a `<op>QueryKey(vars)` +
// `<op>Options(vars, init?)` (`queryOptions({ queryKey, queryFn })`); per mutation
// (everything else) a `<op>Mutation()` (`{ mutationKey, mutationFn }`). Each
// factory forwards to the sdk function per the configured args style — grouped
// (`getPet(vars, init)`) or flat (`getPet(vars.petId, vars.params, …, init)`),
// matching `operations.ts` positional order so the call type-checks against the
// generated sdk. AST-native via `ts.factory`.

import type { ApiModel, OperationModel } from '../intermediate-representation/model.js';
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
  sdkCall,
  sdkNamedImport,
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
          factory.createPropertyAssignment(
            'queryFn',
            arrow([], sdkCall(op, opts.argsStyle, 'vars', true))
          ),
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
  const mutationFn = arrow(
    inputs ? [varsParam(op)] : [],
    sdkCall(op, opts.argsStyle, 'vars', false)
  );

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
 * query op), then the shared sdk named import.
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
  const sdkImport = sdkNamedImport(ops, opts.sdkModule, hasQuery);
  return hasQuery ? [tanstack, sdkImport] : [sdkImport];
}
