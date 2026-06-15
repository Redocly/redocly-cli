import type {
  OperationModel,
  RequestBodyModel,
  ResponseBodyModel,
  SchemaModel,
} from '../../ir/model.js';
import { emitSingleFile } from '../client.js';
import { renderOperationsBlock, renderOperationsMeta, serviceClassName } from '../operations.js';
import { SCALAR, apiModel, emitWithOp, namedSchema, operation, param } from './fixtures.js';

describe('serviceClassName', () => {
  it('PascalCases the label and appends Service', () => {
    expect(serviceClassName('products')).toBe('ProductsService');
    expect(serviceClassName('Orders')).toBe('OrdersService');
  });

  it('produces a valid identifier from non-identifier labels', () => {
    expect(serviceClassName('pet-store')).toBe('PetStoreService');
    expect(serviceClassName('default')).toBe('DefaultService');
    expect(serviceClassName('user accounts')).toBe('UserAccountsService');
  });

  it('falls back to DefaultService when the label has no identifier chars', () => {
    expect(serviceClassName('---')).toBe('DefaultService');
  });

  it('prefixes a leading digit so the result is a valid identifier', () => {
    expect(serviceClassName('2023-api')).toBe('_2023ApiService');
  });
});

describe('renderOperationsBlock — facade seam', () => {
  const ops = [
    operation({
      name: 'getThing',
      path: '/things/{id}',
      pathParams: [param('id', 'path', true)],
    }),
    operation({ name: 'listThings', path: '/things' }),
  ];

  it('functions facade emits standalone exported async functions joined by a blank line', () => {
    const out = renderOperationsBlock(ops, {
      facade: 'functions',
      className: 'Ignored',
    });
    expect(out).toContain('export async function getThing(');
    expect(out).toContain('export async function listThings(');
    expect(out).not.toContain('export class');
    // className is ignored by the functions facade.
    expect(out).not.toContain('Ignored');
  });

  it('functions facade output equals the per-operation join (byte-identical seam)', () => {
    const block = renderOperationsBlock(ops, {
      facade: 'functions',
      className: 'X',
    });
    const viaSingle = emitSingleFile(
      apiModel({ services: [{ name: 'Default', operations: ops }] })
    );
    expect(viaSingle).toContain(block);
  });

  it('service-class facade wraps operations as methods of the named class', () => {
    const out = renderOperationsBlock(ops, {
      facade: 'service-class',
      className: 'ThingsService',
    });
    expect(out).toContain('export class ThingsService {');
    // Methods have no `export`/`function` keywords — they are class members.
    expect(out).toMatch(/\basync getThing\(/);
    expect(out).toMatch(/\basync listThings\(/);
    expect(out).not.toContain('export async function');
    // The method body calls the runtime via `this.config`.
    expect(out).toContain('return __request<void>(this.config,');
  });

  it('service-class emits a chainable use() method that registers middleware on the instance', () => {
    const out = renderOperationsBlock(ops, {
      facade: 'service-class',
      className: 'ThingsService',
    });
    expect(out).toContain('use(...middleware: Middleware[]): this {');
    expect(out).toContain(
      'this.config.middleware = [...this.config.middleware ?? [], ...middleware];'
    );
    expect(out).toContain('return this;');
  });

  describe('<Op>Result / schema name collision (#9)', () => {
    const archive = operation({
      name: 'archive',
      path: '/pets/{id}/archive',
      method: 'post',
      pathParams: [param('id', 'path', true)],
      // Returns `Pet`; the derived alias name `ArchiveResult` collides with a sibling schema.
      successResponses: [
        { contentType: 'application/json', schema: { kind: 'ref', name: 'Pet' }, status: 200 },
      ],
    });

    it('suppresses the <Op>Result alias when its name collides with a schema (throw mode)', () => {
      const out = renderOperationsBlock([archive], {
        facade: 'functions',
        className: 'C',
        schemaNames: new Set(['ArchiveResult']),
      });
      expect(out).not.toContain('export type ArchiveResult');
      // The function still returns the underlying response type.
      expect(out).toContain('Promise<Pet>');
    });

    it('inlines the response type in result mode on collision (no resultRef)', () => {
      const out = renderOperationsBlock([archive], {
        facade: 'functions',
        className: 'C',
        errorMode: 'result',
        schemaNames: new Set(['ArchiveResult']),
      });
      expect(out).not.toContain('export type ArchiveResult');
      expect(out).toContain('Result<Pet,');
      expect(out).not.toContain('Result<ArchiveResult,');
    });

    it('still emits the alias when there is no collision', () => {
      const out = renderOperationsBlock([archive], {
        facade: 'functions',
        className: 'C',
        schemaNames: new Set(['Pet']),
      });
      expect(out).toContain('export type ArchiveResult = Pet;');
    });

    it('suppresses *Error and inlines the error type on collision (result mode)', () => {
      const login = operation({
        name: 'login',
        method: 'post',
        successResponses: [
          {
            contentType: 'application/json',
            schema: { kind: 'ref', name: 'Session' },
            status: 200,
          },
        ],
        errorResponses: [
          {
            contentType: 'application/json',
            schema: { kind: 'ref', name: 'Problem' },
            status: 200,
          },
        ],
      });
      const out = renderOperationsBlock([login], {
        facade: 'functions',
        className: 'C',
        errorMode: 'result',
        schemaNames: new Set(['LoginError']),
      });
      expect(out).not.toContain('export type LoginError');
      // The Result error arg references the schema directly, not the (absent) alias.
      expect(out).toContain('Result<LoginResult, Problem>');
    });

    it('suppresses *Params/*Body/*Headers aliases on collision (flat mode inlines them)', () => {
      const list = operation({
        name: 'list',
        method: 'get',
        queryParams: [param('q', 'query', false)],
      });
      const out = renderOperationsBlock([list], {
        facade: 'functions',
        className: 'C',
        schemaNames: new Set(['ListParams']),
      });
      expect(out).not.toContain('export type ListParams');
      // The flat signature still carries an inline params object.
      expect(out).toMatch(/params\?: \{/);
    });

    it('suppresses *Variables and inlines it in the grouped signature on collision', () => {
      const get = operation({
        name: 'get',
        method: 'get',
        path: '/x/{id}',
        pathParams: [param('id', 'path', true)],
      });
      const out = renderOperationsBlock([get], {
        facade: 'functions',
        className: 'C',
        argsStyle: 'grouped',
        schemaNames: new Set(['GetVariables']),
      });
      expect(out).not.toContain('export type GetVariables');
      expect(out).toContain('vars: {'); // inline object, not a reference to GetVariables
    });

    it('inlines a *Params prop inside *Variables when *Params collides (grouped)', () => {
      const list = operation({
        name: 'list',
        method: 'get',
        queryParams: [param('q', 'query', true)],
      });
      const out = renderOperationsBlock([list], {
        facade: 'functions',
        className: 'C',
        argsStyle: 'grouped',
        schemaNames: new Set(['ListParams']),
      });
      expect(out).not.toContain('export type ListParams');
      expect(out).toContain('export type ListVariables'); // Variables itself doesn't collide
      expect(out).not.toMatch(/params\??: ListParams/); // the prop is inlined, not a ref
    });

    it('inlines colliding *Body and *Headers props in *Variables (grouped)', () => {
      const send = operation({
        name: 'send',
        method: 'post',
        requestBody: {
          contentType: 'application/json',
          required: true,
          schema: { kind: 'ref', name: 'Payload' },
        },
        headerParams: [param('x-trace', 'header', false)],
      });
      const out = renderOperationsBlock([send], {
        facade: 'functions',
        className: 'C',
        argsStyle: 'grouped',
        schemaNames: new Set(['SendBody', 'SendHeaders']),
      });
      expect(out).not.toContain('export type SendBody');
      expect(out).not.toContain('export type SendHeaders');
      expect(out).toContain('export type SendVariables'); // inlines body/headers rather than referencing
      expect(out).toContain('body: Payload;');
    });

    it('suppresses an SSE op input alias (<Op>Variables) that collides with a schema', () => {
      const stream = operation({
        name: 'streamEvents',
        method: 'get',
        path: '/events/{id}',
        pathParams: [param('id', 'path', true)],
        successResponses: [
          {
            contentType: 'text/event-stream',
            schema: { kind: 'scalar', scalar: 'string' },
            status: 200,
          },
        ],
      });
      const out = renderOperationsBlock([stream], {
        facade: 'functions',
        className: 'C',
        schemaNames: new Set(['StreamEventsVariables']),
      });
      // SSE input aliases are not exempt from collision handling.
      expect(out).not.toContain('export type StreamEventsVariables');
    });

    it('inlines a multi-member error union when *Error collides (result mode)', () => {
      const op2 = operation({
        name: 'op2',
        method: 'post',
        successResponses: [
          { contentType: 'application/json', schema: { kind: 'ref', name: 'Ok' }, status: 200 },
        ],
        errorResponses: [
          { contentType: 'application/json', schema: { kind: 'ref', name: 'E1' }, status: 200 },
          { contentType: 'application/json', schema: { kind: 'ref', name: 'E2' }, status: 200 },
        ],
      });
      const out = renderOperationsBlock([op2], {
        facade: 'functions',
        className: 'C',
        errorMode: 'result',
        schemaNames: new Set(['Op2Error']),
      });
      expect(out).not.toContain('export type Op2Error');
      expect(out).toContain('Result<Op2Result, E1 | E2>'); // inline union, not the alias
    });
  });

  describe('multipart request bodies (#5)', () => {
    const uploadOp = operation({
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
            { name: 'orgId', schema: { kind: 'scalar', scalar: 'string' }, required: true },
            {
              name: 'tags',
              schema: { kind: 'array', items: { kind: 'scalar', scalar: 'string' } },
              required: false,
            },
          ],
        },
      },
    });

    it('emits a typed body (binary→Blob) instead of raw FormData, serialized via __toFormData', () => {
      const out = renderOperationsBlock([uploadOp], { facade: 'functions', className: 'C' });
      expect(out).toContain('export type UploadBody = {');
      expect(out).toContain('file: Blob;');
      expect(out).toContain('orgId: string;');
      expect(out).toContain('tags?: string[];');
      expect(out).not.toContain('UploadBody = FormData');
      // The typed object is serialized to FormData at the call site.
      expect(out).toContain('__toFormData(body)');
    });

    it('falls back to raw FormData when the multipart schema is not an object', () => {
      const out = renderOperationsBlock(
        [
          operation({
            name: 'rawUpload',
            method: 'post',
            requestBody: {
              contentType: 'multipart/form-data',
              required: true,
              schema: { kind: 'unknown' },
            },
          }),
        ],
        { facade: 'functions', className: 'C' }
      );
      expect(out).toContain('export type RawUploadBody = FormData;');
      expect(out).not.toContain('__toFormData');
    });
  });

  it('service-class hoists operation type aliases to module level (before the class)', () => {
    const out = renderOperationsBlock(ops, {
      facade: 'service-class',
      className: 'C',
    });
    // `export type` aliases can't live inside a class body — they must precede it.
    expect(out).toContain('export type GetThingResult');
    expect(out.indexOf('export type GetThingResult')).toBeLessThan(out.indexOf('export class C {'));
    // The alias is not re-emitted inside the class body.
    const classBody = out.slice(out.indexOf('export class C {'));
    expect(classBody).not.toContain('export type');
  });
});

