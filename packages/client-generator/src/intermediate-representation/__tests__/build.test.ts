import type { Oas3Definition, Oas3Schema } from '@redocly/openapi-core';

import { NotSupportedError } from '../../errors.js';
import { buildApiModel } from '../build.js';
import type { OperationModel, SchemaModel } from '../model.js';

/**
 * Build a minimal Oas3Definition wrapper so each test only declares the part it
 * cares about. Cast through `unknown` so callers may pass partial fixtures.
 */
function doc(partial: Partial<Oas3Definition>): Oas3Definition {
  return {
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    ...partial,
  } as Oas3Definition;
}

/** Convenience: invoke buildApiModel and return the first named schema. */
function buildSchemaOnly(schema: Oas3Schema): SchemaModel {
  const model = buildApiModel(
    doc({ components: { schemas: { X: schema as Oas3Schema } } } as Partial<Oas3Definition>)
  );
  return model.schemas[0].schema;
}

/** Convenience: invoke buildApiModel and return the only operation. */
function buildOpOnly(input: Partial<Oas3Definition>): OperationModel {
  const model = buildApiModel(doc(input));
  return model.services[0].operations[0];
}

describe('buildApiModel — operationId fallback naming', () => {
  function opsOf(paths: Record<string, unknown>): OperationModel[] {
    return buildApiModel(doc({ paths } as Partial<Oas3Definition>)).services[0].operations;
  }
  const res = { '200': { description: 'ok' } };

  it('synthesizes <method><PascalSegments> when operationId is absent', () => {
    expect(opsOf({ '/pets': { get: { responses: res } } })[0].name).toBe('getPets');
  });

  it('includes path-param segments (so collection vs item stay distinct)', () => {
    expect(opsOf({ '/pets/{petId}': { get: { responses: res } } })[0].name).toBe('getPetsPetId');
  });

  it('splits non-identifier characters in a segment into words', () => {
    expect(opsOf({ '/pets/{pet-id}': { get: { responses: res } } })[0].name).toBe('getPetsPetId');
  });

  it('falls back to just the method for the root path', () => {
    expect(opsOf({ '/': { get: { responses: res } } })[0].name).toBe('get');
  });

  it('keeps a declared operationId (it wins over synthesis)', () => {
    expect(opsOf({ '/pets': { get: { operationId: 'listPets', responses: res } } })[0].name).toBe(
      'listPets'
    );
  });

  it('uniquifies a synthesized name that collides with a declared operationId', () => {
    const names = opsOf({
      '/pets': { get: { responses: res }, post: { operationId: 'getPets', responses: res } },
    })
      .map((o) => o.name)
      .sort();
    expect(names).toEqual(['getPets', 'getPets2']);
  });
});

describe('buildApiModel — top-level metadata', () => {
  it('reads title/version/description/serverUrl from info & servers', () => {
    const model = buildApiModel(
      doc({
        info: { title: 'My API', version: '2.0.0', description: 'docs here' },
        servers: [{ url: 'https://api.example.com' }, { url: 'https://api.backup.com' }],
      })
    );
    expect(model.title).toBe('My API');
    expect(model.version).toBe('2.0.0');
    expect(model.description).toBe('docs here');
    expect(model.serverUrl).toBe('https://api.example.com');
  });

  it('falls back to defaults when info/servers are missing', () => {
    const model = buildApiModel({ openapi: '3.0.3', paths: {} } as Oas3Definition);
    expect(model.title).toBe('Api');
    expect(model.version).toBe('0.0.0');
    expect(model.description).toBeUndefined();
    expect(model.serverUrl).toBe('');
  });

  it('emits an empty schemas array when components.schemas is absent', () => {
    const model = buildApiModel(doc({}));
    expect(model.schemas).toEqual([]);
  });

  it('tolerates documents that have no `paths` field at all', () => {
    const model = buildApiModel({
      openapi: '3.0.3',
      info: { title: 't', version: '1' },
    } as Oas3Definition);
    expect(model.services[0].operations).toEqual([]);
  });
});

describe('buildNamedSchemas', () => {
  it('builds inline schemas with their description', () => {
    const model = buildApiModel(
      doc({
        components: {
          schemas: {
            Foo: { type: 'string', description: 'a foo' } as Oas3Schema,
          },
        },
      } as Partial<Oas3Definition>)
    );
    expect(model.schemas[0]).toEqual({
      name: 'Foo',
      schema: { kind: 'scalar', scalar: 'string', description: 'a foo' },
      description: 'a foo',
    });
  });

  it('forwards a $ref-only schema entry to its target', () => {
    const model = buildApiModel(
      doc({
        components: {
          schemas: {
            Target: { type: 'string', description: 'target desc' } as Oas3Schema,
            Alias: { $ref: '#/components/schemas/Target' } as unknown as Oas3Schema,
          },
        },
      } as Partial<Oas3Definition>)
    );
    const alias = model.schemas.find((s) => s.name === 'Alias');
    expect(alias?.schema).toMatchObject({ kind: 'scalar', scalar: 'string' });
    expect(alias?.description).toBe('target desc');
  });
});

describe('buildServices — paths & methods', () => {
  it('skips falsy path items', () => {
    const model = buildApiModel(
      doc({ paths: { '/skip': null as unknown as never } } as Partial<Oas3Definition>)
    );
    expect(model.services[0].operations).toEqual([]);
  });

  it('dereferences $ref path items', () => {
    const model = buildApiModel(
      doc({
        paths: {
          '/proxy': { $ref: '#/x-stash/pathA' } as unknown as never,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ 'x-stash': { pathA: { get: { operationId: 'opA', responses: {} } } } } as any),
      })
    );
    expect(model.services[0].operations[0].name).toBe('opA');
  });

  it('iterates every HTTP method that is present', () => {
    const make = (id: string) => ({ operationId: id, responses: {} });
    const model = buildApiModel(
      doc({
        paths: {
          '/m': {
            get: make('g'),
            post: make('po'),
            put: make('pu'),
            delete: make('d'),
            patch: make('pa'),
            head: make('h'),
            options: make('o'),
          } as never,
        },
      })
    );
    expect(model.services[0].operations.map((op) => op.method)).toEqual([
      'get',
      'post',
      'put',
      'delete',
      'patch',
      'head',
      'options',
    ]);
  });

  it('propagates path-level parameters and lets operation-level params override them', () => {
    const op = buildOpOnly({
      paths: {
        '/users/{id}': {
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'verbose', in: 'query', schema: { type: 'boolean' } },
          ] as never,
          get: {
            operationId: 'getUser',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.pathParams.find((p) => p.name === 'id')?.schema).toEqual({
      kind: 'scalar',
      scalar: 'integer',
    });
    expect(op.queryParams.find((p) => p.name === 'verbose')).toBeTruthy();
  });
});

describe('buildOperation — tags', () => {
  it('carries the operation tags through to the model', () => {
    const op = buildOpOnly({
      paths: {
        '/pets': {
          get: { operationId: 'listPets', tags: ['pets', 'public'], responses: {} },
        } as never,
      },
    });
    expect(op.tags).toEqual(['pets', 'public']);
  });

  it('defaults to an empty tags array when the operation declares none', () => {
    const op = buildOpOnly({
      paths: { '/health': { get: { operationId: 'health', responses: {} } } as never },
    });
    expect(op.tags).toEqual([]);
  });
});

describe('buildOperation — x-pagination extension', () => {
  it('captures the x-pagination value verbatim, without validation', () => {
    const extension = { style: 'cursor', cursorParam: 'cursor', bogus: 42 };
    const op = buildOpOnly({
      paths: {
        '/orders': {
          get: { operationId: 'listOrders', 'x-pagination': extension, responses: {} },
        } as never,
      },
    });
    expect(op.paginationExtension).toBe(extension);
  });

  it('captures a non-object x-pagination value too (validated by the emitter, not the IR)', () => {
    const op = buildOpOnly({
      paths: {
        '/orders': {
          get: { operationId: 'listOrders', 'x-pagination': 'nonsense', responses: {} },
        } as never,
      },
    });
    expect(op.paginationExtension).toBe('nonsense');
  });

  it('leaves paginationExtension absent when the operation declares none', () => {
    const op = buildOpOnly({
      paths: { '/orders': { get: { operationId: 'listOrders', responses: {} } } as never },
    });
    expect('paginationExtension' in op).toBe(false);
  });
});

describe('buildOperation — param paths', () => {
  it('splits parameters by their `in` location', () => {
    const op = buildOpOnly({
      paths: {
        '/x/{p}': {
          get: {
            operationId: 'op',
            parameters: [
              { name: 'p', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'q', in: 'query', schema: { type: 'string' } },
              { name: 'X-Tok', in: 'header', schema: { type: 'string' } },
              { name: 'c', in: 'cookie', schema: { type: 'string' } },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.pathParams.map((p) => p.name)).toEqual(['p']);
    expect(op.queryParams.map((p) => p.name)).toEqual(['q']);
    expect(op.headerParams.map((p) => p.name)).toEqual(['X-Tok']);
  });

  it('resolves a $ref requestBody', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          post: {
            operationId: 'create',
            requestBody: { $ref: '#/components/requestBodies/CreateBody' } as never,
            responses: {},
          },
        } as never,
      },
      components: {
        requestBodies: {
          CreateBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'string' } } },
          },
        },
      } as never,
    });
    expect(op.requestBody?.contentType).toBe('application/json');
    expect(op.requestBody?.required).toBe(true);
  });

  it('omits requestBody when the operation has none', () => {
    const op = buildOpOnly({
      paths: {
        '/x': { get: { operationId: 'op', responses: {} } } as never,
      },
    });
    expect(op.requestBody).toBeUndefined();
  });
});

