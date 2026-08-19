// One operation's developer-facing surface in the descriptor-wired single-file client:
// the input shape in both styles, and the `<Op>*` aliases. The wiring itself (Ops,
// OPERATIONS, client, sugar) is covered in client-assembly.test.ts.
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

describe('call inputs — the namespaced shape', () => {
  it('an operation with no inputs has no Variables type and is exported as a binding', () => {
    const out = emitWithOp({});
    expect(out).not.toContain('OpVariables');
    expect(out).toContain('export const { op } = client;');
  });

  it('groups path params under `path`, in URL-template order', () => {
    const out = emitWithOp({
      name: 'getNested',
      path: '/x/{first}/y/{second}',
      pathParams: [
        param('second', 'path', true, { kind: 'scalar', scalar: 'number' }),
        param('first', 'path', true, { kind: 'scalar', scalar: 'string' }),
      ],
    });
    expect(out).toContain(
      'export type GetNestedPath = {\n    first: string;\n    second: number;\n};'
    );
    expect(out).toContain('path: GetNestedPath;');
  });

  it('drops a path param that the URL template never mentions', () => {
    // The descriptor still lists the declared parameter; the input type must not ask for
    // a value that has nowhere to go in the URL.
    const out = emitWithOp({ path: '/x', pathParams: [param('ghost', 'path', true)] });
    expect(out).not.toContain('OpPath');
    expect(out).not.toContain('ghost: string');
  });

  it('keys a non-identifier param by its wire name, quoted', () => {
    const out = emitWithOp({
      name: 'getPet',
      path: '/pets/{pet-id}',
      pathParams: [param('pet-id', 'path', true)],
    });
    expect(out).toContain('export type GetPetPath = {\n    "pet-id": string;\n};');
  });

  it('`query` is optional when every query param is, required when one is not', () => {
    const optional = emitWithOp({
      queryParams: [param('q', 'query', false), param('r', 'query', false)],
    });
    expect(optional).toContain('query?: OpQuery;');
    const required = emitWithOp({
      queryParams: [param('q', 'query', true), param('r', 'query', false)],
    });
    expect(required).toContain('query: OpQuery;');
  });

  it('produces `body: T` for required JSON bodies and `body?: T` for optional ones', () => {
    const required: RequestBodyModel = {
      contentType: 'application/json',
      schema: { kind: 'ref', name: 'Pet' },
      required: true,
    };
    const out = emitWithOp({ requestBody: required });
    expect(out).toContain('export type OpBody = Pet;');
    expect(out).toContain('body: OpBody;');
    const optional: RequestBodyModel = {
      contentType: 'application/json',
      schema: SCALAR,
      required: false,
    };
    expect(emitWithOp({ requestBody: optional })).toContain('body?: OpBody;');
  });

  it('types a non-JSON body by its content type', () => {
    const bodyOf = (contentType: string, schema: RequestBodyModel['schema']): string =>
      emitWithOp({ requestBody: { contentType, schema, required: true } });
    expect(bodyOf('multipart/form-data', { kind: 'unknown' })).toContain(
      'export type OpBody = FormData;'
    );
    expect(
      bodyOf('application/x-www-form-urlencoded', { kind: 'object', properties: [] })
    ).toContain('export type OpBody = URLSearchParams;');
    expect(bodyOf('application/octet-stream', SCALAR)).toContain(
      'export type OpBody = Blob | ArrayBuffer;'
    );
  });

  it('groups header params under `headers`, optional when all of them are', () => {
    const required = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Api-Version', 'header', true)],
    });
    expect(required).toContain('export type GetThingHeaders = {\n    "X-Api-Version": string;\n};');
    expect(required).toContain('headers: GetThingHeaders;');
    const optional = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Trace', 'header', false)],
    });
    expect(optional).toContain('headers?: GetThingHeaders;');
  });

  it('renders per-param JSDoc (description + schema metadata)', () => {
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

  it('exports one binding per operation — SSE included, with no wrapper in sight', () => {
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
    expect(out).toContain('export const { streamMessages, listThings } = client;');
    expect(out).not.toContain('=> client.streamMessages(');
  });
});

