import { normalizeSwagger2 } from '../normalize-swagger2.js';

function s2(extra: Record<string, unknown>): Record<string, unknown> {
  return { swagger: '2.0', info: { title: 'T', version: '1' }, paths: {}, ...extra };
}

describe('normalizeSwagger2 — scaffold', () => {
  it('builds servers[0].url from schemes + host + basePath', () => {
    const out = normalizeSwagger2(
      s2({ schemes: ['https'], host: 'api.example.com', basePath: '/v1' }) as never
    );
    expect(out.servers).toEqual([{ url: 'https://api.example.com/v1' }]);
  });

  it('defaults scheme to https and tolerates missing host/basePath', () => {
    const out = normalizeSwagger2(s2({ host: 'api.example.com' }) as never);
    expect(out.servers).toEqual([{ url: 'https://api.example.com' }]);
  });

  it('maps definitions to components.schemas and rewrites #/definitions refs', () => {
    const out = normalizeSwagger2(
      s2({
        definitions: {
          Pet: { type: 'object', properties: { owner: { $ref: '#/definitions/Owner' } } },
          Owner: { type: 'object', properties: { name: { type: 'string' } } },
        },
      }) as never
    );
    expect((out.components as { schemas: Record<string, unknown> }).schemas.Owner).toBeDefined();
    const pet = (
      out.components as { schemas: Record<string, { properties: { owner: { $ref: string } } }> }
    ).schemas.Pet;
    expect(pet.properties.owner.$ref).toBe('#/components/schemas/Owner');
  });

  it('maps securityDefinitions: basic→http/basic, apiKey passes through, oauth2 flow→flows', () => {
    const out = normalizeSwagger2(
      s2({
        securityDefinitions: {
          Basic: { type: 'basic' },
          ApiKey: { type: 'apiKey', name: 'X-Key', in: 'header' },
          OAuth: {
            type: 'oauth2',
            flow: 'accessCode',
            authorizationUrl: 'https://a',
            tokenUrl: 'https://t',
            scopes: { read: 'r' },
          },
        },
      }) as never
    );
    const ss = (out.components as { securitySchemes: Record<string, Record<string, unknown>> })
      .securitySchemes;
    expect(ss.Basic).toEqual({ type: 'http', scheme: 'basic' });
    expect(ss.ApiKey).toEqual({ type: 'apiKey', name: 'X-Key', in: 'header' });
    expect(ss.OAuth.type).toBe('oauth2');
    expect((ss.OAuth.flows as Record<string, unknown>).authorizationCode).toBeDefined();
  });

  it('sets openapi: 3.0.3 and drops swagger/host/basePath/schemes/definitions/securityDefinitions', () => {
    const out = normalizeSwagger2(
      s2({ host: 'h', definitions: {}, securityDefinitions: {} }) as never
    ) as unknown as Record<string, unknown>;
    expect(out.openapi).toBe('3.0.3');
    expect(out.swagger).toBeUndefined();
    expect(out.host).toBeUndefined();
    expect(out.definitions).toBeUndefined();
    expect(out.securityDefinitions).toBeUndefined();
  });
});

