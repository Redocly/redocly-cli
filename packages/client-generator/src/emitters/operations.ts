import type { OperationModel, ParamModel } from '../intermediate-representation/model.js';
import { bodyTypeNode, renderParamsObjectArg, simpleParam } from './operation-types.js';
import type { ModelPagination } from './pagination.js';
import { isSseOp } from './sse.js';
import { ts } from './ts.js';
import { type DateType, schemaToTypeNode } from './types.js';

const { factory } = ts;

/** Error-handling shape of the generated client: throw on non-2xx, or return a result union. */
export type ErrorMode = 'throw' | 'result';

/**
 * How an operation's inputs are passed to the generated call.
 * - `'flat'` (default): path params spread as positional args, then the
 *   `params`/`body`/`headers` slots — one exported sugar arrow per operation.
 * - `'grouped'`: the client methods' own shape — a single `args` object bundling
 *   every input; the sugar is a plain destructure of the client. The per-call
 *   `init: RequestOptions` stays a separate trailing argument in both styles.
 */
export type ArgsStyle = 'flat' | 'grouped';

/**
 * The emit configuration every operation shares. Bundling it into one value keeps
 * it out of the positional parameter lists of the operation emitters (which would
 * otherwise thread the same arguments through every layer, inviting transposition
 * bugs). Per-call structural data (response type, ordered path params, …) stays an
 * explicit argument; only this cross-cutting config travels as `ctx`.
 */
export type EmitContext = {
  argsStyle: ArgsStyle;
  errorMode: ErrorMode;
  dateType: DateType;
  /** Names of every exported schema, used for `<Op>*` alias collision suppression. */
  schemaNames: Set<string>;
  /** Resolved auto-pagination per operation name (absent ⇒ nothing paginates). */
  pagination?: ModelPagination;
};

/**
 * The flat sugar's parameter list: path params spread as positional args (in URL
 * template order), then the `params`/`body`/`headers` slots, ending with the
 * trailing `init: RequestOptions` (`SseOptions` for streams). Optional slots
 * default to `= {}` so trailing arguments can be omitted.
 */
export function renderArgList(
  op: OperationModel,
  orderedPathParams: ParamModel[],
  pathParamIdent: Map<string, string>,
  ctx: EmitContext
): ts.ParameterDeclaration[] {
  const { dateType } = ctx;
  const args: ts.ParameterDeclaration[] = [];
  for (const p of orderedPathParams) {
    args.push(
      simpleParam(pathParamIdent.get(p.name)!, schemaToTypeNode(p.schema, dateType), false)
    );
  }
  if (op.queryParams.length > 0)
    args.push(renderParamsObjectArg('params', op.queryParams, dateType));
  if (op.requestBody) {
    const type = bodyTypeNode(op.requestBody, dateType);
    args.push(
      factory.createParameterDeclaration(
        undefined,
        undefined,
        'body',
        op.requestBody.required ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
        type
      )
    );
  }
  // Operation header params are explicit, typed inputs; security-scheme headers
  // are injected by the runtime and live underneath them.
  if (op.headerParams.length > 0)
    args.push(renderParamsObjectArg('headers', op.headerParams, dateType));
  // SSE ops take per-stream `SseOptions` (reconnect knobs); everyone else the
  // standard per-call `RequestOptions`.
  args.push(
    simpleParam(
      'init',
      factory.createTypeReferenceNode(isSseOp(op) ? 'SseOptions' : 'RequestOptions'),
      true
    )
  );
  return args;
}
