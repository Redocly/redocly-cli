// The flat sugar signatures (`renderArgList`) and the `<Op>*` operation aliases as
// they appear in the descriptor-wired single-file client. The wiring itself (Ops,
// OPERATIONS, client, auth sugar) is covered in client-assembly.test.ts; here the
// focus is one operation's developer-facing surface.
import type { OperationModel, RequestBodyModel } from '../../intermediate-representation/model.js';
import { emitClientSingleFile } from '../client-assembly.js';
import { SCALAR, apiModel, emitWithOp, namedSchema, operation, param } from './fixtures.js';

/** Emit a result-mode single-file client whose only operation is `operation(op)`. */
function emitResult(op: Partial<OperationModel>, schemas: string[] = []): string {
  return emitClientSingleFile(
    apiModel({
      schemas: schemas.map((name) => namedSchema(name, { kind: 'object', properties: [] })),
      services: [{ name: 'Default', operations: [operation(op)] }],
    }),
    { errorMode: 'result' }
  );
}

describe('flat sugar — argument-list permutations (renderArgList)', () => {
  it('renders an operation with no inputs: only the trailing init, forwarding empty args', () => {
    const out = emitWithOp({});
    expect(out).toContain('export const op = (init: RequestOptions = {}) => client.op({}, init);');
  });

  it('orders path params by their position in the URL template, not in pathParams[]', () => {
    const out = emitWithOp({
      name: 'getNested',
      path: '/x/{first}/y/{second}',
      pathParams: [
        param('second', 'path', true, { kind: 'scalar', scalar: 'number' }),
        param('first', 'path', true, { kind: 'scalar', scalar: 'string' }),
      ],
    });
    expect(out).toContain(
      'export const getNested = (first: string, second: number, init: RequestOptions = {}) => client.getNested({ first, second }, init);'
    );
  });

  it('skips path params that are declared but missing from the URL template', () => {
    const out = emitWithOp({ path: '/x', pathParams: [param('ghost', 'path', true)] });
    expect(out).not.toContain('ghost: string');
  });

  it('sanitizes a non-identifier path param name into a safe argument, keyed by wire name', () => {
    const out = emitWithOp({
      name: 'getPet',
      path: '/pets/{pet-id}',
      pathParams: [param('pet-id', 'path', true)],
    });
    expect(out).toContain(
      'export const getPet = (pet_id: string, init: RequestOptions = {}) => client.getPet({ "pet-id": pet_id }, init);'
    );
  });

  it('prefixes digit-leading and reserved-word path param names with `_`', () => {
    expect(emitWithOp({ path: '/x/{2fa}', pathParams: [param('2fa', 'path', true)] })).toContain(
      '_2fa: string'
    );
    expect(emitWithOp({ path: '/x/{new}', pathParams: [param('new', 'path', true)] })).toContain(
      '_new: string'
    );
  });

  it('disambiguates path param names that sanitize to the same identifier', () => {
    const out = emitWithOp({
      path: '/x/{a-b}/{a.b}',
      pathParams: [param('a-b', 'path', true), param('a.b', 'path', true)],
    });
    expect(out).toContain('a_b: string');
    expect(out).toContain('a_b_2: string');
  });

  it('emits `params = {}` default when all query params are optional', () => {
    const out = emitWithOp({
      queryParams: [param('q', 'query', false), param('r', 'query', false)],
    });
    expect(out).toMatch(/params: \{\n {4}q\?: string;\n {4}r\?: string;\n\} = \{\}/);
  });

  it('makes `params` required when at least one query param is required', () => {
    const out = emitWithOp({
      queryParams: [param('q', 'query', true), param('r', 'query', false)],
    });
    expect(out).toMatch(/params: \{\n {4}q: string;\n {4}r\?: string;\n\}, init/);
  });

  it('produces `body: T` for required JSON bodies and `body?: T` for optional ones', () => {
    const required: RequestBodyModel = {
      contentType: 'application/json',
      schema: { kind: 'ref', name: 'Pet' },
      required: true,
    };
    expect(emitWithOp({ requestBody: required })).toContain('body: Pet');
    const optional: RequestBodyModel = {
      contentType: 'application/json',
      schema: SCALAR,
      required: false,
    };
    expect(emitWithOp({ requestBody: optional })).toContain('body?: string');
  });

  it('uses raw `FormData` for a non-object multipart body', () => {
    const body: RequestBodyModel = {
      contentType: 'multipart/form-data',
      schema: { kind: 'unknown' },
      required: true,
    };
    expect(emitWithOp({ requestBody: body })).toContain('body: FormData');
  });

  it('uses `URLSearchParams` for urlencoded bodies', () => {
    const body: RequestBodyModel = {
      contentType: 'application/x-www-form-urlencoded',
      schema: { kind: 'object', properties: [] },
      required: true,
    };
    expect(emitWithOp({ requestBody: body })).toContain('body: URLSearchParams');
  });

  it('uses `Blob | ArrayBuffer` for octet-stream bodies', () => {
    const body: RequestBodyModel = {
      contentType: 'application/octet-stream',
      schema: SCALAR,
      required: true,
    };
    expect(emitWithOp({ requestBody: body })).toContain('body: Blob | ArrayBuffer');
  });

  it('emits header params as a typed `headers` slot, forwarded to the client method', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Api-Version', 'header', true)],
    });
    expect(out).toMatch(/headers: \{\n {4}"X-Api-Version": string;\n\}, init/);
    expect(out).toContain('=> client.getThing({ headers }, init);');
  });

  it('defaults the `headers` slot to `= {}` when all header params are optional', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Trace', 'header', false)],
    });
    expect(out).toMatch(/headers: \{\n {4}"X-Trace"\?: string;\n\} = \{\}/);
  });

  it('renders per-param JSDoc (description + schema metadata) above sugar params', () => {
    const out = emitWithOp({
      name: 'listPets',
      queryParams: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Page size.',
          schema: { kind: 'scalar', scalar: 'integer', metadata: { minimum: 1, maximum: 100 } },
        },
      ],
    });
    expect(out).toMatch(/Page size\.[\s\S]*@minimum 1[\s\S]*@maximum 100[\s\S]*limit\?: number;/);
  });

  it('the SSE sugar takes `SseOptions`; regular ops take `RequestOptions`', () => {
    const out = emitClientSingleFile(
      apiModel({
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'streamMessages',
                path: '/stream',
                successResponses: [
                  { contentType: 'text/event-stream', status: 200, schema: { kind: 'unknown' } },
                ],
              }),
              operation({ name: 'listThings', path: '/things' }),
            ],
          },
        ],
      })
    );
    expect(out).toContain(
      'export const streamMessages = (init: SseOptions = {}) => client.streamMessages({}, init);'
    );
    expect(out).toContain(
      'export const listThings = (init: RequestOptions = {}) => client.listThings({}, init);'
    );
  });
});