describe("errorMode: 'result' — result shape + typed errors", () => {
  const okResponse: ResponseBodyModel = {
    contentType: 'application/json',
    status: 200,
    schema: { kind: 'ref', name: 'Pet' },
  };

  function emitResult(op: Partial<OperationModel>): string {
    return renderOperationsBlock([operation(op)], {
      facade: 'functions',
      className: 'Client',
      argsStyle: 'flat',
      errorMode: 'result',
    });
  }

  it('emits a *Error alias and a Result-typed signature/body when the op declares an error response', () => {
    const out = emitResult({
      name: 'getPet',
      successResponses: [okResponse],
      errorResponses: [
        {
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'ProblemDetails' },
          status: 200,
        },
      ],
    });
    expect(out).toContain('export type GetPetError = ProblemDetails;');
    expect(out).toContain('): Promise<Result<GetPetResult, GetPetError>>');
    expect(out).toContain('return __requestResult<GetPetResult, GetPetError>(');
  });

  it('falls back to `unknown` (and emits no *Error alias) when the op has no error responses', () => {
    const out = emitResult({ name: 'getPet', successResponses: [okResponse] });
    expect(out).not.toContain('GetPetError');
    expect(out).toContain('): Promise<Result<GetPetResult, unknown>>');
    expect(out).toContain('return __requestResult<GetPetResult, unknown>(');
  });

  it('unions multiple error-response body types in the *Error alias', () => {
    const out = emitResult({
      name: 'getPet',
      successResponses: [okResponse],
      errorResponses: [
        { contentType: 'application/json', schema: { kind: 'ref', name: 'A' }, status: 200 },
        { contentType: 'application/json', schema: { kind: 'ref', name: 'B' }, status: 200 },
      ],
    });
    expect(out).toContain('export type GetPetError = A | B;');
    expect(out).toContain('): Promise<Result<GetPetResult, GetPetError>>');
  });

  it('dedupes identical error-response body types in the *Error alias', () => {
    const out = emitResult({
      name: 'getPet',
      successResponses: [okResponse],
      errorResponses: [
        {
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'ProblemDetails' },
          status: 200,
        },
        {
          contentType: 'application/problem+json',
          status: 200,
          schema: { kind: 'ref', name: 'ProblemDetails' },
        },
      ],
    });
    expect(out).toContain('export type GetPetError = ProblemDetails;');
    expect(out).not.toContain('ProblemDetails | ProblemDetails');
  });

  it('also applies under the service-class facade', () => {
    const out = renderOperationsBlock(
      [
        operation({
          name: 'getPet',
          successResponses: [okResponse],
          errorResponses: [
            {
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'ProblemDetails' },
              status: 200,
            },
          ],
        }),
      ],
      { facade: 'service-class', className: 'Client', errorMode: 'result' }
    );
    expect(out).toContain('export type GetPetError = ProblemDetails;');
    expect(out).toContain('): Promise<Result<GetPetResult, GetPetError>>');
    expect(out).toContain('return __requestResult<GetPetResult, GetPetError>(');
  });

  it('throw mode (no errorMode) is unchanged: no Result, no *Error, still __request<…>', () => {
    const out = renderOperationsBlock(
      [
        operation({
          name: 'getPet',
          successResponses: [okResponse],
          errorResponses: [
            {
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'ProblemDetails' },
              status: 200,
            },
          ],
        }),
      ],
      { facade: 'functions', className: 'Client', argsStyle: 'flat' }
    );
    expect(out).toContain('): Promise<Pet>');
    expect(out).toContain('return __request<Pet>(');
    expect(out).not.toContain('Result<');
    expect(out).not.toContain('__requestResult');
    expect(out).not.toContain('GetPetError');
  });
});