describe('normalizeSwagger2 — scaffold (extra coverage)', () => {
  it('omits servers when host is absent', () => {
    const out = normalizeSwagger2(s2({}) as never) as unknown as Record<string, unknown>;
    expect(out.servers).toBeUndefined();
  });

  it('maps top-level parameters to components.parameters, nesting inline types under schema', () => {
    const sharedParam = { name: 'id', in: 'path', required: true, type: 'integer' };
    const out = normalizeSwagger2(s2({ parameters: { PetId: sharedParam } }) as never);
    expect((out.components as { parameters: Record<string, unknown> }).parameters).toEqual({
      PetId: { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
    });
  });

  it('maps top-level responses to components.responses via normalizeResponses', () => {
    const out = normalizeSwagger2(
      s2({
        responses: { NotFound: { description: 'not found' } },
        produces: ['application/json'],
      }) as never
    );
    // No schema on the response → passes through unchanged
    expect((out.components as { responses: Record<string, unknown> }).responses).toEqual({
      NotFound: { description: 'not found' },
    });
  });

  it('falls through to default in mapSecurityScheme for unknown types', () => {
    const out = normalizeSwagger2(
      s2({ securityDefinitions: { Bearer: { type: 'http', scheme: 'bearer' } } }) as never
    );
    const ss = (out.components as { securitySchemes: Record<string, Record<string, unknown>> })
      .securitySchemes;
    // Unknown type → returned as-is
    expect(ss.Bearer).toEqual({ type: 'http', scheme: 'bearer' });
  });

  it('maps oauth2 implicit flow by its original name', () => {
    const out = normalizeSwagger2(
      s2({
        securityDefinitions: {
          Implicit: {
            type: 'oauth2',
            flow: 'implicit',
            authorizationUrl: 'https://a',
            scopes: { read: 'r' },
          },
        },
      }) as never
    );
    const ss = (out.components as { securitySchemes: Record<string, Record<string, unknown>> })
      .securitySchemes;
    expect((ss.Implicit.flows as Record<string, unknown>).implicit).toBeDefined();
  });

  it('maps oauth2 application flow to clientCredentials', () => {
    const out = normalizeSwagger2(
      s2({
        securityDefinitions: {
          AppFlow: {
            type: 'oauth2',
            flow: 'application',
            tokenUrl: 'https://t',
            scopes: { write: 'w' },
          },
        },
      }) as never
    );
    const ss = (out.components as { securitySchemes: Record<string, Record<string, unknown>> })
      .securitySchemes;
    expect((ss.AppFlow.flows as Record<string, unknown>).clientCredentials).toBeDefined();
  });

  it('maps collectionFormat to OAS3 style/explode — Swagger arrays default to csv, not multi', () => {
    const param = (collectionFormat?: string) => ({
      name: 'ids',
      in: 'query',
      type: 'array',
      items: { type: 'string' },
      ...(collectionFormat ? { collectionFormat } : {}),
    });
    const out = normalizeSwagger2(
      s2({
        paths: {
          '/x': {
            get: {
              operationId: 'op',
              parameters: [param(), param('csv'), param('ssv'), param('pipes'), param('multi')],
              responses: {},
            },
          },
        },
      }) as never
    );
    const params = (
      (out.paths as Record<string, Record<string, Record<string, unknown>>>)['/x'].get as {
        parameters: Array<Record<string, unknown>>;
      }
    ).parameters;
    // csv is the Swagger 2 default, so an absent collectionFormat maps the same way.
    expect(params[0]).toMatchObject({ style: 'form', explode: false });
    expect(params[1]).toMatchObject({ style: 'form', explode: false });
    expect(params[2]).toMatchObject({ style: 'spaceDelimited', explode: false });
    expect(params[3]).toMatchObject({ style: 'pipeDelimited', explode: false });
    // multi IS the OAS3 default (form + explode) — nothing to record.
    expect(params[4].style).toBeUndefined();
    expect(params[4].explode).toBeUndefined();
    for (const p of params) expect(p.collectionFormat).toBeUndefined();
  });

  it('normalizes path-item parameters (inline type → schema) and passes other keys through', () => {
    const out = normalizeSwagger2(
      s2({
        paths: {
          '/pets/{id}': {
            'x-note': 'kept',
            parameters: [
              { name: 'id', in: 'path', required: true, type: 'integer' },
              { $ref: '#/parameters/Verbose' },
            ],
            get: { operationId: 'getPet', parameters: [], responses: {} },
          },
        },
        parameters: { Verbose: { name: 'verbose', in: 'query', type: 'boolean' } },
      }) as never
    );
    const item = (out.paths as Record<string, Record<string, unknown>>)['/pets/{id}'];
    expect(item['x-note']).toBe('kept');
    expect(item.parameters).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      // A $ref passes through untouched (already rewritten to its components home).
      { $ref: '#/components/parameters/Verbose' },
    ]);
  });
});