describe('buildParameter', () => {
  it('throws when `in` is missing', () => {
    expect(() =>
      buildApiModel(
        doc({
          paths: {
            '/x': {
              get: {
                operationId: 'op',
                parameters: [{ name: 'p', schema: { type: 'string' } }] as never,
                responses: {},
              },
            } as never,
          },
        })
      )
    ).toThrow(/missing "in"/);
  });

  it('throws for an unsupported `in` value', () => {
    expect(() =>
      buildApiModel(
        doc({
          paths: {
            '/x': {
              get: {
                operationId: 'op',
                parameters: [{ name: 'p', in: 'body', schema: { type: 'string' } }] as never,
                responses: {},
              },
            } as never,
          },
        })
      )
    ).toThrow(/Unsupported parameter location/);
  });

  it('produces an unknown schema when none is declared', () => {
    const op = buildOpOnly({
      paths: {
        '/x/{p}': {
          get: {
            operationId: 'op',
            parameters: [{ name: 'p', in: 'path', required: true }] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.pathParams[0].schema).toEqual({ kind: 'unknown' });
  });

  it('preserves $ref-typed parameter schemas', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            parameters: [
              { name: 'q', in: 'query', schema: { $ref: '#/components/schemas/Id' } as never },
            ] as never,
            responses: {},
          },
        } as never,
      },
      components: { schemas: { Id: { type: 'string' } } as never },
    });
    expect(op.queryParams[0].schema).toEqual({ kind: 'ref', name: 'Id' });
  });

  it('passes through description and required', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            parameters: [
              {
                name: 'q',
                in: 'query',
                required: true,
                description: 'desc',
                schema: { type: 'string' },
              },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.queryParams[0]).toMatchObject({ description: 'desc', required: true });
  });

  it('captures style/explode on a query param', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            parameters: [
              {
                name: 'tags',
                in: 'query',
                style: 'pipeDelimited',
                explode: false,
                schema: { type: 'array', items: { type: 'string' } },
              },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.queryParams[0]).toMatchObject({ style: 'pipeDelimited', explode: false });
  });

  it('captures allowReserved on a query param', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            parameters: [
              { name: 'q', in: 'query', allowReserved: true, schema: { type: 'string' } },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.queryParams[0].allowReserved).toBe(true);
  });

  it('leaves style/explode/allowReserved undefined on a plain query param', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.queryParams[0].style).toBeUndefined();
    expect(op.queryParams[0].explode).toBeUndefined();
    expect(op.queryParams[0].allowReserved).toBeUndefined();
  });

  it('ignores an unknown style string (leaves style undefined)', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            parameters: [
              { name: 'q', in: 'query', style: 'matrix', schema: { type: 'string' } },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.queryParams[0].style).toBeUndefined();
  });

  it('does not set style/explode/allowReserved on non-query params', () => {
    const op = buildOpOnly({
      paths: {
        '/x/{p}': {
          get: {
            operationId: 'op',
            parameters: [
              {
                name: 'p',
                in: 'path',
                required: true,
                style: 'pipeDelimited',
                explode: false,
                allowReserved: true,
                schema: { type: 'string' },
              },
              {
                name: 'X-Tok',
                in: 'header',
                style: 'pipeDelimited',
                explode: false,
                schema: { type: 'string' },
              },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    const p = op.pathParams[0];
    const h = op.headerParams[0];
    expect(p.style).toBeUndefined();
    expect(p.explode).toBeUndefined();
    expect(p.allowReserved).toBeUndefined();
    expect(h.style).toBeUndefined();
    expect(h.explode).toBeUndefined();
    expect(h.allowReserved).toBeUndefined();
  });
});

describe('buildRequestBody', () => {
  const makeOp = (content: Record<string, unknown>, required = false): Partial<Oas3Definition> => ({
    paths: {
      '/x': {
        post: {
          operationId: 'op',
          requestBody: { content, required } as never,
          responses: {},
        },
      } as never,
    },
  });

  it('returns undefined when there is no content at all', () => {
    const op = buildOpOnly(makeOp({}));
    expect(op.requestBody).toBeUndefined();
  });

  it('returns undefined when the requestBody has no `content` field whatsoever', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          post: {
            operationId: 'op',
            requestBody: { required: true } as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.requestBody).toBeUndefined();
  });

  it('prefers application/json when multiple media types are offered', () => {
    const op = buildOpOnly(
      makeOp({
        'application/xml': { schema: { type: 'string' } },
        'application/json': { schema: { type: 'number' } },
      })
    );
    expect(op.requestBody?.contentType).toBe('application/json');
  });

  it('prefers merge-patch+json when JSON is not present', () => {
    const op = buildOpOnly(
      makeOp({
        'application/xml': { schema: { type: 'string' } },
        'application/merge-patch+json': { schema: { type: 'number' } },
      })
    );
    expect(op.requestBody?.contentType).toBe('application/merge-patch+json');
  });

  it('falls back to x-www-form-urlencoded', () => {
    const op = buildOpOnly(
      makeOp({
        'application/xml': { schema: { type: 'string' } },
        'application/x-www-form-urlencoded': { schema: { type: 'object' } },
      })
    );
    expect(op.requestBody?.contentType).toBe('application/x-www-form-urlencoded');
  });

  it('falls back to multipart/form-data', () => {
    const op = buildOpOnly(
      makeOp({
        'application/xml': { schema: { type: 'string' } },
        'multipart/form-data': { schema: { type: 'object' } },
      })
    );
    expect(op.requestBody?.contentType).toBe('multipart/form-data');
  });

  it('falls back to the first available media type when no known one matches', () => {
    const op = buildOpOnly(
      makeOp({
        'application/xml': { schema: { type: 'string' } },
      })
    );
    expect(op.requestBody?.contentType).toBe('application/xml');
  });

  it('reads schema $ref into a ref node', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          post: {
            operationId: 'op',
            requestBody: {
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/X' } as never },
              },
            } as never,
            responses: {},
          },
        } as never,
      },
      components: { schemas: { X: { type: 'string' } } as never },
    });
    expect(op.requestBody?.schema).toEqual({ kind: 'ref', name: 'X' });
  });

  it('produces an unknown schema when none is declared', () => {
    const op = buildOpOnly(
      makeOp({
        'application/json': {},
      })
    );
    expect(op.requestBody?.schema).toEqual({ kind: 'unknown' });
  });

  it('emits the inline schema when one is declared', () => {
    const op = buildOpOnly(makeOp({ 'application/json': { schema: { type: 'string' } } }, true));
    expect(op.requestBody?.schema).toEqual({ kind: 'scalar', scalar: 'string' });
    expect(op.requestBody?.required).toBe(true);
  });
});

