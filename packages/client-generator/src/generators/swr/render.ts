// Emits an idiomatic SWR module wrapping the sdk operation functions. Per query
// operation (GET/HEAD) a `<op>Key(vars)` tuple factory + a `use<Op>(vars, init?)`
// hook returning `useSWR(key, fetcher)`; per mutation (everything else) a
// `use<Op>()` hook returning `useSWRMutation(key, (key, { arg }) => <op>(arg))`.
// The fetcher forwards args per the configured args style (grouped `<op>(vars, init)`
// or flat `<op>(vars.petId, …, init)`) via the shared `operationSignature`, so the
// call type-checks against the generated sdk.
// `swr`/`swr/mutation` are the consumer's peer; the sdk stays dependency-free.
// Source-text templates throughout.

import { pascalCase } from '../../emitters/support.js';
import {
  hasInputs,
  isQuery,
  sdkCallText,
  sdkNamedImportText,
  variablesName,
  wrappableOperations,
} from '../../emitters/wrapper-support.js';
import type { ApiModel, OperationModel } from '../../intermediate-representation/model.js';

export type SwrOptions = {
  /** Import specifier for the sdk entry the operation functions/types live in. */
  sdkModule: string;
  /** How the sdk function takes its inputs — must match the generated client. */
};

/** Render the full SWR module source. `''` when there are no wrappable operations. */
export function renderSwrModule(model: ApiModel, opts: SwrOptions): string {
  const ops = wrappableOperations(model, 'swr');
  if (ops.length === 0) return '';
  const hasQuery = ops.some(isQuery);
  const hasMutation = ops.some((op) => !isQuery(op));
  const blocks = [
    ...(hasQuery ? ['import useSWR from "swr";'] : []),
    ...(hasMutation ? ['import useSWRMutation from "swr/mutation";'] : []),
    sdkNamedImportText(ops, opts.sdkModule, hasQuery),
    ...ops.flatMap((op) => (isQuery(op) ? queryBlocks(op) : [mutationBlock(op)])),
  ];
  return blocks.join('\n\n');
}

/** An exported `function use<Op>(<params>) { return <expr>; }` declaration. */
function hookBlock(op: OperationModel, params: string, expr: string): string {
  return `export function use${pascalCase(op.name)}(${params}) {\n    return ${expr};\n}`;
}

/** A query op's `<op>Key` factory + `use<Op>` hook calling `useSWR`. */
function queryBlocks(op: OperationModel): string[] {
  const inputs = hasInputs(op);
  const keyParams = inputs ? `vars: ${variablesName(op)}` : '';
  const keyElements = inputs
    ? `[${JSON.stringify(op.name)}, vars]`
    : `[${JSON.stringify(op.name)}]`;
  const key = `export const ${op.name}Key = (${keyParams}) => ${keyElements} as const;`;
  const keyCall = `${op.name}Key(${inputs ? 'vars' : ''})`;
  const useSwr = `useSWR(${keyCall}, () => ${sdkCallText(op, 'vars', true)})`;
  // The throw-only `envelope` option is excluded — cached data must stay the plain body.
  const params = inputs
    ? `vars: ${variablesName(op)}, init?: Omit<RequestOptions, "envelope">`
    : 'init?: Omit<RequestOptions, "envelope">';
  return [key, hookBlock(op, params, useSwr)];
}

/** A mutation op's `use<Op>` hook calling `useSWRMutation`. */
function mutationBlock(op: OperationModel): string {
  // `(_key: string, { arg }: { arg: <Op>Variables }) => <op>(…arg)` when the op has
  // inputs; a no-arg `() => <op>()` when it has none (`arg` would be unused).
  const trigger = hasInputs(op)
    ? `(_key: string, { arg }: {\n        arg: ${variablesName(op)};\n    }) => ${sdkCallText(op, 'arg', false)}`
    : `() => ${sdkCallText(op, 'arg', false)}`;
  const useSwrMutation = `useSWRMutation(${JSON.stringify(op.name)}, ${trigger})`;
  return hookBlock(op, '', useSwrMutation);
}
