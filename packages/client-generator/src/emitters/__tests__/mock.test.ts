import { renderMockModule } from '../mock.js';
import { apiModel, namedSchema, operation, param } from './fixtures.js';

describe('renderMockModule', () => {
  it('emits the msw import, a factory per named schema, and a handlers array', () => {
    const model = apiModel({
      schemas: [
        namedSchema('Pet', {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
          ],
        }),
      ],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'getPet',
              method: 'get',
              path: '/pets/{petId}',
              pathParams: [param('petId', 'path', true)],
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Pet' },
                  status: 200,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    // The `msw` import is the one hand-written line (single-quoted); everything
    // else is printer output, which double-quotes strings. A downstream formatter
    // normalizes both, so assertions track each source's raw form.
    expect(out).toContain("import { http, HttpResponse } from 'msw';");
    // The factories reference the generated schema types, so the module type-imports
    // them from the sdk entry (printer double-quotes the specifier).
    expect(out).toContain('import type { Pet } from "./client.js";');
    expect(out).toContain('export function createPet(overrides?: Partial<Pet>): Pet {');
    expect(out).toContain('id: 0');
    expect(out).toContain('...overrides');
    expect(out).toContain('http.get("*/pets/:petId",');
    expect(out).toContain('HttpResponse.json(createPet(override))');
    expect(out).toContain('export const handlers = [getPetHandler()];');
  });

  it('emits a body-less handler for a success response with no content', () => {
    const model = apiModel({
      schemas: [],
      services: [
        {
          name: 'Default',
          operations: [
            operation({ name: 'ping', method: 'get', path: '/ping', successResponses: [] }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('http.get("*/ping",');
    expect(out).toContain('new HttpResponse(null, { status: 200 })');
    expect(out).not.toContain('HttpResponse.json');
  });

  it('samples an inline (unnamed) success body in place', () => {
    const model = apiModel({
      schemas: [],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'health',
              method: 'get',
              path: '/health',
              successResponses: [
                {
                  contentType: 'application/json',
                  status: 200,
                  schema: {
                    kind: 'object',
                    properties: [
                      { name: 'ok', schema: { kind: 'scalar', scalar: 'boolean' }, required: true },
                    ],
                  },
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('ok: true');
    expect(out).not.toContain('create'); // no named factory for an inline body
    expect(out).toContain('...override');
  });

  it('prints string, negative-number, array, and null defaults as literals', () => {
    const model = apiModel({
      schemas: [
        namedSchema('Mixed', {
          kind: 'object',
          properties: [
            { name: 'label', schema: { kind: 'scalar', scalar: 'string' }, required: true },
            {
              name: 'offset',
              schema: { kind: 'scalar', scalar: 'integer', metadata: { default: -1 } },
              required: true,
            },
            {
              name: 'tags',
              schema: { kind: 'array', items: { kind: 'scalar', scalar: 'string' } },
              required: true,
            },
            { name: 'nothing', schema: { kind: 'null' }, required: true },
            {
              name: 'disabled',
              schema: { kind: 'scalar', scalar: 'boolean', metadata: { example: false } },
              required: true,
            },
          ],
        }),
      ],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'getMixed',
              method: 'get',
              path: '/mixed',
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Mixed' },
                  status: 200,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('label: "string"');
    expect(out).toContain('offset: -1');
    expect(out).toContain('tags: [');
    expect(out).toContain('"string"');
    expect(out).toContain('nothing: null');
    expect(out).toContain('disabled: false');
  });

  it('passes a non-object inline body through without an override spread', () => {
    const model = apiModel({
      schemas: [],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'count',
              method: 'get',
              path: '/count',
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'scalar', scalar: 'integer' },
                  status: 200,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    // `HttpResponse.json(x)` defaults to 200, so no `{ status }` init is emitted either.
    expect(out).toContain('HttpResponse.json(0)');
    expect(out).not.toContain('...override');
    expect(out).not.toContain('{ status:');
  });

  it('quotes non-identifier object keys', () => {
    const model = apiModel({
      schemas: [
        namedSchema('Trace', {
          kind: 'object',
          properties: [
            { name: 'x-trace-id', schema: { kind: 'scalar', scalar: 'string' }, required: true },
          ],
        }),
      ],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'getTrace',
              method: 'get',
              path: '/trace',
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Trace' },
                  status: 200,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('"x-trace-id": "string"');
  });

  it('casts a union-schema factory body `as <Type>` so the `Partial<Union>` override spread keeps narrowing', () => {
    const model = apiModel({
      schemas: [
        namedSchema('Shape', {
          kind: 'union',
          members: [
            {
              kind: 'object',
              properties: [
                { name: 'kind', schema: { kind: 'literal', value: 'circle' }, required: true },
                { name: 'r', schema: { kind: 'scalar', scalar: 'number' }, required: true },
              ],
            },
            {
              kind: 'object',
              properties: [
                { name: 'kind', schema: { kind: 'literal', value: 'square' }, required: true },
                { name: 'side', schema: { kind: 'scalar', scalar: 'number' }, required: true },
              ],
            },
          ],
        }),
      ],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'getShape',
              method: 'get',
              path: '/shape',
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Shape' },
                  status: 200,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('export function createShape(overrides?: Partial<Shape>): Shape {');
    expect(out).toMatch(/\.\.\.overrides\s*\} as Shape/);
  });

  it('bakes a `format: date-time` field as `new Date(...)` under dateType `Date`', () => {
    const model = apiModel({
      schemas: [
        namedSchema('Event', {
          kind: 'object',
          properties: [
            {
              name: 'at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        }),
      ],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'getEvent',
              method: 'get',
              path: '/event',
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Event' },
                  status: 200,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js', dateType: 'Date' });
    expect(out).toContain('at: new Date(');
    expect(out).not.toContain('at: "2024-01-01T00:00:00Z"');
  });

  it('passes { status: 201 } to HttpResponse.json for a non-200 success', () => {
    const model = apiModel({
      schemas: [],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'create',
              method: 'post',
              path: '/things',
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'scalar', scalar: 'integer' },
                  status: 201,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('HttpResponse.json(0, { status: 201 })');
  });

  it('emits a body-less response carrying the success status (204)', () => {
    const model = apiModel({
      schemas: [],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'remove',
              method: 'delete',
              path: '/things/{id}',
              pathParams: [param('id', 'path', true)],
              successResponses: [
                { contentType: 'application/json', schema: { kind: 'unknown' }, status: 204 },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('new HttpResponse(null, { status: 204 })');
    expect(out).not.toContain('HttpResponse.json');
  });

  it('emits an opt-in error handler typed with the declared status, kept out of `handlers`', () => {
    const model = apiModel({
      schemas: [
        namedSchema('Problem', {
          kind: 'object',
          properties: [
            { name: 'message', schema: { kind: 'scalar', scalar: 'string' }, required: true },
          ],
        }),
      ],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'getPet',
              method: 'get',
              path: '/pets/{petId}',
              pathParams: [param('petId', 'path', true)],
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Problem' },
                  status: 200,
                },
              ],
              errorResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Problem' },
                  status: 404,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('export const getPetErrorHandler = (status: 404, body?: Problem) =>');
    expect(out).toContain('http.get("*/pets/:petId", () => HttpResponse.json(body ?? {');
    expect(out).toContain('{ status })');
    // The error handler stays opt-in: only the success handler is in the array.
    expect(out).toContain('export const handlers = [getPetHandler()];');
    expect(out).not.toContain('getPetErrorHandler()');
  });

  it('unions multiple declared error statuses', () => {
    const model = apiModel({
      schemas: [],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'submit',
              method: 'post',
              path: '/submit',
              errorResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'scalar', scalar: 'string' },
                  status: 404,
                },
                {
                  contentType: 'application/json',
                  schema: { kind: 'scalar', scalar: 'string' },
                  status: 422,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('submitErrorHandler = (status: 404 | 422,');
  });

  it('widens the error-status union with `number` for a `default` error', () => {
    const model = apiModel({
      schemas: [],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'submit',
              method: 'post',
              path: '/submit',
              errorResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'scalar', scalar: 'string' },
                  status: 404,
                },
                {
                  contentType: 'application/json',
                  schema: { kind: 'scalar', scalar: 'string' },
                  status: 'default',
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('status: 404 | number');
  });

  it('unions distinct error body types', () => {
    const model = apiModel({
      schemas: [
        namedSchema('NotFound', {
          kind: 'object',
          properties: [
            { name: 'message', schema: { kind: 'scalar', scalar: 'string' }, required: true },
          ],
        }),
        namedSchema('Invalid', {
          kind: 'object',
          properties: [
            { name: 'field', schema: { kind: 'scalar', scalar: 'string' }, required: true },
          ],
        }),
      ],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'submit',
              method: 'post',
              path: '/submit',
              errorResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'NotFound' },
                  status: 404,
                },
                {
                  contentType: 'application/json',
                  schema: { kind: 'ref', name: 'Invalid' },
                  status: 422,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).toContain('body?: NotFound | Invalid)');
  });

  it('emits no error handler for an op without error responses', () => {
    const model = apiModel({
      schemas: [],
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'ping',
              method: 'get',
              path: '/ping',
              successResponses: [
                {
                  contentType: 'application/json',
                  schema: { kind: 'scalar', scalar: 'integer' },
                  status: 200,
                },
              ],
            }),
          ],
        },
      ],
    });
    const out = renderMockModule(model, { sdkModule: './client.js' });
    expect(out).not.toContain('ErrorHandler');
  });

  it('returns empty string when there are no operations', () => {
    const model = apiModel({ schemas: [], services: [{ name: 'Default', operations: [] }] });
    expect(renderMockModule(model, { sdkModule: './client.js' })).toBe('');
  });

  describe('faker mode', () => {
    const fakerModel = () =>
      apiModel({
        schemas: [
          namedSchema('Pet', {
            kind: 'object',
            properties: [
              { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
              { name: 'name', schema: { kind: 'scalar', scalar: 'string' }, required: true },
            ],
          }),
        ],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'getPet',
                method: 'get',
                path: '/pets/{petId}',
                pathParams: [param('petId', 'path', true)],
                successResponses: [
                  {
                    contentType: 'application/json',
                    schema: { kind: 'ref', name: 'Pet' },
                    status: 200,
                  },
                ],
                errorResponses: [
                  {
                    contentType: 'application/json',
                    schema: { kind: 'ref', name: 'Pet' },
                    status: 404,
                  },
                ],
              }),
            ],
          },
        ],
      });

    it('imports faker and uses faker calls in factory bodies', () => {
      const out = renderMockModule(fakerModel(), { sdkModule: './client.js', mockData: 'faker' });
      expect(out).toContain("import { faker } from '@faker-js/faker';");
      expect(out).toContain('id: faker.number.int()');
      expect(out).toContain('name: faker.lorem.word()');
      // No baked literals leaked in.
      expect(out).not.toContain('id: 0');
      expect(out).not.toContain('name: "string"');
    });

    it('emits faker.seed(n) once when mockSeed is set', () => {
      const out = renderMockModule(fakerModel(), {
        sdkModule: './client.js',
        mockData: 'faker',
        mockSeed: 42,
      });
      expect(out).toContain('faker.seed(42);');
      expect(out.match(/faker\.seed\(/g)).toHaveLength(1);
    });

    it('emits no seed call when mockSeed is absent', () => {
      const out = renderMockModule(fakerModel(), { sdkModule: './client.js', mockData: 'faker' });
      expect(out).not.toContain('faker.seed(');
    });

    it('baked mode (default) emits no faker import or seed call', () => {
      const out = renderMockModule(fakerModel(), { sdkModule: './client.js' });
      expect(out).not.toContain('@faker-js/faker');
      expect(out).not.toContain('faker.');
      expect(out).toContain('id: 0');
    });
  });
});