describe('operation type aliases (*Result / *Params / *Body / *Headers / *Variables)', () => {
  it('emits <PascalCaseOpName>Result for every operation, even the trivial void ones', () => {
    expect(emitWithOp({ name: 'ping' })).toContain('export type PingResult = void;');
  });

  it('uses the response type and PascalCases a lowercase operationId', () => {
    const out = emitWithOp({
      name: 'getPet',
      successResponses: [
        { contentType: 'application/json', status: 200, schema: { kind: 'ref', name: 'Pet' } },
      ],
    });
    expect(out).toContain('export type GetPetResult = Pet;');
  });

  it('emits *Params/*Body/*Headers/*Variables per input kind, in a stable order', () => {
    const out = emitWithOp({
      name: 'updateOrder',
      path: '/orders/{orderId}',
      pathParams: [param('orderId', 'path', true)],
      queryParams: [param('include', 'query', false)],
      headerParams: [param('X-Trace', 'header', false)],
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'Order' },
        required: true,
      },
      successResponses: [
        { contentType: 'application/json', status: 200, schema: { kind: 'ref', name: 'Order' } },
      ],
    });
    const names = [
      'UpdateOrderResult',
      'UpdateOrderParams',
      'UpdateOrderBody',
      'UpdateOrderHeaders',
      'UpdateOrderVariables',
    ];
    let last = -1;
    for (const name of names) {
      const idx = out.indexOf(`export type ${name}`);
      expect(idx, `${name} should appear after its predecessor`).toBeGreaterThan(last);
      last = idx;
    }
    expect(out).toMatch(
      /export type UpdateOrderVariables = \{[\s\S]*orderId: string;[\s\S]*params\?: UpdateOrderParams;[\s\S]*body: UpdateOrderBody;[\s\S]*headers\?: UpdateOrderHeaders;[\s\S]*\};/
    );
  });

  it('omits *Params/*Body/*Variables for operations without those inputs', () => {
    const out = emitWithOp({ name: 'ping' });
    expect(out).not.toContain('PingParams');
    expect(out).not.toContain('PingBody');
    expect(out).not.toContain('PingVariables');
  });

  it('types a typed multipart body as an object (binary→Blob), not FormData', () => {
    const out = emitWithOp({
      name: 'upload',
      method: 'post',
      requestBody: {
        contentType: 'multipart/form-data',
        required: true,
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'file',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } },
              required: true,
            },
          ],
        },
      },
    });
    expect(out).toContain('export type UploadBody = {');
    expect(out).toContain('file: Blob;');
    expect(out).not.toContain('UploadBody = FormData');
  });
});

