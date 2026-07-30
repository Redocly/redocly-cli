// Emits an idiomatic SWR module wrapping the sdk operation functions. Per query
// operation (GET/HEAD) a `<op>Key(vars)` tuple factory + a `use<Op>(vars, init?)`
// hook returning `useSWR(key, fetcher)`; per mutation (everything else) a
// `use<Op>()` hook returning `useSWRMutation(key, (key, { arg }) => <op>(arg))`.
// The fetcher forwards args per the configured args style (grouped `<op>(vars, init)`
// or flat `<op>(vars.petId, …, init)`) via the shared `operationSignature`, so the
// call type-checks against the generated sdk.
// `swr`/`swr/mutation` are the consumer's peer; the sdk stays dependency-free.
// AST-native via `ts.factory`.

import type { ApiModel, OperationModel } from '../intermediate-representation/model.js';
import { pascalCase } from './support.js';
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
  variablesName,
  varsParam,
  wrappableOperations,
} from './wrapper-support.js';

const { factory } = ts;

export type SwrOptions = {
  /** Import specifier for the sdk entry the operation functions/types live in. */
  sdkModule: string;
  /** How the sdk function takes its inputs — must match the generated client. */
  argsStyle: 'flat' | 'grouped';
};

/** Render the full SWR module source. `''` when there are no wrappable operations. */
export function renderSwrModule(model: ApiModel, opts: SwrOptions): string {
  const ops = wrappableOperations(model, 'swr');
  if (ops.length === 0) return '';
  return printStatements(swrStatements(ops, opts));
}

/** The SWR module statements: the import header followed by per-op hooks. */
function swrStatements(ops: OperationModel[], opts: SwrOptions): ts.Statement[] {
  const hasQuery = ops.some(isQuery);
  const hasMutation = ops.some((op) => !isQuery(op));
  const statements: ts.Statement[] = [];
  for (const op of ops) {
    statements.push(...(isQuery(op) ? queryStatements(op, opts) : [mutationStatement(op, opts)]));
  }
  return [...importHeader(ops, opts, hasQuery, hasMutation), ...statements];
}

/** An exported `function use<Op>(<params>) { <body> }` declaration. */
function exportHook(
  op: OperationModel,
  params: ts.ParameterDeclaration[],
  ret: ts.Expression
): ts.Statement {
  const name = `use${pascalCase(op.name)}`;
  return factory.createFunctionDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    undefined,
    name,
    undefined,
    params,
    undefined,
    factory.createBlock([factory.createReturnStatement(ret)], true)
  );
}

/** A query op's `<op>Key` factory + `use<Op>` hook calling `useSWR`. */
function queryStatements(op: OperationModel, opts: SwrOptions): ts.Statement[] {
  const inputs = hasInputs(op);
  const keyId = factory.createStringLiteral(op.name);
  const keyParams = inputs ? [varsParam(op)] : [];
  const keyElements = inputs ? [keyId, factory.createIdentifier('vars')] : [keyId];
  const key = exportConst(`${op.name}Key`, arrow(keyParams, constArray(keyElements)));

  const keyCall = factory.createCallExpression(
    factory.createIdentifier(`${op.name}Key`),
    undefined,
    inputs ? [factory.createIdentifier('vars')] : []
  );
  const useSwr = factory.createCallExpression(factory.createIdentifier('useSWR'), undefined, [
    keyCall,
    arrow([], sdkCall(op, opts.argsStyle, 'vars', true)),
  ]);

  const params = inputs ? [varsParam(op), initParam()] : [initParam()];
  return [key, exportHook(op, params, useSwr)];
}

/** A mutation op's `use<Op>` hook calling `useSWRMutation`. */
function mutationStatement(op: OperationModel, opts: SwrOptions): ts.Statement {
  const inputs = hasInputs(op);
  const key = factory.createStringLiteral(op.name);

  // `(_key: string, { arg }: { arg: <Op>Variables }) => <op>(…arg)` when the op has inputs;
  // a no-arg `() => <op>()` when it has none (`arg` would be unused).
  const trigger = inputs
    ? triggerWithArg(op, opts)
    : arrow([], sdkCall(op, opts.argsStyle, 'arg', false));
  const useSwrMutation = factory.createCallExpression(
    factory.createIdentifier('useSWRMutation'),
    undefined,
    [key, trigger]
  );
  return exportHook(op, [], useSwrMutation);
}

/** `(_key: string, { arg }: { arg: <Op>Variables }) => <op>(…arg)`. */
function triggerWithArg(op: OperationModel, opts: SwrOptions): ts.ArrowFunction {
  const keyParam = factory.createParameterDeclaration(
    undefined,
    undefined,
    '_key',
    undefined,
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
  );
  const argParam = factory.createParameterDeclaration(
    undefined,
    undefined,
    factory.createObjectBindingPattern([factory.createBindingElement(undefined, undefined, 'arg')]),
    undefined,
    factory.createTypeLiteralNode([
      factory.createPropertySignature(
        undefined,
        'arg',
        undefined,
        factory.createTypeReferenceNode(variablesName(op))
      ),
    ])
  );
  return arrow([keyParam, argParam], sdkCall(op, opts.argsStyle, 'arg', false));
}

/**
 * The import header: `useSWR` from `swr` (when any query op), `useSWRMutation` from
 * `swr/mutation` (when any mutation op), then the shared sdk named import.
 */
function importHeader(
  ops: OperationModel[],
  opts: SwrOptions,
  hasQuery: boolean,
  hasMutation: boolean
): ts.Statement[] {
  const imports: ts.Statement[] = [];
  if (hasQuery) imports.push(defaultImport('useSWR', 'swr'));
  if (hasMutation) imports.push(defaultImport('useSWRMutation', 'swr/mutation'));
  imports.push(sdkNamedImport(ops, opts.sdkModule, hasQuery));
  return imports;
}

/** `import <name> from "<module>";` (default import). */
function defaultImport(name: string, module: string): ts.Statement {
  return factory.createImportDeclaration(
    undefined,
    factory.createImportClause(false, factory.createIdentifier(name), undefined),
    factory.createStringLiteral(module)
  );
}