describe('auth — await __auth, spread headers, merge query', () => {
  const okResponse: ResponseBodyModel = {
    contentType: 'application/json',
    status: 200,
    schema: { kind: 'ref', name: 'Pet' },
  };

  it('header-auth op awaits __auth, spreads ...__a.headers, leaves the URL unchanged', () => {
    const out = renderOperationsBlock(
      [operation({ name: 'getPet', security: ['Bearer'], successResponses: [okResponse] })],
      { facade: 'functions', className: 'Client', argsStyle: 'flat', queryAuthKeys: new Set() }
    );
    expect(out).toContain('const __a = await __auth(["Bearer"], __config);');
    expect(out).toContain('...__a.headers');
    expect(out).not.toContain('...__auth(');
    // No query param + no query auth ⇒ URL call has no third arg.
    expect(out).toContain('__buildUrl(__config, `/p`)');
    expect(out).not.toContain('__a.query');
  });

  it('query-auth op with a query param merges { ...params, ...__a.query } into __buildUrl', () => {
    const out = renderOperationsBlock(
      [
        operation({
          name: 'listPets',
          security: ['QueryKey'],
          queryParams: [param('limit', 'query', false)],
        }),
      ],
      {
        facade: 'functions',
        className: 'Client',
        argsStyle: 'flat',
        queryAuthKeys: new Set(['QueryKey']),
      }
    );
    expect(out).toContain('const __a = await __auth(["QueryKey"], __config);');
    expect(out).toContain('__buildUrl(__config, `/p`, { ...params, ...__a.query })');
  });

  it('query-auth op with no query param passes { ...__a.query } as the third arg', () => {
    const out = renderOperationsBlock([operation({ name: 'listPets', security: ['QueryKey'] })], {
      facade: 'functions',
      className: 'Client',
      argsStyle: 'flat',
      queryAuthKeys: new Set(['QueryKey']),
    });
    expect(out).toContain('__buildUrl(__config, `/p`, { ...__a.query })');
  });

  it('grouped args-style merges via vars.params: { ...vars.params, ...__a.query } / { ...__a.query }', () => {
    const withQuery = renderOperationsBlock(
      [
        operation({
          name: 'listPets',
          security: ['QueryKey'],
          queryParams: [param('limit', 'query', false)],
        }),
      ],
      {
        facade: 'functions',
        className: 'Client',
        argsStyle: 'grouped',
        queryAuthKeys: new Set(['QueryKey']),
      }
    );
    expect(withQuery).toContain('__buildUrl(__config, `/p`, { ...vars.params, ...__a.query })');

    const noQuery = renderOperationsBlock(
      [operation({ name: 'listPets', security: ['QueryKey'] })],
      {
        facade: 'functions',
        className: 'Client',
        argsStyle: 'grouped',
        queryAuthKeys: new Set(['QueryKey']),
      }
    );
    expect(noQuery).toContain('__buildUrl(__config, `/p`, { ...__a.query })');
  });

  it('composes with errorMode: result — awaits __auth then calls __requestResult', () => {
    const out = renderOperationsBlock(
      [
        operation({
          name: 'getPet',
          security: ['Bearer'],
          successResponses: [okResponse],
          errorResponses: [
            {
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'ProblemDetails' },
              status: 200,
            },
          ],
        }),
      ],
      {
        facade: 'functions',
        className: 'Client',
        argsStyle: 'flat',
        errorMode: 'result',
        queryAuthKeys: new Set(),
      }
    );
    expect(out).toContain('const __a = await __auth(["Bearer"], __config);');
    expect(out).toContain('...__a.headers');
    expect(out).toContain('return __requestResult<GetPetResult, GetPetError>(');
  });

  it('service-class authed method indents the const __a line correctly', () => {
    const out = renderOperationsBlock(
      [operation({ name: 'getPet', security: ['Bearer'], successResponses: [okResponse] })],
      { facade: 'service-class', className: 'Client', queryAuthKeys: new Set() }
    );
    // Method body lives one indent level deeper than the function form (4 spaces).
    expect(out).toContain('    const __a = await __auth(["Bearer"], this.config);');
    expect(out).toContain('...__a.headers');
  });

  it('non-authed op emits no __a/__auth and threads the plain runtime call', () => {
    const out = renderOperationsBlock([operation({ name: 'op' })], {
      facade: 'functions',
      className: 'Client',
      argsStyle: 'flat',
      queryAuthKeys: new Set(),
    });
    expect(out).not.toContain('__a');
    expect(out).not.toContain('__auth');
    expect(out).toContain(
      'return __request<void>(__config, __buildUrl(__config, `/p`), { method: "GET", ...init }, undefined, "void");'
    );
  });
});

