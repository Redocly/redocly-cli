import type { OperationModel, SchemaModel } from './model.js';

/**
 * Collect the names of every top-level (named) schema a `SchemaModel` references,
 * recursing through the structural kinds (array items, record values, object
 * properties, union/intersection members) down to each `ref`.
 *
 * Used by multi-file output writers to emit a precise
 * `import type { … } from './…schemas'` header — only the names actually
 * referenced, so the emitted file type-checks cleanly under `noUnusedLocals`.
 *
 * Insertion order is preserved (and deduped) so import lists are deterministic.
 * Scalars, literals, enums, `null`, and `unknown` reference nothing.
 */
export function collectSchemaRefs(schema: SchemaModel, into: Set<string> = new Set()): Set<string> {
  switch (schema.kind) {
    case 'ref':
      into.add(schema.name);
      break;
    case 'omit':
      // `Omit<Base, …>` still references the named base type.
      into.add(schema.base);
      break;
    case 'array':
      collectSchemaRefs(schema.items, into);
      break;
    case 'record':
      collectSchemaRefs(schema.value, into);
      break;
    case 'object':
      for (const property of schema.properties) collectSchemaRefs(property.schema, into);
      break;
    case 'union':
    case 'intersection':
      for (const member of schema.members) collectSchemaRefs(member, into);
      break;
  }
  return into;
}

/**
 * Collect every named schema referenced by an operation's signature: its path,
 * query, and header params, its request body, and its success responses. Error
 * responses are walked only under `errorMode: 'result'`, since that is the only
 * mode that emits the `<Op>Error` union that references them — in `throw` mode the
 * error bodies are never named, so importing them would trip `noUnusedLocals`.
 * This is exactly the set of type imports an endpoints file needs from the schemas
 * module.
 */
export function collectOperationRefs(
  op: OperationModel,
  errorMode: 'throw' | 'result' = 'throw'
): Set<string> {
  const into = new Set<string>();
  for (const param of op.pathParams) collectSchemaRefs(param.schema, into);
  for (const param of op.queryParams) collectSchemaRefs(param.schema, into);
  for (const param of op.headerParams) collectSchemaRefs(param.schema, into);
  if (op.requestBody) collectSchemaRefs(op.requestBody.schema, into);
  for (const response of op.successResponses) {
    collectSchemaRefs(response.schema, into);
    if (response.itemSchema) collectSchemaRefs(response.itemSchema, into);
  }
  if (errorMode === 'result')
    for (const response of op.errorResponses) collectSchemaRefs(response.schema, into);
  return into;
}