describe('buildSuccessResponses', () => {
  const opWithResponses = (responses: Record<string, unknown>): Partial<Oas3Definition> => ({
    paths: {
      '/x': {
        get: { operationId: 'op', responses: responses as never },
      } as never,
    },
  });

  it('returns [] when responses is empty', () => {
    expect(buildOpOnly(opWithResponses({})).successResponses).toEqual([]);
  });

  it('returns [] when the operation has no `responses` field at all', () => {
    const op = buildOpOnly({
      paths: {
        '/x': { get: { operationId: 'op' } as never } as never,
      },
    });
    expect(op.successResponses).toEqual([]);
  });

  it('uses `default` when no 2xx response exists', () => {
    const op = buildOpOnly(
      opWithResponses({
        default: { content: { 'application/json': { schema: { type: 'string' } } } },
      })
    );
    expect(op.successResponses[0].contentType).toBe('application/json');
    expect(op.successResponses[0].status).toBe('default');
  });

  it('sets status to the numeric 2xx code', () => {
    const op = buildOpOnly(
      opWithResponses({
        '201': { content: { 'application/json': { schema: { type: 'string' } } } },
      })
    );
    expect(op.successResponses[0].status).toBe(201);
  });

  it('returns [] when neither 2xx nor default exist', () => {
    expect(
      buildOpOnly(
        opWithResponses({
          '404': { content: { 'application/json': { schema: { type: 'string' } } } },
        })
      ).successResponses
    ).toEqual([]);
  });

  it('returns [] when the response object is missing/null', () => {
    expect(buildOpOnly(opWithResponses({ '200': null })).successResponses).toEqual([]);
  });

  it('returns [] when the response has no content (204-style)', () => {
    expect(
      buildOpOnly(opWithResponses({ '204': { description: 'No content' } })).successResponses
    ).toEqual([]);
  });

  it('dereferences a $ref response', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            responses: { '200': { $ref: '#/components/responses/Ok' } } as never,
          },
        } as never,
      },
      components: {
        responses: {
          Ok: { content: { 'application/json': { schema: { type: 'string' } } } },
        } as never,
      },
    });
    expect(op.successResponses[0].schema).toEqual({ kind: 'scalar', scalar: 'string' });
  });

  it('emits unknown for response media without a schema', () => {
    const op = buildOpOnly(opWithResponses({ '200': { content: { 'application/json': {} } } }));
    expect(op.successResponses[0].schema).toEqual({ kind: 'unknown' });
  });

  it('emits ref for response media whose schema is a $ref', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            responses: {
              '200': {
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/X' } as never },
                },
              },
            } as never,
          },
        } as never,
      },
      components: { schemas: { X: { type: 'string' } } as never },
    });
    expect(op.successResponses[0].schema).toEqual({ kind: 'ref', name: 'X' });
  });

  it('captures itemSchema on a text/event-stream success response', () => {
    const op = buildOpOnly({
      paths: {
        '/messages': {
          get: {
            operationId: 'streamMessages',
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'text/event-stream': {
                    itemSchema: { $ref: '#/components/schemas/Message' },
                  } as never,
                },
              },
            } as never,
          },
        } as never,
      },
      components: {
        schemas: { Message: { type: 'object', properties: { text: { type: 'string' } } } } as never,
      },
    });
    expect(op.successResponses[0].itemSchema).toEqual({ kind: 'ref', name: 'Message' });
  });

  it('leaves itemSchema undefined for an ordinary JSON response', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            responses: {
              '200': { content: { 'application/json': { schema: { type: 'string' } } } },
            } as never,
          },
        } as never,
      },
    });
    expect(op.successResponses[0].itemSchema).toBeUndefined();
  });
});

describe('buildErrorResponses', () => {
  const opWithResponses = (responses: Record<string, unknown>): Partial<Oas3Definition> => ({
    paths: {
      '/x': {
        get: { operationId: 'op', responses: responses as never },
      } as never,
    },
  });

  it('captures 4xx and 5xx responses, leaving successResponses for the 2xx', () => {
    const op = buildOpOnly(
      opWithResponses({
        '200': { content: { 'application/json': { schema: { type: 'string' } } } },
        '404': { content: { 'application/json': { schema: { type: 'number' } } } },
        '500': { content: { 'application/json': { schema: { type: 'boolean' } } } },
      })
    );
    expect(op.errorResponses).toEqual([
      {
        contentType: 'application/json',
        schema: { kind: 'scalar', scalar: 'number' },
        status: 404,
      },
      {
        contentType: 'application/json',
        schema: { kind: 'scalar', scalar: 'boolean' },
        status: 500,
      },
    ]);
    expect(op.successResponses).toEqual([
      {
        contentType: 'application/json',
        schema: { kind: 'scalar', scalar: 'string' },
        status: 200,
      },
    ]);
  });

  it('treats `default` as an error when a 2xx success also exists', () => {
    const op = buildOpOnly(
      opWithResponses({
        '200': { content: { 'application/json': { schema: { type: 'string' } } } },
        default: { content: { 'application/json': { schema: { type: 'number' } } } },
      })
    );
    expect(op.errorResponses).toEqual([
      {
        contentType: 'application/json',
        schema: { kind: 'scalar', scalar: 'number' },
        status: 'default',
      },
    ]);
    expect(op.successResponses).toEqual([
      {
        contentType: 'application/json',
        schema: { kind: 'scalar', scalar: 'string' },
        status: 200,
      },
    ]);
  });

  it('does not treat `default` as an error when no 2xx exists (success consumes it)', () => {
    const op = buildOpOnly(
      opWithResponses({
        default: { content: { 'application/json': { schema: { type: 'number' } } } },
      })
    );
    expect(op.successResponses).toEqual([
      {
        contentType: 'application/json',
        schema: { kind: 'scalar', scalar: 'number' },
        status: 'default',
      },
    ]);
    expect(op.errorResponses).toEqual([]);
  });

  it('returns [] when there are no error responses', () => {
    const op = buildOpOnly(
      opWithResponses({
        '200': { content: { 'application/json': { schema: { type: 'string' } } } },
      })
    );
    expect(op.errorResponses).toEqual([]);
  });

  it('emits one entry per content type on a 4xx with multiple media types', () => {
    const op = buildOpOnly(
      opWithResponses({
        '200': { content: { 'application/json': { schema: { type: 'string' } } } },
        '400': {
          content: {
            'application/json': { schema: { type: 'number' } },
            'text/plain': { schema: { type: 'string' } },
          },
        },
      })
    );
    expect(op.errorResponses).toEqual([
      {
        contentType: 'application/json',
        schema: { kind: 'scalar', scalar: 'number' },
        status: 400,
      },
      { contentType: 'text/plain', schema: { kind: 'scalar', scalar: 'string' }, status: 400 },
    ]);
  });

  it('skips a missing/null error response and one without content', () => {
    const op = buildOpOnly(
      opWithResponses({
        '200': { content: { 'application/json': { schema: { type: 'string' } } } },
        '404': null,
        '500': { description: 'no content' },
      })
    );
    expect(op.errorResponses).toEqual([]);
  });

  it('dereferences a $ref error response', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            responses: {
              '200': { content: { 'application/json': { schema: { type: 'string' } } } },
              '404': { $ref: '#/components/responses/NotFound' },
            } as never,
          },
        } as never,
      },
      components: {
        responses: {
          NotFound: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Err' } } },
          },
        } as never,
      },
    });
    expect(op.errorResponses).toEqual([
      { contentType: 'application/json', schema: { kind: 'ref', name: 'Err' }, status: 404 },
    ]);
  });

  it('sets numeric error statuses (404, 422) and `default` correctly', () => {
    const op = buildOpOnly(
      opWithResponses({
        '200': { content: { 'application/json': { schema: { type: 'string' } } } },
        '404': { content: { 'application/json': { schema: { type: 'string' } } } },
        '422': { content: { 'application/json': { schema: { type: 'string' } } } },
        default: { content: { 'application/json': { schema: { type: 'string' } } } },
      })
    );
    expect(op.errorResponses.map((r) => r.status)).toEqual([404, 422, 'default']);
  });
});

