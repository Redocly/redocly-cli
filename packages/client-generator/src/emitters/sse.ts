import type {
  OperationModel,
  ResponseBodyModel,
  SchemaModel,
} from '../intermediate-representation/model.js';
import { ts } from './ts.js';
import { type DateType, schemaToTypeNode } from './types.js';

const { factory } = ts;

/** The media type that marks an operation as a Server-Sent Events stream. */
const SSE_CONTENT_TYPE = 'text/event-stream';

/** The event-stream success response of an operation, if it declares one. */
function sseResponse(op: OperationModel): ResponseBodyModel | undefined {
  return op.successResponses.find(
    (r) => r.contentType.split(';')[0].trim().toLowerCase() === SSE_CONTENT_TYPE
  );
}

/** Whether an operation streams Server-Sent Events. */
export function isSseOp(op: OperationModel): boolean {
  return sseResponse(op) !== undefined;
}

/** The per-event schema: `itemSchema` → the response `schema` → undefined (typeless slots skipped). */
function eventSchema(op: OperationModel): SchemaModel | undefined {
  const r = sseResponse(op);
  if (!r) return undefined;
  if (r.itemSchema && r.itemSchema.kind !== 'unknown') return r.itemSchema;
  if (r.schema.kind !== 'unknown') return r.schema;
  return undefined;
}

/** The TS type of a streamed event payload (`string` when no schema is declared). */
export function sseEventType(op: OperationModel, dateType: DateType): ts.TypeNode {
  const schema = eventSchema(op);
  return schema
    ? schemaToTypeNode(schema, dateType)
    : factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}

/** Whether the streamed `data:` payload should be `JSON.parse`d (`'json'`) or passed raw (`'text'`). */
export function sseDataKind(op: OperationModel): 'json' | 'text' {
  const schema = eventSchema(op);
  if (!schema) return 'text';
  return schema.kind === 'object' ||
    schema.kind === 'ref' ||
    schema.kind === 'array' ||
    schema.kind === 'record' ||
    schema.kind === 'union' ||
    schema.kind === 'intersection'
    ? 'json'
    : 'text';
}