describe('renderOperation — argument-list permutations', () => {
  it('renders an operation with no params, no body, no responses → returns Promise<void>', () => {
    const out = emitWithOp({});
    expect(out).toContain('export async function op(');
    expect(out).toContain('init: RequestOptions = {}');
    expect(out).toContain('): Promise<void>');
    expect(out).toContain('{ method: "GET", ...init }');
    expect(out).toContain('"void"');
  });

  it('orders path params by their position in the URL template, not in pathParams[]', () => {
    const out = emitWithOp({
      path: '/x/{first}/y/{second}',
      pathParams: [
        param('second', 'path', true, { kind: 'scalar', scalar: 'number' }),
        param('first', 'path', true, { kind: 'scalar', scalar: 'string' }),
      ],
    });
    const argLine = out.split('\n').find((l) => l.includes('first: string')) ?? '';
    expect(argLine).toMatch(/first: string/);
    expect(out.indexOf('first: string')).toBeLessThan(out.indexOf('second: number'));
  });

  it('skips path params that are declared but missing from the URL template', () => {
    const out = emitWithOp({
      path: '/x',
      pathParams: [param('ghost', 'path', true)],
    });
    expect(out).not.toContain('ghost: string');
  });

  it('leaves a path template variable with no matching declared pathParam as a literal', () => {
    // Template references {missing} but the operation declares no path param for it.
    const out = emitWithOp({ path: '/x/{missing}', pathParams: [] });
    expect(out).not.toContain('missing:');
    // No substitution: emitting `encodeURIComponent(String(missing))` would
    // reference an undeclared variable and break the generated client. The
    // segment is left literal instead.
    expect(out).not.toContain('encodeURIComponent(String(missing))');
    expect(out).toContain('`/x/{missing}`');
  });

  it('sanitizes a non-identifier path param name into a safe argument + URL ref', () => {
    // `pet-id` is a legal OpenAPI name but not a usable JS identifier.
    const out = emitWithOp({
      path: '/pets/{pet-id}',
      pathParams: [param('pet-id', 'path', true)],
    });
    expect(out).toContain('pet_id: string');
    expect(out).toContain('${encodeURIComponent(String(pet_id))}');
    // The quoted form (which would be a syntax error as a parameter) is gone.
    expect(out).not.toContain('"pet-id": string');
  });

  it('prefixes a digit-leading path param name with `_`', () => {
    const out = emitWithOp({
      path: '/x/{2fa}',
      pathParams: [param('2fa', 'path', true)],
    });
    expect(out).toContain('_2fa: string');
    expect(out).toContain('${encodeURIComponent(String(_2fa))}');
  });

  it('prefixes a reserved-word path param name with `_`', () => {
    const out = emitWithOp({
      path: '/x/{new}',
      pathParams: [param('new', 'path', true)],
    });
    expect(out).toContain('_new: string');
    expect(out).toContain('${encodeURIComponent(String(_new))}');
  });

  it('disambiguates path param names that sanitize to the same identifier', () => {
    const out = emitWithOp({
      path: '/x/{a-b}/{a.b}',
      pathParams: [param('a-b', 'path', true), param('a.b', 'path', true)],
    });
    // First wins the base name; the colliding second gets a numeric suffix.
    expect(out).toContain('a_b: string');
    expect(out).toContain('a_b_2: string');
    expect(out).toContain('${encodeURIComponent(String(a_b))}');
    expect(out).toContain('${encodeURIComponent(String(a_b_2))}');
  });

  it('emits `params = {}` default when all query params are optional', () => {
    const out = emitWithOp({
      queryParams: [param('q', 'query', false), param('r', 'query', false)],
    });
    expect(out).toContain('params: {');
    // All-optional ⇒ the params object arg defaults to `= {}`.
    expect(out).toMatch(/\} = \{\}/);
  });

  it('makes `params` required when at least one query param is required', () => {
    const out = emitWithOp({
      queryParams: [param('q', 'query', true), param('r', 'query', false)],
    });
    // Multi-line layout so per-param JSDoc fits.
    expect(out).toMatch(/params: \{\n {4}q: string;\n {4}r\?: string;\n\}/);
    // Required (any required prop) ⇒ no `= {}` default.
    expect(out).not.toMatch(/params: \{[\s\S]*?\} = \{\}/);
  });

  it('passes `params` into __buildUrl when query params are present', () => {
    const out = emitWithOp({ queryParams: [param('q', 'query', true)] });
    expect(out).toContain('__buildUrl(__config, `/p`, params)');
  });

  it('default-styled query params get NO 4th styles arg (byte-identical)', () => {
    // `style: form` + `explode: true` is the OpenAPI default ⇒ no spec entry.
    const out = emitWithOp({
      queryParams: [
        { name: 'q', in: 'query', schema: SCALAR, required: true },
        { name: 'r', in: 'query', schema: SCALAR, required: false, style: 'form', explode: true },
      ],
    });
    // The call is byte-identical to a plain query op: no 4th styles arg.
    expect(out).toContain('__buildUrl(__config, `/p`, params)');
    expect(out).not.toContain('__buildUrl(__config, `/p`, params, {');
  });

  it('passes a styles spec as the 4th arg for a non-default pipeDelimited+explode:false param', () => {
    const out = emitWithOp({
      queryParams: [
        {
          name: 'tags',
          in: 'query',
          schema: { kind: 'array', items: SCALAR },
          required: false,
          style: 'pipeDelimited',
          explode: false,
        },
      ],
    });
    expect(out).toContain(
      '__buildUrl(__config, `/p`, params, { "tags": { style: "pipeDelimited", explode: false } })'
    );
  });

  it('explode:false alone (default style) is non-default and emits style "form"', () => {
    const out = emitWithOp({
      queryParams: [
        {
          name: 'ids',
          in: 'query',
          schema: { kind: 'array', items: SCALAR },
          required: false,
          explode: false,
        },
      ],
    });
    expect(out).toContain(
      '__buildUrl(__config, `/p`, params, { "ids": { style: "form", explode: false } })'
    );
  });

  it('allowReserved:true is non-default and emits allowReserved (defaults otherwise)', () => {
    const out = emitWithOp({
      queryParams: [
        { name: 'x', in: 'query', schema: SCALAR, required: false, allowReserved: true },
      ],
    });
    expect(out).toContain(
      '__buildUrl(__config, `/p`, params, { "x": { style: "form", explode: true, allowReserved: true } })'
    );
  });

  it('omits allowReserved when false; only includes non-default params', () => {
    const out = emitWithOp({
      queryParams: [
        { name: 'a', in: 'query', schema: SCALAR, required: false },
        {
          name: 'b',
          in: 'query',
          schema: { kind: 'array', items: SCALAR },
          required: false,
          style: 'spaceDelimited',
          explode: false,
          allowReserved: false,
        },
      ],
    });
    // `b` is the only non-default param; `a` is default (no entry), and
    // `allowReserved: false` is omitted from `b`'s spec.
    expect(out).toContain(
      '__buildUrl(__config, `/p`, params, { "b": { style: "spaceDelimited", explode: false } })'
    );
    expect(out).not.toContain('"a":');
    expect(out).not.toContain('allowReserved:');
  });

  it('explicit deepObject is non-default and emits a spec entry', () => {
    const out = emitWithOp({
      queryParams: [
        {
          name: 'filter',
          in: 'query',
          schema: { kind: 'object', properties: [] },
          required: false,
          style: 'deepObject',
          explode: true,
        },
      ],
    });
    expect(out).toContain(
      '__buildUrl(__config, `/p`, params, { "filter": { style: "deepObject", explode: true } })'
    );
  });

  it('composes the styles arg with the query-auth merge as the 4th arg', () => {
    const out = renderOperationsBlock(
      [
        operation({
          name: 'listPets',
          security: ['QueryKey'],
          queryParams: [
            {
              name: 'tags',
              in: 'query',
              schema: { kind: 'array', items: SCALAR },
              required: false,
              style: 'pipeDelimited',
              explode: false,
            },
          ],
        }),
      ],
      {
        facade: 'functions',
        className: 'Client',
        argsStyle: 'flat',
        queryAuthKeys: new Set(['QueryKey']),
      }
    );
    expect(out).toContain(
      '__buildUrl(__config, `/p`, { ...params, ...__a.query }, { "tags": { style: "pipeDelimited", explode: false } })'
    );
  });

  it('produces `body: T` for required JSON bodies', () => {
    const body: RequestBodyModel = {
      contentType: 'application/json',
      schema: { kind: 'ref', name: 'Pet' },
      required: true,
    };
    const out = emitWithOp({ requestBody: body });
    expect(out).toContain('body: Pet');
  });

  it('produces `body?: T` for optional JSON bodies', () => {
    const body: RequestBodyModel = {
      contentType: 'application/json',
      schema: SCALAR,
      required: false,
    };
    const out = emitWithOp({ requestBody: body });
    expect(out).toContain('body?: string');
  });

  it('uses raw `FormData` for a multipart body that is not a concrete object', () => {
    // A typed object multipart body is covered in the `multipart request bodies (#5)` block;
    // here the schema isn't an object, so the raw FormData escape hatch is kept.
    const body: RequestBodyModel = {
      contentType: 'multipart/form-data',
      schema: { kind: 'unknown' },
      required: true,
    };
    const out = emitWithOp({ requestBody: body });
    expect(out).toContain('body: FormData');
  });

  it('uses `URLSearchParams` for urlencoded bodies', () => {
    const body: RequestBodyModel = {
      contentType: 'application/x-www-form-urlencoded',
      schema: { kind: 'object', properties: [] },
      required: true,
    };
    const out = emitWithOp({ requestBody: body });
    expect(out).toContain('body: URLSearchParams');
  });

  it('uses `Blob | ArrayBuffer` for octet-stream bodies', () => {
    const body: RequestBodyModel = {
      contentType: 'application/octet-stream',
      schema: SCALAR,
      required: true,
    };
    const out = emitWithOp({ requestBody: body });
    expect(out).toContain('body: Blob | ArrayBuffer');
  });

  it('encodes path params via encodeURIComponent in the URL template', () => {
    const out = emitWithOp({
      path: '/x/{id}',
      pathParams: [param('id', 'path', true)],
    });
    expect(out).toContain('${encodeURIComponent(String(id))}');
  });

  it('escapes backticks and backslashes in the path template', () => {
    const out = emitWithOp({ path: '/x/`back\\slash' });
    // Escaped string in the template literal.
    expect(out).toContain('`/x/\\`back\\\\slash`');
  });

  it('upper-cases the HTTP method', () => {
    const out = emitWithOp({ method: 'patch' });
    expect(out).toContain('{ method: "PATCH", ...init }');
  });

  it('passes only url+init+body to __request when responseKind defaults to json', () => {
    const responseSchema: SchemaModel = { kind: 'ref', name: 'Pet' };
    const out = emitWithOp({
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'PetIn' },
        required: true,
      },
      successResponses: [{ contentType: 'application/json', schema: responseSchema, status: 200 }],
    });
    expect(out).toContain('__request<Pet>(');
    // No explicit 'json' arg since that's the default.
    expect(out).not.toMatch(/"json"/);
  });

  it('passes undefined as body placeholder when responseKind is non-json but there is no body', () => {
    const out = emitWithOp({
      successResponses: [{ contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 }],
    });
    // Blob response → kind 'blob' → emitter inserts `undefined` as body placeholder
    // followed by `"blob"` so positional args line up.
    expect(out).toContain('undefined, "blob"');
  });
});