describe('buildSchema — every schema kind', () => {
  it('renders oneOf as a union (preserving members with $ref)', () => {
    const got = buildSchemaOnly({
      oneOf: [{ $ref: '#/components/schemas/A' } as never, { type: 'number' }],
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'union',
      members: [
        { kind: 'ref', name: 'A' },
        { kind: 'scalar', scalar: 'number' },
      ],
    });
  });

  it('renders anyOf as a union too', () => {
    const got = buildSchemaOnly({ anyOf: [{ type: 'string' }, { type: 'number' }] } as Oas3Schema);
    expect(got.kind).toBe('union');
  });

  it('renders allOf as intersection when there are 2+ members', () => {
    const got = buildSchemaOnly({
      allOf: [{ type: 'string' }, { $ref: '#/components/schemas/B' } as never],
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'intersection',
      members: [
        { kind: 'scalar', scalar: 'string' },
        { kind: 'ref', name: 'B' },
      ],
    });
  });

  it('flattens allOf with a single member, using its own description if present', () => {
    const got = buildSchemaOnly({
      description: 'outer desc',
      allOf: [{ type: 'string', description: 'inner' }],
    } as Oas3Schema);
    expect(got).toEqual({ kind: 'scalar', scalar: 'string', description: 'inner' });
  });

  it('flattens allOf with a single member, inheriting the outer description if member has none', () => {
    const got = buildSchemaOnly({
      description: 'outer desc',
      allOf: [{ type: 'string' }],
    } as Oas3Schema);
    expect(got).toEqual({ kind: 'scalar', scalar: 'string', description: 'outer desc' });
  });

  it("folds a schema's own properties into its allOf intersection (keeps the discriminant)", () => {
    // `allOf` does not replace sibling `properties`; the own object (here the
    // `kind` discriminant) must be intersected with the allOf members, not dropped.
    const got = buildSchemaOnly({
      type: 'object',
      properties: { kind: { type: 'string', const: 'A' } },
      allOf: [{ $ref: '#/components/schemas/Base' } as never],
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'intersection',
      members: [
        {
          kind: 'object',
          properties: [{ name: 'kind', schema: { kind: 'literal', value: 'A' }, required: false }],
        },
        { kind: 'ref', name: 'Base' },
      ],
    });
  });

  it('renders a single `type: "null"` schema as null', () => {
    expect(buildSchemaOnly({ type: 'null' } as never)).toEqual({ kind: 'null' });
  });

  it('handles OpenAPI 3.1 array-of-types nullable as union (string | null)', () => {
    const got = buildSchemaOnly({ type: ['string', 'null'] as never } as Oas3Schema);
    expect(got).toEqual({
      kind: 'union',
      members: [{ kind: 'scalar', scalar: 'string' }, { kind: 'null' }],
    });
  });

  it('reduces a single-element array of types to just that type', () => {
    const got = buildSchemaOnly({ type: ['string'] as never } as Oas3Schema);
    expect(got).toEqual({ kind: 'scalar', scalar: 'string' });
  });

  it('handles array-of-types union without null', () => {
    const got = buildSchemaOnly({ type: ['string', 'number'] as never } as Oas3Schema);
    expect(got.kind).toBe('union');
  });

  it('handles OpenAPI 3.0 nullable: true', () => {
    const got = buildSchemaOnly({ type: 'string', nullable: true } as unknown as Oas3Schema);
    expect(got).toEqual({
      kind: 'union',
      members: [{ kind: 'scalar', scalar: 'string' }, { kind: 'null' }],
    });
  });

  it('renders const string as literal', () => {
    expect(buildSchemaOnly({ const: 'hello' } as unknown as Oas3Schema)).toEqual({
      kind: 'literal',
      value: 'hello',
    });
  });

  it('renders const number as literal', () => {
    expect(buildSchemaOnly({ const: 42 } as unknown as Oas3Schema)).toEqual({
      kind: 'literal',
      value: 42,
    });
  });

  it('renders const boolean as literal', () => {
    expect(buildSchemaOnly({ const: true } as unknown as Oas3Schema)).toEqual({
      kind: 'literal',
      value: true,
    });
  });

  it('throws NotSupportedError for unsupported const value types (objects)', () => {
    expect(() => buildSchemaOnly({ const: { a: 1 } } as unknown as Oas3Schema)).toThrow(
      NotSupportedError
    );
  });

  it('renders enum strings with scalar=string', () => {
    expect(buildSchemaOnly({ enum: ['a', 'b'] } as Oas3Schema)).toEqual({
      kind: 'enum',
      values: ['a', 'b'],
      scalar: 'string',
    });
  });

  it('renders enum numbers with scalar=number', () => {
    expect(buildSchemaOnly({ enum: [1, 2] } as Oas3Schema)).toEqual({
      kind: 'enum',
      values: [1, 2],
      scalar: 'number',
    });
  });

  it('widens boolean enums to a plain boolean scalar (see #4)', () => {
    expect(buildSchemaOnly({ enum: [true, false] } as Oas3Schema)).toEqual({
      kind: 'scalar',
      scalar: 'boolean',
    });
  });

  it('renders mixed-type enums with the fallback scalar=string', () => {
    const got = buildSchemaOnly({ enum: ['a', 1] } as Oas3Schema);
    expect(got).toMatchObject({ kind: 'enum', scalar: 'string' });
  });

  it('throws NotSupportedError for enum entries with unsupported types', () => {
    expect(() => buildSchemaOnly({ enum: [{ a: 1 }] } as Oas3Schema)).toThrow(NotSupportedError);
  });

  it('renders array with inline items', () => {
    expect(buildSchemaOnly({ type: 'array', items: { type: 'string' } } as Oas3Schema)).toEqual({
      kind: 'array',
      items: { kind: 'scalar', scalar: 'string' },
    });
  });

  it('renders array with $ref items', () => {
    expect(
      buildSchemaOnly({
        type: 'array',
        items: { $ref: '#/components/schemas/Y' } as never,
      } as Oas3Schema)
    ).toEqual({ kind: 'array', items: { kind: 'ref', name: 'Y' } });
  });

  it('renders array with missing items as array of unknown', () => {
    expect(buildSchemaOnly({ type: 'array' } as Oas3Schema)).toEqual({
      kind: 'array',
      items: { kind: 'unknown' },
    });
  });

  it('renders array with boolean items as array of unknown', () => {
    expect(
      buildSchemaOnly({ type: 'array', items: true as unknown as Oas3Schema } as Oas3Schema)
    ).toEqual({ kind: 'array', items: { kind: 'unknown' } });
  });

  it('renders object with properties', () => {
    const got = buildSchemaOnly({
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string', description: 'opt' },
      },
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'object',
      properties: [
        { name: 'id', schema: { kind: 'scalar', scalar: 'string' }, required: true },
        {
          name: 'name',
          schema: { kind: 'scalar', scalar: 'string', description: 'opt' },
          required: false,
          description: 'opt',
        },
      ],
    });
  });

  it('renders record (additionalProperties: true) as kind record/unknown', () => {
    expect(
      buildSchemaOnly({ type: 'object', additionalProperties: true } as unknown as Oas3Schema)
    ).toEqual({ kind: 'record', value: { kind: 'unknown' } });
  });

  it('renders record with $ref-valued additionalProperties', () => {
    expect(
      buildSchemaOnly({
        type: 'object',
        additionalProperties: { $ref: '#/components/schemas/Z' } as never,
      } as Oas3Schema)
    ).toEqual({ kind: 'record', value: { kind: 'ref', name: 'Z' } });
  });

  it('renders record with inline-valued additionalProperties', () => {
    expect(
      buildSchemaOnly({
        type: 'object',
        additionalProperties: { type: 'number' },
      } as Oas3Schema)
    ).toEqual({ kind: 'record', value: { kind: 'scalar', scalar: 'number' } });
  });

  it('treats a schema with `properties` (no type) as object', () => {
    const got = buildSchemaOnly({
      properties: { a: { type: 'string' } },
    } as Oas3Schema);
    expect(got.kind).toBe('object');
  });

  it('treats a schema with only `additionalProperties` (no type, no props) as record', () => {
    const got = buildSchemaOnly({
      additionalProperties: { type: 'string' },
    } as Oas3Schema);
    expect(got.kind).toBe('record');
  });

  it('renders a property-less object (no additionalProperties) as a free-form record of unknown', () => {
    // OpenAPI defaults absent `additionalProperties` to allowed, so `type: object`
    // with no declared properties is free-form: `{ [key: string]: unknown }`, not
    // `{}` — the latter forbids member access on the emitted type.
    expect(buildSchemaOnly({ type: 'object' } as Oas3Schema)).toEqual({
      kind: 'record',
      value: { kind: 'unknown' },
    });
  });

  it('keeps a property-less object with `additionalProperties: false` as a closed empty object', () => {
    // Explicitly closed — no arbitrary keys allowed — so it stays `{}` (kind object).
    expect(
      buildSchemaOnly({ type: 'object', additionalProperties: false } as unknown as Oas3Schema)
    ).toEqual({ kind: 'object', properties: [] });
  });

  it('captures `readOnly: true` on object properties', () => {
    expect(
      buildSchemaOnly({
        type: 'object',
        properties: {
          id: { type: 'string', readOnly: true },
          name: { type: 'string' },
        },
      } as unknown as Oas3Schema)
    ).toEqual({
      kind: 'object',
      properties: [
        {
          name: 'id',
          schema: { kind: 'scalar', scalar: 'string' },
          required: false,
          readOnly: true,
        },
        { name: 'name', schema: { kind: 'scalar', scalar: 'string' }, required: false },
      ],
    });
  });

  it('renders scalar string/number/integer/boolean', () => {
    expect(buildSchemaOnly({ type: 'string' } as Oas3Schema)).toEqual({
      kind: 'scalar',
      scalar: 'string',
    });
    expect(buildSchemaOnly({ type: 'number' } as Oas3Schema)).toEqual({
      kind: 'scalar',
      scalar: 'number',
    });
    expect(buildSchemaOnly({ type: 'integer' } as Oas3Schema)).toEqual({
      kind: 'scalar',
      scalar: 'integer',
    });
    expect(buildSchemaOnly({ type: 'boolean' } as Oas3Schema)).toEqual({
      kind: 'scalar',
      scalar: 'boolean',
    });
  });

  it('falls back to unknown for sparsely-typed schemas (no type/props/enum/etc)', () => {
    expect(buildSchemaOnly({ description: 'mystery' } as Oas3Schema)).toEqual({
      kind: 'unknown',
      description: 'mystery',
    });
  });

  it('passes through descriptions for arrays/objects/records', () => {
    expect(
      buildSchemaOnly({
        type: 'array',
        items: { type: 'string' },
        description: 'list',
      } as Oas3Schema)
    ).toMatchObject({ description: 'list' });
  });
});

