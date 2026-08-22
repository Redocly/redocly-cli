// Package-mode descriptor emission: the identifier plan for a generated module that
// shares scope with the `@redocly/client-generator` wiring, plus the `OPERATIONS`
// descriptor map (`satisfies Record<string, OperationDescriptor>` — the semver skew
// guard against the runtime contract in src/runtime/types.ts). Text templates.

import { securityRequirements } from '../authoring/operation.js';
import {
  allOperations,
  type ApiModel,
  type NamedSchemaModel,
  type OperationModel,
  type SecuritySchemeModel,
} from '../intermediate-representation/model.js';
import { uniqueIdent } from './identifier.js';
import { isTypedMultipart } from './operation-types.js';
import type { ArgsStyle } from './operations.js';
import type { ModelPagination } from './pagination.js';
import { flatInputShape, responseText } from './render-client.js';
import { WIRING_NAMES } from './reserved-names.js';
import { responseHeaderSpecs } from './response-headers.js';
import { isSseOp, sseDataKind } from './sse.js';
import { codeLiteral } from './ts-literal.js';
import { tsJsdoc } from './ts-type.js';
import type { DateType } from './types.js';

/**
 * Operation-name → emitted-identifier plan. The full reserved set (wiring + imported
 * bindings, computed from the model FIRST) is seeded before any operation
 * is sanitized, so collisions rename the operation (`configure` → `configure_2`)
 * deterministically regardless of document order.
 */
export function packageIdents(model: ApiModel): Map<string, string> {
  const used = new Set<string>(WIRING_NAMES);
  const idents = new Map<string, string>();
  for (const op of allOperations(model.services)) idents.set(op.name, uniqueIdent(op.name, used));
  return idents;
}

/** One operation's OperationDescriptor as plain data (only non-default fields present). */
function descriptorValue(
  op: OperationModel,
  schemes: SecuritySchemeModel[],
  dateType: DateType,
  pagination?: ModelPagination,
  schemas: readonly NamedSchemaModel[] = [],
  argsStyle: ArgsStyle = 'grouped'
) {
  const params = [...op.pathParams, ...op.queryParams, ...op.headerParams, ...op.cookieParams].map(
    (p) => ({
      name: p.name,
      in: p.in,
      ...(p.style !== undefined ? { style: p.style } : {}),
      ...(p.explode !== undefined ? { explode: p.explode } : {}),
      ...(p.allowReserved !== undefined ? { allowReserved: p.allowReserved } : {}),
    })
  );
  const security = securityRequirements(op, { securitySchemes: schemes });
  const sse = isSseOp(op);
  const responseKind = sse ? 'sse' : responseText(op.successResponses, dateType).kind;
  const responseHeaders = responseHeaderSpecs(op.successResponseHeaders, schemas);
  return {
    // The spec's operationId, NOT the (possibly renamed) map key: `id` drives middleware
    // targeting (`ctx.operation.id`) and must match inline mode's `operationMetaExpr`.
    // The wire/middleware identity stays the SPEC operationId even when the emitted
    // function name was renamed away from a collision (`configure` → `configure_2`).
    id: op.specName ?? op.name,
    method: op.method.toUpperCase(),
    path: op.path,
    ...(op.tags.length > 0 ? { tags: op.tags } : {}),
    ...(params.length > 0 ? { params } : {}),
    ...(op.requestBody
      ? {
          body: {
            contentType: op.requestBody.contentType,
            ...(isTypedMultipart(op.requestBody) ? { multipart: true } : {}),
          },
        }
      : {}),
    ...(responseKind !== 'json' ? { responseKind } : {}),
    ...(sse ? { sseDataKind: sseDataKind(op) } : {}),
    ...(security.length > 0 ? { security } : {}),
    ...(responseHeaders === undefined ? {} : { responseHeaders }),
    // The resolved spec is already normalized with stable key order (see pagination.ts).
    ...(pagination?.has(op.name) ? { pagination: pagination.get(op.name)!.spec } : {}),
    // A merged call cannot carry one name for two layers, so an operation whose names
    // collide keeps the namespaced shape — its `<Op>Variables` says so, and the runtime
    // has to agree or the typed call would be rejected.
    ...(argsStyle === 'flat' && 'collisions' in flatInputShape(op, schemas)
      ? { argsStyle: 'grouped' }
      : {}),
  };
}

/** `export const OPERATIONS = {…} as const satisfies …` + the derived unions. */
export function renderDescriptors(
  model: ApiModel,
  idents: Map<string, string>,
  dateType: DateType,
  pagination?: ModelPagination,
  argsStyle: ArgsStyle = 'grouped'
): string {
  const ops = allOperations(model.services);
  if (ops.length === 0) return '';
  const entryLines = ops.map((op, index) => {
    const value = codeLiteral(
      descriptorValue(op, model.securitySchemes, dateType, pagination, model.schemas, argsStyle)
    );
    return `    ${idents.get(op.name)!}: ${value}${index === ops.length - 1 ? '' : ','}`;
  });
  const blocks = [
    [
      ...tsJsdoc(
        'The wire-shape descriptor for every operation, keyed by operationId — the data the\n' +
          'runtime routes requests by. Also minification-safe static metadata (method, path,\n' +
          'tags) for cache keys, tracing span names, and request logging.',
        undefined,
        ''
      ),
      'export const OPERATIONS = {',
      ...entryLines,
      '} as const satisfies Record<string, OperationDescriptor>;',
    ].join('\n'),
    'export type OperationId = (typeof OPERATIONS)[keyof typeof OPERATIONS]["id"];',
    'export type OperationPath = (typeof OPERATIONS)[keyof typeof OPERATIONS]["path"];',
  ];
  if (ops.some((op) => op.tags.length > 0)) {
    blocks.push(
      'export type OperationTag = Extract<(typeof OPERATIONS)[keyof typeof OPERATIONS], {\n' +
        '    tags: readonly string[];\n' +
        '}>["tags"][number];'
    );
  }
  return blocks.join('\n\n');
}