describe("argsStyle: 'grouped' — single options object", () => {
  function emitObj(op: Partial<OperationModel>): string {
    return emitSingleFile(
      apiModel({ services: [{ name: 'Default', operations: [operation(op)] }] }),
      { argsStyle: 'grouped' }
    );
  }

  it('takes no vars object for an operation with no inputs — only the trailing init', () => {
    const out = emitObj({ name: 'op' });
    expect(out).toContain('export async function op(init: RequestOptions = {})');
    expect(out).not.toContain('vars:');
  });

  it('bundles path params into a required `vars: <Op>Variables` and references them via `vars.*`', () => {
    const out = emitObj({
      name: 'getPet',
      path: '/pets/{petId}',
      pathParams: [param('petId', 'path', true)],
    });
    // Required (path params are always required) ⇒ no `= {}` default.
    expect(out).toContain('vars: GetPetVariables,');
    expect(out).not.toContain('vars: GetPetVariables = {}');
    expect(out).toContain('${encodeURIComponent(String(vars.petId))}');
  });

  it('sanitizes non-identifier path param names the same way, prefixed by `vars.`', () => {
    const out = emitObj({
      name: 'getPet',
      path: '/pets/{pet-id}',
      pathParams: [param('pet-id', 'path', true)],
    });
    expect(out).toContain('${encodeURIComponent(String(vars.pet_id))}');
  });

  it('makes `vars` optional (`= {}`) when every input is optional (query only)', () => {
    const out = emitObj({ name: 'listPets', queryParams: [param('q', 'query', false)] });
    expect(out).toContain('vars: ListPetsVariables = {}');
    expect(out).toContain('__buildUrl(__config, `/p`, vars.params)');
  });

  it('makes `vars` required when a query param is required', () => {
    const out = emitObj({ name: 'searchPets', queryParams: [param('q', 'query', true)] });
    expect(out).toContain('vars: SearchPetsVariables,');
    expect(out).not.toContain('vars: SearchPetsVariables = {}');
  });

  it('passes `vars.body` to __request and requires `vars` for a required body', () => {
    const out = emitObj({
      name: 'createPet',
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'Pet' },
        required: true,
      },
    });
    expect(out).toContain('vars: CreatePetVariables,');
    expect(out).not.toContain('vars: CreatePetVariables = {}');
    expect(out).toContain('vars.body');
  });

  it('keeps `vars` optional when the only input is an optional body', () => {
    const out = emitObj({
      name: 'updatePet',
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'PetPatch' },
        required: false,
      },
    });
    expect(out).toContain('vars: UpdatePetVariables = {}');
    expect(out).toContain('vars.body');
  });

  it('passes `vars.headers` straight to __headers for required header params', () => {
    const out = emitObj({ name: 'op', headerParams: [param('X-Token', 'header', true)] });
    expect(out).toContain('...__headers(vars.headers)');
    expect(out).toContain('vars: OpVariables,');
    expect(out).not.toContain('vars.headers ?? {}');
  });

  it('falls back to `{}` for optional header params (which may be absent on vars)', () => {
    const out = emitObj({ name: 'op', headerParams: [param('X-Token', 'header', false)] });
    expect(out).toContain('...__headers(vars.headers ?? {})');
    expect(out).toContain('vars: OpVariables = {}');
  });

  it('works with the service-class facade — methods take the same `vars` object', () => {
    const out = renderOperationsBlock(
      [
        operation({
          name: 'getPet',
          path: '/pets/{id}',
          pathParams: [param('id', 'path', true)],
        }),
      ],
      { facade: 'service-class', className: 'Client', argsStyle: 'grouped' }
    );
    expect(out).toContain('async getPet(vars: GetPetVariables,');
    expect(out).toContain('${encodeURIComponent(String(vars.id))}');
  });
});