describe('buildProperties', () => {
  it('marks $ref properties without a description', () => {
    const got = buildSchemaOnly({
      type: 'object',
      properties: { ref: { $ref: '#/components/schemas/X' } as never },
    } as Oas3Schema);
    expect(got).toMatchObject({
      kind: 'object',
      properties: [{ name: 'ref', schema: { kind: 'ref', name: 'X' }, required: false }],
    });
  });
});

describe('resolveRef (via $ref edge cases)', () => {
  it('rejects external $refs', () => {
    expect(() =>
      buildApiModel(
        doc({
          paths: {
            '/x': { $ref: 'https://example.com/api.yaml' } as never,
          },
        })
      )
    ).toThrow(/External \$ref not supported/);
  });

  it('rejects refs that pass through a non-object segment', () => {
    expect(() =>
      buildApiModel(
        doc({
          paths: {
            '/x': { $ref: '#/info/title/something' } as never,
          },
        })
      )
    ).toThrow(/Cannot resolve \$ref/);
  });

  it('rejects refs that resolve to undefined after walking through a non-object', () => {
    expect(() =>
      buildApiModel(
        doc({
          paths: {
            '/x': { $ref: '#/components/schemas/Missing' } as never,
          },
        })
      )
    ).toThrow(/Cannot resolve \$ref/);
  });

  it('rejects refs whose last segment misses (current becomes undefined at the tail)', () => {
    // `/info/nonexistent`: every prefix exists (info is an object), but the final lookup
    // misses, exercising the `current === undefined` guard rather than the in-loop one.
    expect(() =>
      buildApiModel(
        doc({
          paths: {
            '/x': { $ref: '#/info/nonexistent' } as never,
          },
        })
      )
    ).toThrow(/Cannot resolve \$ref/);
  });

  it('handles JSON-pointer escapes (~0, ~1)', () => {
    const model = buildApiModel(
      doc({
        paths: {
          '/x': { $ref: '#/x-stash/a~1b/c~0d' } as never,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          'x-stash': {
            'a/b': { 'c~d': { get: { operationId: 'esc', responses: {} } } },
          },
        } as any),
      })
    );
    expect(model.services[0].operations[0].name).toBe('esc');
  });

  it('refName returns the input as-is when the ref has no slash', () => {
    const got = buildSchemaOnly({
      oneOf: [{ $ref: 'NoSlash' } as never],
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'union',
      members: [{ kind: 'ref', name: 'NoSlash' }],
    });
  });
});

