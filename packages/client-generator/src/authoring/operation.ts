// Language-neutral operation-shape helpers: the questions every generator asks of an
// operation before deciding what to emit — which response is the JSON success, whether it
// streams, whether the body is multipart. One answer each, so two generators cannot
// disagree about the same operation.

import type {
  ApiModel,
  OperationModel,
  ResponseBodyModel,
  SchemaModel,
  ServerModel,
} from '../intermediate-representation/model.js';
import { schemaAtPointer } from './schema.js';

/** The schema of the operation's primary JSON success response, if it has one. */
export function jsonSuccessSchema(op: OperationModel): SchemaModel | undefined {
  return op.successResponses.find((response) => response.contentType.toLowerCase().includes('json'))
    ?.schema;
}

/** The `text/event-stream` success response — present exactly when the operation streams. */
export function sseResponse(op: OperationModel): ResponseBodyModel | undefined {
  return op.successResponses.find((response) =>
    response.contentType.toLowerCase().includes('text/event-stream')
  );
}

/** Whether the request body is multipart (any `multipart/*` content type). */
export function isMultipartBody(op: OperationModel): boolean {
  return op.requestBody?.contentType.toLowerCase().includes('multipart') ?? false;
}

/** One piece of a parsed server-URL template: literal text, or a declared variable's name. */
export type ServerUrlPart = { kind: 'literal'; value: string } | { kind: 'variable'; name: string };

/**
 * A server's URL template as parts a generator concatenates in its own syntax:
 * `https://{region}.api.example.com/v1` → literal, variable `region`, literal. A variable
 * the server does not declare has nothing to substitute, so its placeholder stays literal
 * text and remains visible in the generated code.
 */
export function serverUrlParts(server: ServerModel): ServerUrlPart[] {
  const declared = new Set(server.variables.map((variable) => variable.name));
  const parts: ServerUrlPart[] = [];
  let literal = '';
  let rest = server.url;
  const template = /\{([^{}]+)\}/;
  for (let match = template.exec(rest); match !== null; match = template.exec(rest)) {
    literal += rest.slice(0, match.index);
    if (declared.has(match[1])) {
      if (literal !== '') parts.push({ kind: 'literal', value: literal });
      literal = '';
      parts.push({ kind: 'variable', name: match[1] });
    } else {
      literal += match[0];
    }
    rest = rest.slice(match.index + match[0].length);
  }
  literal += rest;
  if (literal !== '' || parts.length === 0) parts.push({ kind: 'literal', value: literal });
  return parts;
}

/** One resolved security requirement: the scheme's key, kind, and (for apiKey) placement. */
export type SecurityRequirement =
  | { scheme: string; kind: 'bearer' | 'basic' }
  | { scheme: string; kind: 'apiKey'; name: string; in: 'header' | 'query' | 'cookie' };

/**
 * The operation's security as OR-alternatives of AND-sets, denormalized against the
 * declared schemes — the shape every generated runtime's auth resolver consumes. A key that
 * names no declared scheme is dropped, and an alternative that ends up empty with it.
 * Generators print this in their own literal syntax; the mapping itself has one answer.
 */
export function securityRequirements(
  op: OperationModel,
  model: Pick<ApiModel, 'securitySchemes'>
): SecurityRequirement[][] {
  return op.security
    .map((alternative) =>
      alternative.flatMap((key): SecurityRequirement[] => {
        const scheme = model.securitySchemes.find((candidate) => candidate.key === key);
        if (scheme === undefined) return [];
        if (scheme.kind === 'bearer' || scheme.kind === 'basic') {
          return [{ scheme: key, kind: scheme.kind }];
        }
        if (scheme.kind === 'apiKeyHeader') {
          return [{ scheme: key, kind: 'apiKey', name: scheme.headerName, in: 'header' }];
        }
        if (scheme.kind === 'apiKeyQuery') {
          return [{ scheme: key, kind: 'apiKey', name: scheme.paramName, in: 'query' }];
        }
        return [{ scheme: key, kind: 'apiKey', name: scheme.cookieName, in: 'cookie' }];
      })
    )
    .filter((alternative) => alternative.length > 0);
}

/**
 * The element type of a paginated operation's items: resolve the rule's `items` pointer to
 * the items ARRAY, then take its raw element — a `ref` element keeps its class name (a
 * deref'd result would hydrate as plain data). Undefined when the pointer misses or the
 * target is not an array.
 */
export function paginationItemSchema(
  pageSchema: SchemaModel | undefined,
  itemsPointer: string | undefined,
  model: ApiModel
): SchemaModel | undefined {
  if (pageSchema === undefined || itemsPointer === undefined) return undefined;
  const itemsArray = schemaAtPointer(pageSchema, itemsPointer, model);
  return itemsArray?.kind === 'array' ? itemsArray.items : undefined;
}