describe('operation type aliases (*Result / *Params / *Body / *Variables)', () => {
  it('emits <PascalCaseOpName>Result for every operation, even the trivial void ones', () => {
    const out = emitWithOp({ name: 'ping' });
    expect(out).toContain('export type PingResult = void;');
  });

  it('uses the same response type the function returns', () => {
    const out = emitWithOp({
      name: 'getPet',
      successResponses: [
        {
          contentType: 'application/json',
          status: 200,
          schema: { kind: 'ref', name: 'Pet' },
        },
      ],
    });
    expect(out).toContain('export type GetPetResult = Pet;');
    // The function itself still resolves to the explicit type — aliases are emit-only,
    // they do not rewrite the function signature.
    expect(out).toContain('Promise<Pet>');
  });

  it('skips the *Result alias when it collides with the response schema name (self-referential)', () => {
    // Operation `search` → `SearchResult`, returning the schema named `SearchResult`.
    // Emitting `export type SearchResult = SearchResult;` is circular and collides with
    // the declared schema (TS2440 / barrel TS2308). The method references the schema
    // directly, so the alias is redundant and must be omitted.
    const out = emitSingleFile(
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
    expect(out).toContain('Promise<SearchResult>');
    // Exactly one `SearchResult` declaration — the schema, not a colliding alias.
    expect(out.match(/export type SearchResult\b/g)).toHaveLength(1);
  });

  it('handles unions in the result type', () => {
    const out = emitWithOp({
      name: 'getPhoto',
      successResponses: [
        { contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 },
        { contentType: 'text/plain', schema: { kind: 'unknown' }, status: 200 },
      ],
    });
    expect(out).toContain('export type GetPhotoResult = Blob | string;');
  });

  it('PascalCases an operationId that starts lowercase', () => {
    const out = emitWithOp({ name: 'listMenuItems' });
    expect(out).toContain('export type ListMenuItemsResult');
  });

  it('leaves an already-PascalCase operationId untouched', () => {
    const out = emitWithOp({ name: 'CreateOrder' });
    expect(out).toContain('export type CreateOrderResult');
  });

  it('emits the *Result alias BEFORE the function so it is declared top-down', () => {
    const out = emitWithOp({ name: 'op' });
    const aliasIdx = out.indexOf('export type OpResult');
    const fnIdx = out.indexOf('export async function op(');
    expect(aliasIdx).toBeGreaterThanOrEqual(0);
    expect(fnIdx).toBeGreaterThanOrEqual(0);
    expect(aliasIdx).toBeLessThan(fnIdx);
  });

  it('emits *Params for operations that have query params', () => {
    const out = emitWithOp({
      name: 'listPets',
      queryParams: [
        param('limit', 'query', false, { kind: 'scalar', scalar: 'integer' }),
        param('cursor', 'query', false, SCALAR),
      ],
    });
    expect(out).toContain('export type ListPetsParams =');
    expect(out).toMatch(
      /export type ListPetsParams = \{[\s\S]*?limit\?: number;[\s\S]*?cursor\?: string;[\s\S]*?\};/
    );
  });

  it('omits *Params for operations with no query params', () => {
    const out = emitWithOp({ name: 'ping' });
    expect(out).not.toContain('PingParams');
  });

  it('carries the same per-prop JSDoc tags into the *Params alias as C6.1 emits inline', () => {
    const out = emitWithOp({
      name: 'listPets',
      queryParams: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Page size.',
          schema: {
            kind: 'scalar',
            scalar: 'integer',
            metadata: { minimum: 1, maximum: 100 },
          },
        },
      ],
    });
    // Tags + description appear inside the alias body, not just the function sig.
    expect(out).toMatch(
      /export type ListPetsParams = \{[\s\S]*?Page size\.[\s\S]*?@minimum 1[\s\S]*?@maximum 100[\s\S]*?limit\?: number;[\s\S]*?\};/
    );
  });

  it('marks the *Params alias optionality per-prop, independent of any function-sig default', () => {
    const out = emitWithOp({
      name: 'listPets',
      queryParams: [param('required', 'query', true), param('optional', 'query', false)],
    });
    expect(out).toMatch(
      /export type ListPetsParams = \{[\s\S]*required: string;[\s\S]*optional\?: string;[\s\S]*\};/
    );
  });

  it('emits *Body for operations that have a JSON request body', () => {
    const out = emitWithOp({
      name: 'createPet',
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'Pet' },
        required: true,
      },
    });
    expect(out).toContain('export type CreatePetBody = Pet;');
  });

  it('emits *Body using the same content-type mapping as the function signature', () => {
    const out = emitWithOp({
      name: 'uploadPhoto',
      requestBody: {
        contentType: 'multipart/form-data',
        schema: { kind: 'unknown' },
        required: true,
      },
    });
    expect(out).toContain('export type UploadPhotoBody = FormData;');
  });

  it('emits *Body as `URLSearchParams` for urlencoded bodies', () => {
    const out = emitWithOp({
      name: 'submitForm',
      requestBody: {
        contentType: 'application/x-www-form-urlencoded',
        schema: { kind: 'object', properties: [] },
        required: true,
      },
    });
    expect(out).toContain('export type SubmitFormBody = URLSearchParams;');
  });

  it('omits *Body for operations with no request body', () => {
    const out = emitWithOp({ name: 'ping' });
    expect(out).not.toContain('PingBody');
  });

  it('omits *Variables entirely for operations with no inputs', () => {
    const out = emitWithOp({ name: 'ping' });
    expect(out).not.toContain('PingVariables');
  });

  it('emits *Variables with path params as required properties (path templating requires them)', () => {
    const out = emitWithOp({
      name: 'getPet',
      path: '/pets/{petId}',
      pathParams: [param('petId', 'path', true)],
    });
    expect(out).toMatch(/export type GetPetVariables = \{[\s\S]*petId: string;[\s\S]*\};/);
  });

  it('orders path-param props in URL-template order (not pathParams[] insertion order)', () => {
    const out = emitWithOp({
      name: 'getNested',
      path: '/x/{first}/y/{second}',
      pathParams: [
        param('second', 'path', true, { kind: 'scalar', scalar: 'number' }),
        param('first', 'path', true, { kind: 'scalar', scalar: 'string' }),
      ],
    });
    const match = out.match(/export type GetNestedVariables = \{([\s\S]*?)\};/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body.indexOf('first:')).toBeGreaterThanOrEqual(0);
    expect(body.indexOf('first:')).toBeLessThan(body.indexOf('second:'));
  });

  it('renders JSDoc (description + schema metadata) above path-param props in *Variables', () => {
    const out = emitWithOp({
      name: 'getOrder',
      path: '/orders/{orderId}',
      pathParams: [
        {
          name: 'orderId',
          in: 'path',
          required: true,
          description: 'Order ID.',
          schema: {
            kind: 'scalar',
            scalar: 'string',
            metadata: { pattern: '^ord_[a-z0-9]+$' },
          },
        },
      ],
    });
    expect(out).toMatch(
      /export type GetOrderVariables = \{[\s\S]*Order ID\.[\s\S]*@pattern \^ord_\[a-z0-9\]\+\$[\s\S]*orderId: string;[\s\S]*\};/
    );
  });

  it('references the *Params alias in *Variables when query params exist', () => {
    const out = emitWithOp({
      name: 'listPets',
      queryParams: [param('limit', 'query', false, { kind: 'scalar', scalar: 'integer' })],
    });
    // `params?` (optional) because all query params are optional ⇒ function defaults to `= {}`.
    expect(out).toMatch(
      /export type ListPetsVariables = \{[\s\S]*params\?: ListPetsParams;[\s\S]*\};/
    );
  });

  it('marks *Variables.params required when any query param is required', () => {
    const out = emitWithOp({
      name: 'searchPets',
      queryParams: [param('q', 'query', true), param('limit', 'query', false)],
    });
    expect(out).toMatch(
      /export type SearchPetsVariables = \{[\s\S]*params: SearchPetsParams;[\s\S]*\};/
    );
  });

  it('references the *Body alias in *Variables when the op has a body', () => {
    const out = emitWithOp({
      name: 'createPet',
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'Pet' },
        required: true,
      },
    });
    expect(out).toMatch(/export type CreatePetVariables = \{[\s\S]*body: CreatePetBody;[\s\S]*\};/);
  });

  it('marks *Variables.body optional when the request body is optional', () => {
    const out = emitWithOp({
      name: 'updatePet',
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'PetPatch' },
        required: false,
      },
    });
    expect(out).toMatch(
      /export type UpdatePetVariables = \{[\s\S]*body\?: UpdatePetBody;[\s\S]*\};/
    );
  });

  it('combines path + params + body in *Variables in a stable order: path, params, body', () => {
    const out = emitWithOp({
      name: 'updateOrder',
      path: '/orders/{orderId}',
      pathParams: [param('orderId', 'path', true)],
      queryParams: [param('include', 'query', false)],
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'Order' },
        required: true,
      },
    });
    const match = out.match(/export type UpdateOrderVariables = \{([\s\S]*?)\};/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body.indexOf('orderId')).toBeLessThan(body.indexOf('params'));
    expect(body.indexOf('params')).toBeLessThan(body.indexOf('body'));
  });

  it('emits aliases in the order: Result, Params, Body, Variables', () => {
    const out = emitWithOp({
      name: 'updateOrder',
      path: '/orders/{orderId}',
      pathParams: [param('orderId', 'path', true)],
      queryParams: [param('include', 'query', false)],
      requestBody: {
        contentType: 'application/json',
        schema: { kind: 'ref', name: 'Order' },
        required: true,
      },
      successResponses: [
        {
          contentType: 'application/json',
          status: 200,
          schema: { kind: 'ref', name: 'Order' },
        },
      ],
    });
    const order = [
      'UpdateOrderResult',
      'UpdateOrderParams',
      'UpdateOrderBody',
      'UpdateOrderVariables',
    ].map((a) => ({ a, idx: out.indexOf(a) }));
    for (const { a, idx } of order) {
      expect(idx, `${a} should appear in the output`).toBeGreaterThanOrEqual(0);
    }
    for (let i = 1; i < order.length; i++) {
      expect(order[i].idx, `${order[i].a} should appear after ${order[i - 1].a}`).toBeGreaterThan(
        order[i - 1].idx
      );
    }
  });
});