describe('extractMetadata — validation keywords', () => {
  it('lifts numeric constraints into metadata', () => {
    const got = buildSchemaOnly({ type: 'integer', minimum: 1, maximum: 100 } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'integer',
      metadata: { minimum: 1, maximum: 100 },
    });
  });

  it('lifts string constraints (minLength, maxLength, pattern, format) into metadata', () => {
    const got = buildSchemaOnly({
      type: 'string',
      minLength: 1,
      maxLength: 50,
      pattern: '^[a-z]+$',
      format: 'email',
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'string',
      metadata: {
        minLength: 1,
        maxLength: 50,
        pattern: '^[a-z]+$',
        format: 'email',
      },
    });
  });

  it('lifts array constraints (minItems, maxItems, uniqueItems) into metadata', () => {
    const got = buildSchemaOnly({
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 10,
      uniqueItems: true,
    } as Oas3Schema);
    expect(got).toMatchObject({
      kind: 'array',
      metadata: { minItems: 1, maxItems: 10, uniqueItems: true },
    });
  });

  it('lifts deprecated: true into metadata', () => {
    const got = buildSchemaOnly({ type: 'string', deprecated: true } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'string',
      metadata: { deprecated: true },
    });
  });

  it('omits the metadata field entirely when no validation keys are present', () => {
    // Strict-equality guard: ensures we don't ratchet every schema with an empty `metadata: {}`.
    const got = buildSchemaOnly({ type: 'string' } as Oas3Schema);
    expect(got).toEqual({ kind: 'scalar', scalar: 'string' });
    expect(got).not.toHaveProperty('metadata');
  });

  it('omits `deprecated` when it is explicitly false', () => {
    // A `deprecated: false` carries no information and would just clutter JSDoc.
    const got = buildSchemaOnly({ type: 'string', deprecated: false } as Oas3Schema);
    expect(got).not.toHaveProperty('metadata');
  });

  it('omits `uniqueItems` when it is explicitly false', () => {
    // Default is false; only `true` is interesting.
    const got = buildSchemaOnly({
      type: 'array',
      items: { type: 'string' },
      uniqueItems: false,
    } as Oas3Schema);
    expect(got).not.toHaveProperty('metadata');
  });

  it('passes through numeric exclusiveMinimum / exclusiveMaximum (OAS 3.1 form)', () => {
    const got = buildSchemaOnly({
      type: 'integer',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exclusiveMinimum: 0 as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exclusiveMaximum: 600 as any,
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'integer',
      metadata: { exclusiveMinimum: 0, exclusiveMaximum: 600 },
    });
  });

  it('normalizes OAS 3.0 boolean exclusiveMinimum=true + minimum=X to numeric exclusiveMinimum=X', () => {
    const got = buildSchemaOnly({
      type: 'integer',
      minimum: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exclusiveMinimum: true as any,
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'integer',
      metadata: { exclusiveMinimum: 0 },
    });
  });

  it('normalizes OAS 3.0 boolean exclusiveMaximum=true + maximum=X to numeric exclusiveMaximum=X', () => {
    const got = buildSchemaOnly({
      type: 'integer',
      maximum: 100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exclusiveMaximum: true as any,
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'integer',
      metadata: { exclusiveMaximum: 100 },
    });
  });

  it('drops boolean exclusiveMinimum=false (3.0 form, no-op)', () => {
    const got = buildSchemaOnly({
      type: 'integer',
      minimum: 5,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exclusiveMinimum: false as any,
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'integer',
      metadata: { minimum: 5 },
    });
  });

  it('lifts metadata on inline object properties', () => {
    const got = buildSchemaOnly({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 50 } as Oas3Schema,
      },
    } as Oas3Schema);
    expect(got).toMatchObject({
      kind: 'object',
      properties: [
        {
          name: 'name',
          schema: {
            kind: 'scalar',
            scalar: 'string',
            metadata: { minLength: 1, maxLength: 50 },
          },
        },
      ],
    });
  });

  it('folds a Parameter Object-level `deprecated: true` into its schema metadata', () => {
    const op = buildOpOnly({
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            parameters: [
              {
                name: 'q',
                in: 'query',
                deprecated: true,
                schema: { type: 'string', maxLength: 10 },
              },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.queryParams[0].schema).toMatchObject({
      kind: 'scalar',
      scalar: 'string',
      metadata: { maxLength: 10, deprecated: true },
    });
  });

  it("preserves the wrapper schema's metadata when a single-member allOf collapses", () => {
    // Exercises mergeMetadata(wrapper, undefined) — the inner has no metadata of
    // its own, so the wrapper's constraints must survive the collapse.
    const got = buildSchemaOnly({
      allOf: [{ type: 'string' } as Oas3Schema],
      minLength: 5,
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'string',
      metadata: { minLength: 5 },
    });
  });

  it("preserves the inner schema's metadata when the wrapper has none in a single-member allOf", () => {
    // Exercises mergeMetadata(undefined, inner).
    const got = buildSchemaOnly({
      allOf: [{ type: 'string', minLength: 3 } as Oas3Schema],
    } as Oas3Schema);
    expect(got).toEqual({
      kind: 'scalar',
      scalar: 'string',
      metadata: { minLength: 3 },
    });
  });

  it('folds a Parameter Object-level `deprecated: true` into a $ref schema metadata', () => {
    // When the parameter's schema is a $ref, we still need somewhere to attach
    // the param-level deprecation. The ref carries it in its own metadata so the
    // emitter can render it at the param's call-site context.
    const op = buildOpOnly({
      components: {
        schemas: { Limit: { type: 'integer', minimum: 1 } as Oas3Schema },
      } as never,
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            parameters: [
              {
                name: 'limit',
                in: 'query',
                deprecated: true,
                schema: { $ref: '#/components/schemas/Limit' },
              },
            ] as never,
            responses: {},
          },
        } as never,
      },
    });
    expect(op.queryParams[0].schema).toEqual({
      kind: 'ref',
      name: 'Limit',
      metadata: { deprecated: true },
    });
  });
});

describe('buildApiModel — enum with null (OAS 3.1)', () => {
  it('models a standalone enum containing null as <enum> | null', () => {
    const schema = buildSchemaOnly({ enum: ['a', 'b', null] } as never);
    expect(schema).toEqual({
      kind: 'union',
      members: [{ kind: 'enum', values: ['a', 'b'], scalar: 'string' }, { kind: 'null' }],
    });
  });

  it('models an enum of only null as the null type', () => {
    const schema = buildSchemaOnly({ enum: [null] } as never);
    expect(schema).toEqual({ kind: 'null' });
  });

  it('does not double null when type:[string,null] and enum both carry null', () => {
    const schema = buildSchemaOnly({
      type: ['string', 'null'],
      enum: ['RUNNING', 'COMPLETED', null],
    } as never);
    expect(schema).toEqual({
      kind: 'union',
      members: [
        { kind: 'enum', values: ['RUNNING', 'COMPLETED'], scalar: 'string' },
        { kind: 'null' },
      ],
    });
  });

  it('keeps a plain enum (no null) as a bare enum', () => {
    const schema = buildSchemaOnly({ type: 'string', enum: ['a', 'b'] } as never);
    expect(schema).toEqual({ kind: 'enum', values: ['a', 'b'], scalar: 'string' });
  });

  it('drops an all-null enum under type:[string,null], leaving string | null', () => {
    const schema = buildSchemaOnly({ type: ['string', 'null'], enum: [null] } as never);
    expect(schema).toEqual({
      kind: 'union',
      members: [{ kind: 'scalar', scalar: 'string' }, { kind: 'null' }],
    });
  });
});

