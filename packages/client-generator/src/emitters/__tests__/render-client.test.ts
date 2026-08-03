import type { ApiModel, OperationModel } from '../../intermediate-representation/model.js';
import { opsInterfaceStatements, packageIdents } from '../descriptor.js';
import { renderOperationAliases, sseAliases } from '../operation-aliases.js';
import { operationSignature } from '../operation-signature.js';
import { computeResponse, errorTypeNodes } from '../operation-types.js';
import type { EmitContext } from '../operations.js';
import { resolveModelPagination } from '../pagination.js';
import { renderAliases, renderOpsType } from '../render-client.js';
import { isSseOp } from '../sse.js';
import { pascalCase } from '../support.js';
import { printStatements } from '../ts.js';

// Printer-equivalence for the Ops type + `<Op>*` alias cluster — the deepest type
// surface of the sdk. The fixture exercises: path/query/header/cookie params with
// JSDoc, required and optional slots, multipart and urlencoded bodies, error
// responses (result mode), SSE with a typed payload, pagination (item/page members),
// alias suppression on schema collisions, and a renamed path-param binding.
const STRING = { kind: 'scalar', scalar: 'string' } as const;
const MODEL = {
  title: 'Cafe',
  version: '1.0.0',
  services: [
    {
      name: 'Default',
      operations: [
        {
          name: 'listOrders',
          specName: 'listOrders',
          method: 'get',
          path: '/orders',
          tags: [],
          pathParams: [],
          queryParams: [
            {
              name: 'after',
              in: 'query',
              required: false,
              description: 'Cursor of the page.',
              schema: STRING,
            },
            {
              name: 'page-size',
              in: 'query',
              required: true,
              schema: { kind: 'scalar', scalar: 'integer', metadata: { minimum: 1 } },
            },
          ],
          headerParams: [{ name: 'X-Trace', in: 'header', required: false, schema: STRING }],
          cookieParams: [{ name: 'session', in: 'cookie', required: true, schema: STRING }],
          security: [],
          paginationExtension: {
            style: 'cursor',
            cursorParam: 'after',
            nextCursor: '/next',
            items: '/items',
          },
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: {
                kind: 'object',
                properties: [
                  {
                    name: 'items',
                    schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
                    required: true,
                  },
                  { name: 'next', schema: STRING, required: false },
                ],
              },
            },
          ],
          errorResponses: [
            {
              status: '400',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Problem' },
            },
            {
              status: '500',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Problem' },
            },
          ],
        },
        {
          // `params` as a path param forces the `<name>_2` binding rename.
          name: 'getOrder',
          specName: 'getOrder',
          method: 'get',
          path: '/orders/{params}',
          tags: [],
          pathParams: [
            {
              name: 'params',
              in: 'path',
              required: true,
              description: 'Order id.',
              schema: STRING,
            },
          ],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
        {
          // `SearchResult` schema exists — the `<Op>Result` alias is suppressed.
          name: 'search',
          specName: 'search',
          method: 'post',
          path: '/search',
          tags: [],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'application/x-www-form-urlencoded',
            required: false,
            schema: { kind: 'object', properties: [] },
          },
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'SearchResult' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'uploadPhoto',
          specName: 'uploadPhoto',
          method: 'post',
          path: '/photos',
          tags: [],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'multipart/form-data',
            required: true,
            schema: {
              kind: 'object',
              properties: [
                {
                  name: 'photo',
                  schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } },
                  required: true,
                },
                { name: 'caption', schema: STRING, required: false },
              ],
            },
          },
          successResponses: [],
          errorResponses: [],
        },
        {
          name: 'streamEvents',
          specName: 'streamEvents',
          method: 'get',
          path: '/events',
          tags: [],
          pathParams: [],
          queryParams: [{ name: 'channel', in: 'query', required: false, schema: STRING }],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'text/event-stream',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
      ],
    },
  ],
  schemas: [
    {
      name: 'Order',
      schema: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
    },
    { name: 'Problem', schema: { kind: 'object', properties: [] } },
    { name: 'SearchResult', schema: { kind: 'object', properties: [] } },
  ],
  securitySchemes: [],
} as unknown as ApiModel;

function makeCtx(errorMode: 'throw' | 'result'): EmitContext {
  return {
    argsStyle: 'flat',
    errorMode,
    dateType: 'string',
    schemaNames: new Set(MODEL.schemas.map((s) => s.name)),
    pagination: resolveModelPagination(MODEL, undefined),
  };
}

/** The AST alias cluster exactly as client-assembly builds it (package mode). */
function astAliases(op: OperationModel, ctx: EmitContext): string {
  const { pathParams } = operationSignature(op);
  const ordered = pathParams.map((p) => p.param);
  const identMap = new Map(pathParams.map((p) => [p.param.name, p.ident]));
  if (isSseOp(op)) return printStatements(sseAliases(op, ordered, identMap, ctx, 'wire'));
  const { responseType } = computeResponse(op.successResponses, ctx.dateType);
  const errorMembers =
    ctx.errorMode === 'result' ? errorTypeNodes(op.errorResponses, ctx.dateType) : [];
  const errorAlias = errorMembers.length > 0 ? `${pascalCase(op.name)}Error` : '';
  return printStatements(
    renderOperationAliases(
      op,
      responseType,
      ordered,
      identMap,
      errorAlias,
      errorMembers,
      ctx,
      true,
      'wire'
    )
  );
}

describe.each(['throw', 'result'] as const)('printer equivalence (%s mode)', (errorMode) => {
  const ctx = makeCtx(errorMode);
  const idents = packageIdents(MODEL);

  it('renderOpsType matches printStatements(opsInterfaceStatements(…))', () => {
    expect(renderOpsType(MODEL, idents, ctx)).toBe(
      printStatements(opsInterfaceStatements(MODEL, idents, ctx))
    );
  });

  it.each(MODEL.services[0].operations.map((op) => [op.name, op] as const))(
    'renderAliases(%s) matches the AST alias cluster',
    (_name, op) => {
      expect(renderAliases(op, ctx, 'wire')).toBe(astAliases(op, ctx));
    }
  );
});
