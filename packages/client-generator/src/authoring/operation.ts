// Language-neutral operation-shape helpers: the questions every generator asks of an
// operation before deciding what to emit — which response is the JSON success, whether it
// streams, whether the body is multipart. One answer each, so two generators cannot
// disagree about the same operation.

import type {
  OperationModel,
  ResponseBodyModel,
  SchemaModel,
} from '../intermediate-representation/model.js';

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