describe('buildApiModel — discriminated unions (C6.4)', () => {
  it('captures an explicit discriminator with mapping on a oneOf union', () => {
    const schema = buildSchemaOnly({
      oneOf: [{ $ref: '#/components/schemas/Beverage' }, { $ref: '#/components/schemas/Dessert' }],
      discriminator: {
        propertyName: 'category',
        mapping: {
          beverage: '#/components/schemas/Beverage',
          dessert: '#/components/schemas/Dessert',
        },
      },
    } as never);
    expect(schema).toMatchObject({
      kind: 'union',
      discriminator: {
        propertyName: 'category',
        mapping: [
          { value: 'beverage', schemaName: 'Beverage' },
          { value: 'dessert', schemaName: 'Dessert' },
        ],
      },
    });
  });

  it('derives mapping entries from $ref member names when no explicit mapping is given', () => {
    const schema = buildSchemaOnly({
      oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
      discriminator: { propertyName: 'petType' },
    } as never);
    expect(schema).toMatchObject({
      kind: 'union',
      discriminator: {
        propertyName: 'petType',
        mapping: [
          { value: 'Cat', schemaName: 'Cat' },
          { value: 'Dog', schemaName: 'Dog' },
        ],
      },
    });
  });

  it('leaves the union without a discriminator when none is declared', () => {
    const schema = buildSchemaOnly({
      oneOf: [{ type: 'string' }, { type: 'number' }],
    } as never);
    expect(schema.kind).toBe('union');
    expect((schema as { discriminator?: unknown }).discriminator).toBeUndefined();
  });

  it('drops a redundant `unknown` member from a union and collapses to the lone real type', () => {
    // `oneOf: [Ref, {}]` would emit `Ref | unknown`, which collapses to `unknown`
    // in TS and destroys the type. The empty branch is dropped, leaving `Ref`.
    expect(
      buildSchemaOnly({ oneOf: [{ $ref: '#/components/schemas/User' }, {}] } as never)
    ).toEqual({ kind: 'ref', name: 'User' });
  });

  it('keeps real members and drops only the unknown one', () => {
    expect(
      buildSchemaOnly({ oneOf: [{ type: 'string' }, { type: 'number' }, {}] } as never)
    ).toEqual({
      kind: 'union',
      members: [
        { kind: 'scalar', scalar: 'string' },
        { kind: 'scalar', scalar: 'number' },
      ],
    });
  });

  it('collapses a union of only unknown members to unknown', () => {
    expect(buildSchemaOnly({ oneOf: [{}, {}] } as never)).toEqual({ kind: 'unknown' });
  });

  it('ignores a discriminator with no propertyName', () => {
    const schema = buildSchemaOnly({
      oneOf: [{ $ref: '#/components/schemas/Cat' }],
      discriminator: { mapping: { cat: '#/components/schemas/Cat' } },
    } as never);
    expect((schema as { discriminator?: unknown }).discriminator).toBeUndefined();
  });

  it('ignores a discriminator that yields no named targets (inline members, no mapping)', () => {
    const schema = buildSchemaOnly({
      oneOf: [{ type: 'object' }, { type: 'object' }],
      discriminator: { propertyName: 'kind' },
    } as never);
    expect((schema as { discriminator?: unknown }).discriminator).toBeUndefined();
  });
});

describe('buildApiModel — request body readOnly stripping', () => {
  function postBody(schemas: Record<string, unknown>, bodySchema: unknown): OperationModel {
    return buildOpOnly({
      components: { schemas } as never,
      paths: {
        '/things': {
          post: {
            operationId: 'createThing',
            requestBody: {
              required: true,
              content: { 'application/json': { schema: bodySchema } },
            },
            responses: { '201': { description: 'ok' } },
          },
        },
      },
    } as Partial<Oas3Definition>);
  }

  it('drops readOnly props from a $ref request body via Omit', () => {
    const op = postBody(
      {
        Pet: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', readOnly: true },
            name: { type: 'string' },
            createdAt: { type: 'string', readOnly: true },
          },
        },
      },
      { $ref: '#/components/schemas/Pet' }
    );
    expect(op.requestBody?.schema).toEqual({
      kind: 'omit',
      base: 'Pet',
      keys: ['id', 'createdAt'],
    });
  });

  it('collects readOnly keys through allOf members (deduped)', () => {
    const op = postBody(
      {
        Base: { type: 'object', properties: { id: { type: 'string', readOnly: true } } },
        CredentialPost: {
          allOf: [
            { $ref: '#/components/schemas/Base' },
            { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
          ],
        },
      },
      { $ref: '#/components/schemas/CredentialPost' }
    );
    expect(op.requestBody?.schema).toEqual({
      kind: 'omit',
      base: 'CredentialPost',
      keys: ['id'],
    });
  });

  it('filters readOnly props from an inline-object request body', () => {
    const op = postBody(
      {},
      {
        type: 'object',
        required: ['name'],
        properties: {
          id: { type: 'string', readOnly: true },
          name: { type: 'string' },
        },
      }
    );
    const body = op.requestBody?.schema as { kind: string; properties: Array<{ name: string }> };
    expect(body.kind).toBe('object');
    expect(body.properties.map((p) => p.name)).toEqual(['name']);
  });

  it('leaves a request body unchanged when the schema has no readOnly props', () => {
    const op = postBody(
      { Plain: { type: 'object', properties: { name: { type: 'string' } } } },
      { $ref: '#/components/schemas/Plain' }
    );
    expect(op.requestBody?.schema).toEqual({ kind: 'ref', name: 'Plain' });
  });

  it('leaves an inline-object body unchanged when it has no readOnly props', () => {
    const op = postBody(
      {},
      { type: 'object', required: ['name'], properties: { name: { type: 'string' } } }
    );
    const body = op.requestBody?.schema as { kind: string; properties: Array<{ name: string }> };
    expect(body.kind).toBe('object');
    expect(body.properties.map((p) => p.name)).toEqual(['name']);
  });

  it('leaves a non-object, non-ref body (array) unchanged', () => {
    const op = postBody({}, { type: 'array', items: { type: 'string' } });
    expect(op.requestBody?.schema).toEqual({
      kind: 'array',
      items: { kind: 'scalar', scalar: 'string' },
    });
  });

  it('handles a self-referential allOf without looping (visited guard)', () => {
    const op = postBody(
      {
        Node: {
          allOf: [
            { type: 'object', properties: { id: { type: 'string', readOnly: true } } },
            { $ref: '#/components/schemas/Node' },
          ],
        },
      },
      { $ref: '#/components/schemas/Node' }
    );
    expect(op.requestBody?.schema).toEqual({ kind: 'omit', base: 'Node', keys: ['id'] });
  });

  it('leaves a $ref body unchanged when the base schema is absent', () => {
    const op = postBody({}, { $ref: '#/components/schemas/Ghost' });
    expect(op.requestBody?.schema).toEqual({ kind: 'ref', name: 'Ghost' });
  });
});

