// TypeScript type/parameter builders shared by the operation emitter and the operation-alias
// builders: turn an operation's params / body / responses into `ts` type and parameter nodes.
// Leaf module — depends only on the IR types and the emit foundation, never back on operations.ts.

import type {
  ParamModel,
  RequestBodyModel,
  ResponseBodyModel,
} from '../intermediate-representation/model.js';
import { safeIdent } from './identifier.js';
import { jsdocText } from './jsdoc.js';
import { jsdoc, printNodes, ts } from './ts.js';
import { type DateType, schemaToTypeNode } from './types.js';

const { factory } = ts;

/** A `<name>: <type>` parameter, defaulting to `= {}` when `withDefault`. */
export function simpleParam(
  name: string,
  type: ts.TypeNode,
  withDefault: boolean
): ts.ParameterDeclaration {
  return factory.createParameterDeclaration(
    undefined,
    undefined,
    name,
    undefined,
    type,
    withDefault ? factory.createObjectLiteralExpression([], false) : undefined
  );
}

/**
 * A `<slot>: { … }` argument bundling `params` into one object, each property
 * carrying its own JSDoc (description + metadata). Defaults to `= {}` when every
 * property is optional. Shared by the query `params` and the operation `headers`
 * slots, which have the identical layout.
 */
export function renderParamsObjectArg(
  slot: string,
  params: ParamModel[],
  dateType: DateType
): ts.ParameterDeclaration {
  return simpleParam(slot, paramsTypeLiteral(params, dateType), !params.some((p) => p.required));
}

/** The `{ … }` type literal for a params object (query or headers), with per-prop JSDoc. */
export function paramsTypeLiteral(params: ParamModel[], dateType: DateType): ts.TypeLiteralNode {
  return factory.createTypeLiteralNode(
    params.map((p) => {
      const sig = factory.createPropertySignature(
        undefined,
        propertyKey(safeIdent(p.name)),
        p.required ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
        schemaToTypeNode(p.schema, dateType)
      );
      const doc = jsdocText(p.description, p.schema.metadata);
      return doc === undefined ? sig : jsdoc(sig, doc);
    })
  );
}

/** A bare identifier key when valid, a quoted string-literal key otherwise. */
export function propertyKey(safe: string): ts.PropertyName {
  return safe.startsWith('"')
    ? factory.createStringLiteral(JSON.parse(safe) as string)
    : factory.createIdentifier(safe);
}

/**
 * A multipart body whose schema is a concrete object — the case worth typing. Such a body
 * is emitted as its object shape (binary fields → `Blob`); the runtime serializes it to
 * `FormData` (`runtime/multipart.ts`) after the onRequest chain. Multipart bodies with a
 * non-object schema can't be typed field-by-field, so they keep the raw `FormData` escape hatch.
 */
export function isTypedMultipart(rb: RequestBodyModel): boolean {
  return rb.contentType === 'multipart/form-data' && rb.schema.kind === 'object';
}

/** The request-body TS type: special wrapper types per content-type, else the schema. */
export function bodyTypeNode(rb: RequestBodyModel, dateType: DateType): ts.TypeNode {
  if (isTypedMultipart(rb)) return schemaToTypeNode(rb.schema, dateType);
  switch (rb.contentType) {
    case 'multipart/form-data':
      return factory.createTypeReferenceNode('FormData');
    case 'application/x-www-form-urlencoded':
      return factory.createTypeReferenceNode('URLSearchParams');
    case 'application/octet-stream':
      return factory.createUnionTypeNode([
        factory.createTypeReferenceNode('Blob'),
        factory.createTypeReferenceNode('ArrayBuffer'),
      ]);
    default:
      return schemaToTypeNode(rb.schema, dateType);
  }
}

/** The deduped error-response body type nodes (by printed form), or `[]` when none. */
export function errorTypeNodes(responses: ResponseBodyModel[], dateType: DateType): ts.TypeNode[] {
  const seen = new Set<string>();
  const nodes: ts.TypeNode[] = [];
  for (const r of responses) {
    const node = schemaToTypeNode(r.schema, dateType);
    const key = printNodes([node]);
    if (seen.has(key)) continue;
    seen.add(key);
    nodes.push(node);
  }
  return nodes;
}

export function computeResponse(
  responses: ResponseBodyModel[],
  dateType: DateType
): {
  responseType: ts.TypeNode;
  responseKind: 'json' | 'blob' | 'text' | 'void';
} {
  if (responses.length === 0)
    return {
      responseType: factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      responseKind: 'void',
    };

  // Prefer JSON; fall back to other content types.
  const jsonResponse = responses.find((r) => r.contentType.toLowerCase().includes('json'));
  if (jsonResponse) {
    return { responseType: schemaToTypeNode(jsonResponse.schema, dateType), responseKind: 'json' };
  }
  // No JSON — handle binary/text gracefully.
  const nodes: ts.TypeNode[] = [];
  const seen = new Set<string>();
  let hasBinary = false;
  let hasText = false;
  for (const r of responses) {
    let node: ts.TypeNode;
    if (r.contentType.startsWith('image/') || r.contentType === 'application/octet-stream') {
      node = factory.createTypeReferenceNode('Blob');
      hasBinary = true;
    } else if (r.contentType.startsWith('text/')) {
      node = factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      hasText = true;
    } else {
      node = schemaToTypeNode(r.schema, dateType);
    }
    const key = printNodes([node]);
    if (seen.has(key)) continue;
    seen.add(key);
    nodes.push(node);
  }
  // `nodes` is guaranteed non-empty here: each iteration above always builds one.
  const responseType = nodes.length === 1 ? nodes[0] : factory.createUnionTypeNode(nodes);
  const responseKind: 'blob' | 'text' | 'json' = hasBinary ? 'blob' : hasText ? 'text' : 'json';
  return { responseType, responseKind };
}