describe('<Op>* alias collision suppression', () => {
  it('suppresses the *Result alias when it collides with the response schema name', () => {
    const out = emitClientSingleFile(
      apiModel({
        schemas: [namedSchema('SearchResult', { kind: 'object', properties: [] })],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'search',
                method: 'post',
                successResponses: [
                  {
                    contentType: 'application/json',
                    status: 200,
                    schema: { kind: 'ref', name: 'SearchResult' },
                  },
                ],
              }),
            ],
          },
        ],
      })
    );
    expect(out).not.toContain('export type SearchResult = SearchResult;');
    // Exactly one `SearchResult` declaration — the schema, not a colliding alias.
    expect(out.match(/export type SearchResult\b/g)).toHaveLength(1);
    // The Ops member references the schema type directly.
    expect(out).toContain('result: SearchResult;');
  });

  it('suppresses *Error and references the error schema directly in result mode', () => {
    const out = emitResult(
      {
        name: 'login',
        method: 'post',
        successResponses: [
          {
            contentType: 'application/json',
            status: 200,
            schema: { kind: 'ref', name: 'Session' },
          },
        ],
        errorResponses: [
          {
            contentType: 'application/json',
            status: 400,
            schema: { kind: 'ref', name: 'Problem' },
          },
        ],
      },
      ['Session', 'Problem', 'LoginError']
    );
    // `LoginError` names the SCHEMA type only — no `<Op>Error` alias shadows it.
    expect(out).not.toContain('export type LoginError = Problem');
    expect(out).toContain('Result<LoginResult, Problem>');
  });
});

describe("errorMode: 'result' — typed error aliases", () => {
  const okResponse = {
    contentType: 'application/json',
    status: 200,
    schema: { kind: 'ref', name: 'Pet' },
  } as const;

  it('emits a *Error alias and wraps the Ops result when the op declares an error response', () => {
    const out = emitResult(
      {
        name: 'getPet',
        successResponses: [okResponse],
        errorResponses: [
          {
            contentType: 'application/json',
            status: 400,
            schema: { kind: 'ref', name: 'Problem' },
          },
        ],
      },
      ['Pet', 'Problem']
    );
    expect(out).toContain('export type GetPetError = Problem;');
    expect(out).toContain('result: Result<GetPetResult, GetPetError>;');
  });

  it('falls back to `unknown` (and emits no *Error alias) when the op has no error responses', () => {
    const out = emitResult({ name: 'getPet', successResponses: [okResponse] }, ['Pet']);
    expect(out).not.toContain('GetPetError');
    expect(out).toContain('result: Result<GetPetResult, unknown>;');
  });

  it('unions and dedupes error-response body types in the *Error alias', () => {
    const out = emitResult(
      {
        name: 'getPet',
        successResponses: [okResponse],
        errorResponses: [
          { contentType: 'application/json', status: 400, schema: { kind: 'ref', name: 'A' } },
          { contentType: 'application/json', status: 500, schema: { kind: 'ref', name: 'B' } },
          {
            contentType: 'application/problem+json',
            status: 502,
            schema: { kind: 'ref', name: 'B' },
          },
        ],
      },
      ['Pet', 'A', 'B']
    );
    expect(out).toContain('export type GetPetError = A | B;');
    expect(out).not.toContain('B | B');
  });

  it('throw mode (the default) emits no Result wrapping and no *Error alias', () => {
    const out = emitWithOp({
      name: 'getPet',
      successResponses: [okResponse],
      errorResponses: [
        { contentType: 'application/json', status: 400, schema: { kind: 'ref', name: 'Problem' } },
      ],
    });
    expect(out).not.toContain('GetPetError');
    // The Ops member holds the bare result type (the embedded runtime still
    // declares the unused-in-throw-mode `Result` helper type).
    expect(out).toContain('result: GetPetResult;');
    expect(out).not.toContain('result: Result<');
  });
});

describe('response type discovery (computeResponse through *Result)', () => {
  it('void when there are no responses', () => {
    expect(emitWithOp({ name: 'ping' })).toContain('export type PingResult = void;');
  });

  it('binary-only responses → Blob; text-only → string', () => {
    expect(
      emitWithOp({
        name: 'getPhoto',
        successResponses: [{ contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 }],
      })
    ).toContain('export type GetPhotoResult = Blob;');
    expect(
      emitWithOp({
        name: 'getText',
        successResponses: [{ contentType: 'text/plain', schema: { kind: 'unknown' }, status: 200 }],
      })
    ).toContain('export type GetTextResult = string;');
  });

  it('unions mixed binary + text responses and dedupes identical types', () => {
    const out = emitWithOp({
      name: 'getPhoto',
      successResponses: [
        { contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 },
        { contentType: 'image/jpeg', schema: { kind: 'unknown' }, status: 200 },
        { contentType: 'text/plain', schema: { kind: 'unknown' }, status: 200 },
      ],
    });
    expect(out).toContain('export type GetPhotoResult = Blob | string;');
    expect(out).not.toContain('Blob | Blob');
  });

  it('picks JSON when both JSON and non-JSON content types coexist', () => {
    const out = emitWithOp({
      name: 'get',
      successResponses: [
        { contentType: 'application/xml', schema: { kind: 'ref', name: 'X' }, status: 200 },
        { contentType: 'application/json', schema: { kind: 'ref', name: 'J' }, status: 200 },
      ],
    });
    expect(out).toContain('export type GetResult = J;');
  });
});
