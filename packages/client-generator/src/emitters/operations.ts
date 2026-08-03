import type { ModelPagination } from './pagination.js';
import type { DateType } from './types.js';

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