describe('header parameters (C6.7)', () => {
  it('emits header params as a single `headers` object arg in the signature', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Api-Version', 'header', true)],
    });
    expect(out).toContain('headers: {');
    expect(out).toMatch(/"X-Api-Version": string;/);
  });

  it('makes the `headers` arg required (no `= {}`) when any header param is required', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Api-Version', 'header', true)],
    });
    expect(out).not.toMatch(/headers: \{[\s\S]*?\} = \{\}/);
  });

  it('defaults the `headers` arg to `= {}` when all header params are optional', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Trace', 'header', false)],
    });
    expect(out).toMatch(/headers: \{[\s\S]*?\} = \{\}/);
    expect(out).toMatch(/"X-Trace"\?: string;/);
  });

  it('omits the `headers` arg entirely for operations with no header params', () => {
    const out = emitWithOp({ name: 'ping' });
    expect(out).not.toContain('headers: {');
  });

  it('injects header params into the request, with caller init.headers winning', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Api-Version', 'header', true)],
    });
    // Generated header values come first, caller-supplied init.headers spread last (wins).
    expect(out).toMatch(
      /headers: \{ \.\.\.__headers\(headers\), \.\.\.init\.headers as Record<string, string> \| undefined \}/
    );
  });

  it('emits the __headers runtime helper when any operation has header params', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Api-Version', 'header', true)],
    });
    expect(out).toContain('function __headers(');
  });

  it('renders per-prop JSDoc (description + metadata) on header params', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [
        {
          name: 'X-Api-Version',
          in: 'header',
          required: true,
          description: 'API version pin.',
          schema: {
            kind: 'scalar',
            scalar: 'string',
            metadata: { pattern: '^v\\d+$' },
          },
        },
      ],
    });
    expect(out).toMatch(
      /API version pin\.[\s\S]*@pattern \^v\\d\+\$[\s\S]*"X-Api-Version": string;/
    );
  });

  it('emits a *Headers alias and a headers prop in *Variables', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Api-Version', 'header', true)],
    });
    expect(out).toContain('export type GetThingHeaders =');
    expect(out).toMatch(
      /export type GetThingVariables = \{[\s\S]*headers: GetThingHeaders;[\s\S]*\};/
    );
  });

  it('marks *Variables.headers optional when all header params are optional', () => {
    const out = emitWithOp({
      name: 'getThing',
      headerParams: [param('X-Trace', 'header', false)],
    });
    expect(out).toMatch(
      /export type GetThingVariables = \{[\s\S]*headers\?: GetThingHeaders;[\s\S]*\};/
    );
  });
});

describe('JSDoc on query-param object', () => {
  it('renders each param on its own line so JSDoc can hang above it', () => {
    const out = emitWithOp({
      queryParams: [param('q', 'query', true), param('r', 'query', false)],
    });
    expect(out).toMatch(/params: \{\n {4}q: string;\n {4}r\?: string;\n\}/);
  });

  it('emits JSDoc tags from query param schema metadata', () => {
    const out = emitWithOp({
      queryParams: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: {
            kind: 'scalar',
            scalar: 'integer',
            metadata: { minimum: 1, maximum: 100 },
          },
        },
      ],
    });
    expect(out).toContain('@minimum 1');
    expect(out).toContain('@maximum 100');
  });

  it('emits a single-line JSDoc with the param description', () => {
    const out = emitWithOp({
      queryParams: [
        {
          name: 'q',
          in: 'query',
          required: false,
          description: 'Free-text search.',
          schema: SCALAR,
        },
      ],
    });
    expect(out).toMatch(/\/\*\*\n {5}\* Free-text search\.\n {5}\*\/\n {4}q\?: string;/);
  });

  it('combines the param description and the schema metadata in one block', () => {
    const out = emitWithOp({
      queryParams: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Page size.',
          schema: {
            kind: 'scalar',
            scalar: 'integer',
            metadata: { minimum: 1, maximum: 100 },
          },
        },
      ],
    });
    expect(out).toMatch(/Page size\.[\s\S]*@minimum 1[\s\S]*@maximum 100/);
  });

  it('omits the JSDoc block for a bare query param with no description and no metadata', () => {
    const out = emitWithOp({
      queryParams: [param('q', 'query', false)],
    });
    // Param line is present, but no `/**` directly before it.
    expect(out).toMatch(/\n {4}q\?: string;/);
    expect(out).not.toMatch(/\/\*\*[^/]*\*\/\n {4}q\?: string;/);
  });
});