describe('normalizeSwagger2 — operations', () => {
  function op(
    operation: Record<string, unknown>,
    rootConsumes?: string[],
    rootProduces?: string[]
  ) {
    const out = normalizeSwagger2({
      swagger: '2.0',
      info: { title: 'T', version: '1' },
      ...(rootConsumes ? { consumes: rootConsumes } : {}),
      ...(rootProduces ? { produces: rootProduces } : {}),
      paths: { '/x': { post: operation } },
    } as never);
    return (out.paths as Record<string, Record<string, Record<string, unknown>>>)['/x'].post;
  }

  it('wraps a non-body param inline type into `schema`', () => {
    const post = op({
      operationId: 'a',
      parameters: [{ name: 'q', in: 'query', required: true, type: 'string' }],
      responses: {},
    });
    expect((post.parameters as Array<Record<string, unknown>>)[0]).toEqual({
      name: 'q',
      in: 'query',
      required: true,
      schema: { type: 'string' },
    });
  });

  it('converts an in:body param to requestBody using consumes[0]', () => {
    const post = op({
      operationId: 'a',
      consumes: ['application/json'],
      parameters: [
        { name: 'b', in: 'body', required: true, schema: { $ref: '#/components/schemas/Pet' } },
      ],
      responses: {},
    });
    expect(post.requestBody).toEqual({
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
    });
    expect((post.parameters as unknown[]).length).toBe(0);
  });

  it('aggregates in:formData params into a urlencoded object requestBody', () => {
    const post = op({
      operationId: 'a',
      consumes: ['application/x-www-form-urlencoded'],
      parameters: [
        { name: 'f1', in: 'formData', required: true, type: 'string' },
        { name: 'f2', in: 'formData', type: 'integer' },
      ],
      responses: {},
    });
    expect(post.requestBody).toEqual({
      required: true,
      content: {
        'application/x-www-form-urlencoded': {
          schema: {
            type: 'object',
            required: ['f1'],
            properties: { f1: { type: 'string' }, f2: { type: 'integer' } },
          },
        },
      },
    });
  });

  it('falls back to application/json when consumes is absent (root or op)', () => {
    const post = op({
      operationId: 'a',
      parameters: [{ name: 'b', in: 'body', required: true, schema: { type: 'object' } }],
      responses: {},
    });
    expect(
      (post.requestBody as { content: Record<string, unknown> }).content['application/json']
    ).toBeDefined();
  });

  it('wraps response.schema into content using produces[0] (root fallback)', () => {
    const post = op(
      {
        operationId: 'a',
        parameters: [],
        responses: { '200': { description: 'ok', schema: { $ref: '#/components/schemas/Pet' } } },
      },
      undefined,
      ['application/json']
    );
    expect(post.responses).toEqual({
      '200': {
        description: 'ok',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
      },
    });
  });

  it('leaves a response without a schema untouched (no content)', () => {
    const post = op({
      operationId: 'a',
      parameters: [],
      responses: { '204': { description: 'no content' } },
    });
    expect(post.responses).toEqual({ '204': { description: 'no content' } });
  });

  it('handles an operation with no responses field', () => {
    const post = op({ operationId: 'a', parameters: [] });
    expect(post.responses).toBeUndefined();
  });

  it('uses multipart/form-data when declared in consumes for formData params', () => {
    const post = op({
      operationId: 'a',
      consumes: ['multipart/form-data'],
      parameters: [{ name: 'file', in: 'formData', required: true, type: 'string' }],
      responses: {},
    });
    expect(
      (post.requestBody as { content: Record<string, unknown> }).content['multipart/form-data']
    ).toBeDefined();
  });

  it('uses application/x-www-form-urlencoded when consumes is absent for formData params', () => {
    const post = op({
      operationId: 'a',
      parameters: [{ name: 'f1', in: 'formData', type: 'string' }],
      responses: {},
    });
    expect(
      (post.requestBody as { content: Record<string, unknown> }).content[
        'application/x-www-form-urlencoded'
      ]
    ).toBeDefined();
  });

  it('handles operation with no parameters field (undefined fallback)', () => {
    const post = op({ operationId: 'a', responses: {} });
    expect(post.parameters).toEqual([]);
  });
});

describe('normalizeSwagger2 — edge cases', () => {
  it('handles doc with no paths field (undefined fallback)', () => {
    const doc = { swagger: '2.0', info: { title: 'T', version: '1' } };
    const out = normalizeSwagger2(doc as never) as unknown as Record<string, unknown>;
    expect(out.paths).toEqual({});
  });

  it('uses https when schemes array is empty', () => {
    const out = normalizeSwagger2(s2({ schemes: [], host: 'api.example.com' }) as never);
    expect(out.servers).toEqual([{ url: 'https://api.example.com' }]);
  });

  it('maps oauth2 with no scopes to empty object', () => {
    const out = normalizeSwagger2(
      s2({
        securityDefinitions: {
          OAuth: { type: 'oauth2', flow: 'implicit', authorizationUrl: 'https://a' },
        },
      }) as never
    );
    const ss = (out.components as { securitySchemes: Record<string, Record<string, unknown>> })
      .securitySchemes;
    const flows = ss.OAuth.flows as Record<string, Record<string, unknown>>;
    expect(flows.implicit.scopes).toEqual({});
  });
});