describe('buildApiModel — security (C6.6)', () => {
  function withSchemes(
    schemes: Record<string, unknown>,
    opSecurity?: unknown
  ): Partial<Oas3Definition> {
    return {
      components: { securitySchemes: schemes } as never,
      security: undefined,
      paths: {
        '/x': {
          get: {
            operationId: 'op',
            ...(opSecurity !== undefined ? { security: opSecurity } : {}),
            responses: {},
          },
        } as never,
      },
    };
  }

  it('returns an empty securitySchemes array when none are declared', () => {
    const model = buildApiModel(doc({}));
    expect(model.securitySchemes).toEqual([]);
  });

  it('models oauth2 / openIdConnect / http-bearer as bearer schemes', () => {
    const model = buildApiModel(
      doc(
        withSchemes({
          OAuth2: { type: 'oauth2', flows: {} },
          Oidc: { type: 'openIdConnect', openIdConnectUrl: 'https://x/.well-known' },
          BearerHttp: { type: 'http', scheme: 'Bearer' },
        })
      )
    );
    expect(model.securitySchemes).toEqual([
      { kind: 'bearer', key: 'OAuth2' },
      { kind: 'bearer', key: 'Oidc' },
      { kind: 'bearer', key: 'BearerHttp' },
    ]);
  });

  it('models apiKey-in-header schemes with their header name', () => {
    const model = buildApiModel(
      doc(withSchemes({ ApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' } }))
    );
    expect(model.securitySchemes).toEqual([
      { kind: 'apiKeyHeader', key: 'ApiKey', headerName: 'X-API-Key' },
    ]);
  });

  it('models http-basic as a basic scheme', () => {
    const model = buildApiModel(doc(withSchemes({ Basic: { type: 'http', scheme: 'basic' } })));
    expect(model.securitySchemes).toEqual([{ kind: 'basic', key: 'Basic' }]);
  });

  it('models apiKey-in-query schemes with their param name', () => {
    const model = buildApiModel(
      doc(withSchemes({ QueryKey: { type: 'apiKey', in: 'query', name: 'api_key' } }))
    );
    expect(model.securitySchemes).toEqual([
      { kind: 'apiKeyQuery', key: 'QueryKey', paramName: 'api_key' },
    ]);
  });

  it('models apiKey-in-cookie schemes with their cookie name', () => {
    const model = buildApiModel(
      doc(withSchemes({ CookieKey: { type: 'apiKey', in: 'cookie', name: 'sid' } }))
    );
    expect(model.securitySchemes).toEqual([
      { kind: 'apiKeyCookie', key: 'CookieKey', cookieName: 'sid' },
    ]);
  });

  it('skips non-injectable schemes (http without scheme, mutualTLS)', () => {
    const model = buildApiModel(
      doc(
        withSchemes({
          HttpNoScheme: { type: 'http' },
          Mtls: { type: 'mutualTLS' },
        })
      )
    );
    expect(model.securitySchemes).toEqual([]);
  });

  it('resolves a security $ref in components.securitySchemes', () => {
    const model = buildApiModel(
      doc({
        components: {
          securitySchemes: {
            Ref: { $ref: '#/components/x/Real' },
          },
          x: { Real: { type: 'http', scheme: 'bearer' } },
        } as never,
        paths: {},
      })
    );
    expect(model.securitySchemes).toEqual([{ kind: 'bearer', key: 'Ref' }]);
  });

  it('resolves operation security to the injectable scheme keys', () => {
    const op = buildOpOnly(
      withSchemes({ OAuth2: { type: 'oauth2', flows: {} } }, [{ OAuth2: ['orders:read'] }])
    );
    expect(op.security).toEqual(['OAuth2']);
  });

  it('treats security: [] as an explicit opt-out (no auth)', () => {
    const op = buildOpOnly(withSchemes({ OAuth2: { type: 'oauth2', flows: {} } }, []));
    expect(op.security).toEqual([]);
  });

  it('falls back to the document-level security default when the operation has none', () => {
    const model = buildApiModel(
      doc({
        components: { securitySchemes: { OAuth2: { type: 'oauth2', flows: {} } } } as never,
        security: [{ OAuth2: [] }] as never,
        paths: {
          '/x': { get: { operationId: 'op', responses: {} } } as never,
        },
      })
    );
    expect(model.services[0].operations[0].security).toEqual(['OAuth2']);
  });

  it('dedupes scheme keys across OR-alternatives and drops non-injectable ones', () => {
    const op = buildOpOnly(
      withSchemes(
        {
          OAuth2: { type: 'oauth2', flows: {} },
          ApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
          NoScheme: { type: 'http' },
        },
        [{ OAuth2: [] }, { OAuth2: [], ApiKey: [] }, { NoScheme: [] }]
      )
    );
    expect(op.security).toEqual(['OAuth2', 'ApiKey']);
  });

  it('returns no security when the operation references only non-injectable schemes', () => {
    const op = buildOpOnly(withSchemes({ NoScheme: { type: 'http' } }, [{ NoScheme: [] }]));
    expect(op.security).toEqual([]);
  });
});

describe('extractMetadata — example/default', () => {
  it('captures `example` and `default` on a scalar schema', () => {
    const got = buildSchemaOnly({ type: 'string', example: 'Ada', default: 'Anon' } as never);
    expect(got).toMatchObject({ kind: 'scalar', scalar: 'string' });
    expect(got.metadata?.example).toBe('Ada');
    expect(got.metadata?.default).toBe('Anon');
  });

  it('prefers `examples[0]` (OAS 3.1) when `example` is absent', () => {
    const got = buildSchemaOnly({ type: 'string', examples: ['Grace', 'Lin'] } as never);
    expect(got.metadata?.example).toBe('Grace');
  });

  it('captures only `default` when no example or examples are present', () => {
    const got = buildSchemaOnly({ type: 'string', default: 'fallback' } as never);
    expect(got.metadata?.default).toBe('fallback');
    expect(got.metadata?.example).toBeUndefined();
  });
});

describe('buildSchema — boolean enum widening (#4)', () => {
  it('widens a single-value boolean enum to `boolean` (no over-narrowing to a literal)', () => {
    expect(buildSchemaOnly({ type: 'boolean', enum: [false] } as Oas3Schema)).toMatchObject({
      kind: 'scalar',
      scalar: 'boolean',
    });
  });

  it('widens a full boolean enum to `boolean`', () => {
    expect(buildSchemaOnly({ type: 'boolean', enum: [true, false] } as Oas3Schema)).toMatchObject({
      kind: 'scalar',
      scalar: 'boolean',
    });
  });

  it('preserves a nullable boolean enum as `boolean | null`', () => {
    const m = buildSchemaOnly({
      type: ['boolean', 'null'],
      enum: [false, null],
    } as unknown as Oas3Schema);
    expect(m.kind).toBe('union');
    const members = (m as Extract<SchemaModel, { kind: 'union' }>).members;
    expect(members).toContainEqual({ kind: 'scalar', scalar: 'boolean' });
    expect(members).toContainEqual({ kind: 'null' });
  });

  it('leaves string enums as enums (literals stay meaningful there)', () => {
    expect(buildSchemaOnly({ type: 'string', enum: ['a', 'b'] } as Oas3Schema)).toMatchObject({
      kind: 'enum',
      scalar: 'string',
    });
  });

  it('leaves a boolean const as the literal (an explicit single-value constraint)', () => {
    expect(
      buildSchemaOnly({ type: 'boolean', const: false } as unknown as Oas3Schema)
    ).toMatchObject({
      kind: 'literal',
      value: false,
    });
  });
});