describe('call inputs — the merged shape (argsStyle: flat)', () => {
  /** Emit a flat-style client whose only operation is `operation(op)`. */
  function emitFlat(op: Partial<OperationModel>): string {
    return emitClientSingleFile(
      apiModel({ services: [{ name: 'Default', operations: [operation(op)] }] }),
      { argsStyle: 'flat' }
    );
  }

  it('puts every parameter at one level and intersects a required object body', () => {
    const out = emitFlat({
      name: 'updateThing',
      path: '/things/{id}',
      pathParams: [param('id', 'path', true)],
      queryParams: [param('dryRun', 'query', false, { kind: 'scalar', scalar: 'boolean' })],
      requestBody: {
        contentType: 'application/json',
        schema: {
          kind: 'object',
          properties: [{ name: 'status', schema: SCALAR, required: true }],
        },
        required: true,
      },
    });
    expect(out).toContain(
      'export type UpdateThingVariables = {\n    id: string;\n    dryRun?: boolean;\n} & UpdateThingBody;'
    );
    // The client is told which shape its types promise, so the runtime converts before use.
    expect(out).toContain('argsStyle: "flat"');
  });

  it('keeps the `body` key for a body a merged call cannot spread', () => {
    const out = emitFlat({
      name: 'upload',
      requestBody: { contentType: 'application/octet-stream', schema: SCALAR, required: true },
    });
    expect(out).toContain('export type UploadVariables = {\n    body: UploadBody;\n};');
  });

  it('an optional body stays a `body` key: omitting it must differ from omitting its fields', () => {
    const out = emitFlat({
      name: 'patchThing',
      requestBody: {
        contentType: 'application/json',
        schema: {
          kind: 'object',
          properties: [{ name: 'status', schema: SCALAR, required: true }],
        },
        required: false,
      },
    });
    expect(out).toContain('body?: PatchThingBody;');
  });

  it('counts the properties of an allOf body, which a merged call would spread too', () => {
    const out = emitFlat({
      name: 'saveThing',
      path: '/things/{id}',
      pathParams: [param('id', 'path', true)],
      queryParams: [param('label', 'query', false)],
      requestBody: {
        contentType: 'application/json',
        required: true,
        schema: {
          kind: 'intersection',
          members: [
            { kind: 'object', properties: [{ name: 'label', schema: SCALAR, required: true }] },
            { kind: 'object', properties: [{ name: 'note', schema: SCALAR, required: false }] },
          ],
        },
      },
    });
    // `label` arrives from the query AND from the body, so the merged shape is impossible.
    expect(out).toContain('path: SaveThingPath;');
    expect(out).toContain('query?: SaveThingQuery;');
    expect(out).toContain('body: SaveThingBody;');
    // The descriptor says the same, so the runtime takes the namespaced call.
    expect(out).toContain('argsStyle: "grouped"');
  });

  it('a property two allOf members declare is one key, not a collision', () => {
    const out = emitFlat({
      name: 'saveThing',
      path: '/things/{id}',
      pathParams: [param('id', 'path', true)],
      requestBody: {
        contentType: 'application/json',
        required: true,
        schema: {
          kind: 'intersection',
          members: [
            {
              kind: 'object',
              properties: [
                { name: 'label', schema: SCALAR, required: true },
                { name: 'note', schema: SCALAR, required: false },
              ],
            },
            // A refinement of the same property — the merged body still has one `label`.
            { kind: 'object', properties: [{ name: 'label', schema: SCALAR, required: false }] },
          ],
        },
      },
    });
    expect(out).toContain(
      'export type SaveThingVariables = {\n    id: string;\n} & SaveThingBody;'
    );
    expect(out).not.toContain('argsStyle: "grouped"');
  });

  it('falls back to the namespaced shape when one name lands in two layers', () => {
    const out = emitFlat({
      name: 'getThing',
      path: '/things/{id}',
      pathParams: [param('id', 'path', true)],
      queryParams: [param('id', 'query', false)],
    });
    expect(out).toContain('path: GetThingPath;');
    expect(out).toContain('query?: GetThingQuery;');
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

  it('emits *Path/*Query/*Body/*Headers/*Variables per input kind, in a stable order', () => {
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
      'UpdateOrderPath',
      'UpdateOrderQuery',
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
      /export type UpdateOrderVariables = \{[\s\S]*path: UpdateOrderPath;[\s\S]*query\?: UpdateOrderQuery;[\s\S]*body: UpdateOrderBody;[\s\S]*headers\?: UpdateOrderHeaders;[\s\S]*\};/
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
