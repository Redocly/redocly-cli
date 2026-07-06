import { resolveAuth } from './auth.js';
import { createClientCore } from './create-client.js';
import { toFormData } from './multipart.js';
import { sse } from './sse.js';
import type {
  Client,
  ClientConfig,
  OperationContext,
  OperationDescriptor,
  OpsShape,
} from './types.js';

/**
 * The public client factory for package-mode generated clients: `createClientCore`
 * with the full capability set wired (multipart, auth, SSE). The capability seam
 * itself stays internal — the future inline assembler wires only what a spec needs.
 * The trailing string params carry the generated literal unions
 * (`OperationId`/`OperationPath`/`OperationTag`) into `ctx.operation` for
 * middleware targeting; their defaults keep spec-independent callers untyped.
 */
export function createClient<
  Ops extends OpsShape,
  Id extends string = string,
  Path extends string = string,
  Tag extends string = string,
>(
  operations: Record<string, OperationDescriptor>,
  config?: ClientConfig<OperationContext<Id, Path, Tag>>
): Client<Ops, OperationContext<Id, Path, Tag>> {
  return createClientCore<Ops, Id, Path, Tag>(operations, config, {
    serializeMultipart: toFormData,
    resolveAuth,
    sse,
  });
}

export { ApiError } from './errors.js';
export { mergeSetup } from './setup.js';
export type * from './types.js';