describe('JSDoc on operations', () => {
  it('emits nothing when there is no summary or description', () => {
    const out = emitWithOp({});
    // No JSDoc immediately before the `export async function op` line.
    expect(out).not.toMatch(/\*\/\nexport async function op\(/);
  });

  it('emits a JSDoc block when only summary is present', () => {
    const out = emitWithOp({ summary: 'one liner' });
    expect(out).toContain('/**\n * one liner\n */');
  });

  it('emits block JSDoc when description spans multiple lines', () => {
    const out = emitWithOp({ description: 'first\nsecond' });
    expect(out).toContain('/**\n * first\n * second\n */');
  });

  it('inserts a blank line between summary and description', () => {
    const out = emitWithOp({ summary: 'sum', description: 'more details' });
    // The intermediate empty line renders as a bare ` *` (trailing space stripped).
    expect(out).toMatch(/\/\*\*\n \* sum\n \*\n \* more details\n \*\//);
  });

  it('trims trailing blank lines so the block has no dangling ` *`', () => {
    const out = emitWithOp({ description: 'details\n' });
    expect(out).toContain('/**\n * details\n */');
    expect(out).not.toMatch(/\* details\n \*\n \*\//);
  });
});

describe('computeResponse — response type discovery', () => {
  it('void when there are no responses', () => {
    const out = emitWithOp({});
    expect(out).toContain('Promise<void>');
  });

  it('JSON: uses the schema directly', () => {
    const out = emitWithOp({
      successResponses: [
        {
          contentType: 'application/json',
          status: 200,
          schema: { kind: 'ref', name: 'Pet' },
        },
      ],
    });
    expect(out).toContain('Promise<Pet>');
  });

  it('Binary-only responses → Blob and responseKind=blob', () => {
    const out = emitWithOp({
      successResponses: [{ contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 }],
    });
    expect(out).toContain('Promise<Blob>');
    expect(out).toContain('"blob"');
  });

  it('Text-only responses → string and responseKind=text', () => {
    const out = emitWithOp({
      successResponses: [{ contentType: 'text/plain', schema: { kind: 'unknown' }, status: 200 }],
    });
    expect(out).toContain('Promise<string>');
    expect(out).toContain('"text"');
  });

  it('Mixed binary + text responses pick blob (hasBinary wins) and dedupe types', () => {
    const out = emitWithOp({
      successResponses: [
        { contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 },
        { contentType: 'text/plain', schema: { kind: 'unknown' }, status: 200 },
      ],
    });
    expect(out).toContain('Promise<Blob | string>');
    expect(out).toContain('"blob"');
  });

  it('dedupes identical non-json response types into a single Blob', () => {
    const out = emitWithOp({
      successResponses: [
        { contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 },
        { contentType: 'image/jpeg', schema: { kind: 'unknown' }, status: 200 },
      ],
    });
    // Both binary content types collapse to one `Blob` (no `Blob | Blob`).
    expect(out).toContain('Promise<Blob>');
    expect(out).not.toContain('Blob | Blob');
    expect(out).toContain('"blob"');
  });

  it('Non-json/non-binary/non-text responses fall back to renderSchema with responseKind=json', () => {
    const out = emitWithOp({
      successResponses: [
        {
          contentType: 'application/xml',
          status: 200,
          schema: { kind: 'ref', name: 'XmlBody' },
        },
      ],
    });
    expect(out).toContain('Promise<XmlBody>');
    // responseKind is 'json' (default) because hasBinary && hasText were both false.
    expect(out).not.toContain('"blob"');
    expect(out).not.toContain('"text"');
  });

  it('Picks JSON when both JSON and non-JSON content types coexist', () => {
    const out = emitWithOp({
      successResponses: [
        { contentType: 'application/xml', schema: { kind: 'ref', name: 'X' }, status: 200 },
        { contentType: 'application/json', schema: { kind: 'ref', name: 'J' }, status: 200 },
      ],
    });
    expect(out).toContain('Promise<J>');
  });
});

describe('emitOperations — multiple operations', () => {
  it('renders each operation across services', () => {
    const op1 = operation({ name: 'a', path: '/a' });
    const op2 = operation({ name: 'b', path: '/b' });
    const op3 = operation({ name: 'c', path: '/c' });
    const out = emitSingleFile(
      apiModel({
        services: [
          { name: 'S1', operations: [op1, op2] },
          { name: 'S2', operations: [op3] },
        ],
      })
    );
    expect(out).toContain('export async function a(');
    expect(out).toContain('export async function b(');
    expect(out).toContain('export async function c(');
  });
});

describe('response argument layout in __request', () => {
  it('emits body placeholder + responseKind together when both bodyVar exists and responseKind is non-json', () => {
    const out = emitWithOp({
      requestBody: {
        contentType: 'application/json',
        schema: SCALAR,
        required: true,
      },
      successResponses: [{ contentType: 'image/png', schema: { kind: 'unknown' }, status: 200 }],
    });
    // Should have: config, url, init, body, "blob"
    expect(out).toContain('body, "blob"');
  });
});

describe('responses ignored details', () => {
  // Belt-and-braces test to keep ResponseBodyModel non-trivial parsing exercised.
  it('preserves a textual response schema when content-type is text/*', () => {
    const resp: ResponseBodyModel = {
      contentType: 'text/plain',
      status: 200,
      schema: { kind: 'unknown' },
    };
    const out = emitWithOp({ successResponses: [resp] });
    expect(out).toContain('Promise<string>');
  });
});

describe('SSE — async generators + sse aggregate', () => {
  const sseResponse: ResponseBodyModel = {
    contentType: 'text/event-stream',
    status: 200,
    schema: { kind: 'unknown' },
    itemSchema: { kind: 'ref', name: 'Message' },
  };

  function sseOp(over: Partial<OperationModel> = {}): OperationModel {
    return operation({
      name: 'streamMessages',
      path: '/messages',
      queryParams: [param('after', 'query', false)],
      successResponses: [sseResponse],
      ...over,
    });
  }

  it('functions facade: emits a NON-exported async generator + a `sse` aggregate', () => {
    const out = renderOperationsBlock(
      [sseOp(), operation({ name: 'listThings', path: '/things' })],
      {
        facade: 'functions',
        className: 'Ignored',
      }
    );
    expect(out).toContain('async function* streamMessages(');
    // The generator is not individually exported — only the aggregate is.
    expect(out).not.toContain('export async function* streamMessages');
    expect(out).toContain('yield* __sse<Message>');
    expect(out).toContain(', "json");');
    expect(out).toContain('export const sse = { streamMessages };');
    // The regular op is still its own export, and is NOT in the sse object.
    expect(out).toContain('export async function listThings(');
    expect(out).not.toContain('sse = { streamMessages, listThings }');
  });

  it('functions facade: a string-event SSE op streams ServerSentEvent<string> via __sse<string> + text', () => {
    const out = renderOperationsBlock(
      [
        sseOp({
          successResponses: [
            { contentType: 'text/event-stream', schema: { kind: 'unknown' }, status: 200 },
          ],
        }),
      ],
      { facade: 'functions', className: 'C' }
    );
    expect(out).toContain('yield* __sse<string>');
    expect(out).toContain(', "text");');
    expect(out).toContain('AsyncGenerator<ServerSentEvent<string>>');
  });

  it('the SSE op trailing init param is `SseOptions`; regular ops stay `RequestOptions`', () => {
    const out = renderOperationsBlock(
      [sseOp(), operation({ name: 'listThings', path: '/things' })],
      {
        facade: 'functions',
        className: 'C',
      }
    );
    expect(out).toContain('init: SseOptions');
    expect(out).toContain('init: RequestOptions');
  });

  it('the SSE op exposes its input aliases but NOT a *Result alias', () => {
    const out = renderOperationsBlock([sseOp()], { facade: 'functions', className: 'C' });
    expect(out).toContain('export type StreamMessagesParams');
    expect(out).not.toContain('StreamMessagesResult');
  });

  it('an authed SSE op awaits __auth before delegating to __sse, and merges __a.query/headers', () => {
    const out = renderOperationsBlock([sseOp({ security: ['QueryKey'] })], {
      facade: 'functions',
      className: 'C',
      queryAuthKeys: new Set(['QueryKey']),
    });
    // The auth prefix is resolved up front (lazily, on first iteration), then the
    // generator delegates to __sse — credentials merge into URL query + headers.
    expect(out).toContain('const __a = await __auth(["QueryKey"], __config);');
    expect(out).toContain('...__a.query');
    expect(out).toContain('...__a.headers');
    expect(out).toContain('yield* __sse<Message>');
  });

  it('service-class facade: emits a `private async *` method + a `readonly sse` field', () => {
    const out = renderOperationsBlock([sseOp()], {
      facade: 'service-class',
      className: 'MessagesService',
    });
    expect(out).toContain('private async *streamMessages(');
    expect(out).toContain('readonly sse = { streamMessages: this.streamMessages.bind(this) };');
  });

  it('a block with NO SSE ops emits no sse aggregate / no __sse', () => {
    const out = renderOperationsBlock([operation({ name: 'listThings', path: '/things' })], {
      facade: 'functions',
      className: 'C',
    });
    expect(out).not.toContain('export const sse');
    expect(out).not.toContain('__sse');
  });

  it('service-class with NO SSE ops emits no readonly sse field', () => {
    const out = renderOperationsBlock([operation({ name: 'listThings', path: '/things' })], {
      facade: 'service-class',
      className: 'C',
    });
    expect(out).not.toContain('readonly sse');
    expect(out).not.toContain('__sse');
  });

  it('honors a custom sseExportName, defaulting to `sse`', () => {
    const out = renderOperationsBlock([sseOp()], {
      facade: 'functions',
      className: 'C',
      sseExportName: 'streams',
    });
    expect(out).toContain('export const streams = { streamMessages };');
  });
});

describe('renderOperationsMeta — OPERATIONS metadata map', () => {
  it('returns an empty string when there are no operations', () => {
    expect(renderOperationsMeta([])).toBe('');
  });

  it('emits one entry per operation keyed by operationId, with uppercased method and path template', () => {
    const out = renderOperationsMeta([
      operation({
        name: 'getProjectById',
        method: 'get',
        path: '/orgs/{orgId}/projects/{projectId}',
      }),
      operation({
        name: 'createProject',
        method: 'post',
        path: '/orgs/{orgId}/projects',
      }),
    ]);
    expect(out).toContain(
      'getProjectById: { method: "GET", path: "/orgs/{orgId}/projects/{projectId}" }'
    );
    expect(out).toContain('createProject: { method: "POST", path: "/orgs/{orgId}/projects" }');
  });

  it('emits the OperationId and OperationMetadata helper types', () => {
    const out = renderOperationsMeta([operation({ name: 'getThing' })]);
    expect(out).toContain('export const OPERATIONS = {');
    expect(out).toContain('} as const;');
    expect(out).toContain('export type OperationId = keyof typeof OPERATIONS;');
    expect(out).toMatch(
      /export type OperationMetadata = \{\n {4}readonly method: string;\n {4}readonly path: string;\n\};/
    );
  });

  it('quotes operationIds that are not bare identifiers', () => {
    const out = renderOperationsMeta([operation({ name: 'weird-op', path: '/w' })]);
    expect(out).toContain('"weird-op": { method: "GET", path: "/w" }');
  });

  it('is included in single-file output between the type guards and the runtime', () => {
    const out = emitWithOp({
      name: 'listThings',
      method: 'get',
      path: '/things',
    });
    expect(out).toContain('export const OPERATIONS = {');
    expect(out).toContain('listThings: { method: "GET", path: "/things" }');
    // Metadata is declarative data, so it precedes the runtime (`let BASE`).
    expect(out.indexOf('export const OPERATIONS = {')).toBeLessThan(out.indexOf('let BASE ='));
  });

  it('is omitted from single-file output when the document has no operations', () => {
    expect(emitSingleFile(apiModel())).not.toContain('export const OPERATIONS');
  });
});
