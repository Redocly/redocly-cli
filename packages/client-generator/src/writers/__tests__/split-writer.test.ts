import type { ApiModel, OperationModel } from '../../ir/model.js';
import { splitWriter } from '../split-writer.js';

function operation(overrides: Partial<OperationModel> = {}): OperationModel {
  return {
    name: 'op',
    method: 'get',
    path: '/p',
    pathParams: [],
    queryParams: [],
    headerParams: [],
    successResponses: [],
    errorResponses: [],
    security: [],
    tags: [],
    ...overrides,
  };
}

function model(overrides: Partial<ApiModel> = {}): ApiModel {
  return {
    title: 'Tiny',
    version: '1.0.0',
    baseUrl: 'https://api.example.com',
    services: [{ name: 'Default', operations: [] }],
    schemas: [],
    securitySchemes: [],
    ...overrides,
  };
}

function run(m: ApiModel) {
  const files = splitWriter({
    model: m,
    outputPath: '/out/client.ts',
    emit: {},
  });
  const byName = (suffix: string) => files.find((f) => f.path.endsWith(suffix))!;
  return {
    files,
    http: byName('client.http.ts'),
    schemas: byName('client.schemas.ts'),
    entry: byName('/out/client.ts'),
  };
}

describe('splitWriter — file set & paths', () => {
  it('emits exactly http, schemas, and the entry file', () => {
    const { files } = run(model());
    expect(files.map((f) => f.path).sort()).toEqual([
      '/out/client.http.ts',
      '/out/client.schemas.ts',
      '/out/client.ts',
    ]);
  });
});

describe('splitWriter — http module', () => {
  it('exports the operation-facing runtime helpers and public setters', () => {
    const { http } = run(
      model({
        services: [{ name: 'Default', operations: [operation()] }],
      })
    );
    expect(http.content).toContain('export function setBaseUrl(');
    expect(http.content).toContain('export class ApiError');
    expect(http.content).toContain('export function __buildUrl(');
    expect(http.content).toContain('export async function __request<T>(');
  });
});

describe('splitWriter — schemas module', () => {
  it('contains the model types and nothing runtime-related', () => {
    const { schemas } = run(
      model({
        schemas: [
          {
            name: 'Pet',
            schema: {
              kind: 'object',
              properties: [
                {
                  name: 'id',
                  schema: { kind: 'scalar', scalar: 'integer' },
                  required: true,
                },
              ],
            },
          },
        ],
      })
    );
    expect(schemas.content).toContain('export type Pet');
    expect(schemas.content).not.toContain('__request');
  });
});

describe('splitWriter — entry imports & re-exports', () => {
  it('imports only the referenced types and the helpers actually used', () => {
    const { entry } = run(
      model({
        schemas: [{ name: 'Pet', schema: { kind: 'object', properties: [] } }],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'getPet',
                successResponses: [
                  {
                    contentType: 'application/json',
                    status: 200,
                    schema: { kind: 'ref', name: 'Pet' },
                  },
                ],
              }),
            ],
          },
        ],
      })
    );
    expect(entry.content).toContain('import type { Pet } from "./client.schemas.js";');
    // Functions facade pulls the global __config alongside the runtime helpers.
    expect(entry.content).toContain(
      'import { __buildUrl, __config, __request, type RequestOptions } from "./client.http.js";'
    );
    expect(entry.content).toContain("export * from './client.schemas.js';");
    expect(entry.content).toContain(
      'export { ApiError, configure, setBaseUrl } from "./client.http.js";'
    );
    expect(entry.content).toContain(
      'export type { ClientConfig, Middleware, ParseAs, RequestContext, RequestOptions, RetryConfig, RetryContext, RetryStrategy } from "./client.http.js";'
    );
    expect(entry.content).toContain('export async function getPet(');
    // No auth/header helpers used by this operation.
    expect(entry.content).not.toContain('__auth');
    expect(entry.content).not.toContain('__headers');
  });

  it('imports __auth and __headers when operations need them, and re-exports auth setters', () => {
    const { entry, http } = run(
      model({
        securitySchemes: [{ kind: 'bearer', key: 'oauth' }],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'secure',
                security: ['oauth'],
                headerParams: [
                  {
                    name: 'X-Trace',
                    in: 'header',
                    schema: { kind: 'scalar', scalar: 'string' },
                    required: false,
                  },
                ],
              }),
            ],
          },
        ],
      })
    );
    expect(entry.content).toContain(
      'import { __auth, __buildUrl, __config, __headers, __request, type RequestOptions } from "./client.http.js";'
    );
    expect(entry.content).toContain(
      'export { ApiError, configure, setBaseUrl, setBearer } from "./client.http.js";'
    );
    expect(http.content).toContain('export async function __auth(');
    expect(http.content).toContain('export function setBearer(');
  });

  it('endpoint file imports RequestOptions and the entry re-exports it', () => {
    const { entry, http } = run(
      model({ services: [{ name: 'Default', operations: [operation()] }] })
    );
    // endpoints reference RequestOptions in signatures → must import the type
    expect(entry.content).toContain('type RequestOptions');
    // and the public surface re-exports it from the http module
    expect(http.content).toContain('export type RequestOptions');
  });

  it('omits the schemas re-export entirely when there are no schemas and no operations', () => {
    const { entry } = run(model());
    expect(entry.content).not.toContain('.schemas.js');
    expect(entry.content).toContain(
      'export { ApiError, configure, setBaseUrl } from "./client.http.js";'
    );
  });

  it('keeps the OPERATIONS map in the schemas module (and re-exports it) even without named types', () => {
    const { schemas, entry } = run(
      model({
        services: [
          {
            name: 'Default',
            operations: [operation({ name: 'ping', path: '/ping' })],
          },
        ],
      })
    );
    // No named schemas, but the metadata map still belongs in the schemas module…
    expect(schemas.content).toContain('export const OPERATIONS = {');
    expect(schemas.content).toContain('ping: { method: "GET", path: "/ping" }');
    expect(schemas.content).not.toContain('export type Pet');
    // …so the barrel re-exports it, while the endpoint file imports no named types.
    expect(entry.content).toContain("export * from './client.schemas.js';");
    expect(entry.content).not.toContain('import type {');
  });
});

describe('splitWriter — SSE', () => {
  it('emits the sse aggregate in the entry file for an SSE op', () => {
    const { entry } = run(
      model({
        schemas: [{ name: 'Message', schema: { kind: 'object', properties: [] } }],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'streamMessages',
                path: '/stream',
                successResponses: [
                  {
                    contentType: 'text/event-stream',
                    status: 200,
                    schema: { kind: 'unknown' },
                    itemSchema: { kind: 'ref', name: 'Message' },
                  },
                ],
              }),
            ],
          },
        ],
      })
    );
    expect(entry.content).toContain('export const sse = {');
    expect(entry.content).toContain('async function* streamMessages(');
  });
});

describe('splitWriter — service-class facade', () => {
  it('puts the Client class in the entry (with the chosen name) instead of functions', () => {
    const files = splitWriter({
      model: model({
        services: [{ name: 'Default', operations: [operation({ name: 'ping' })] }],
      }),
      outputPath: '/out/client.ts',
      emit: { facade: 'service-class', name: 'CafeClient' },
    });
    const entry = files.find((f) => f.path.endsWith('/out/client.ts'))!;
    expect(entry.content).toContain('export class CafeClient {');
    expect(entry.content).toMatch(/\basync ping\(/);
    expect(entry.content).not.toContain('export async function');
    // The class constructor imports the ClientConfig type, not the global __config.
    expect(entry.content).toContain(
      'type ClientConfig, type Middleware, type RequestOptions } from "./client.http.js";'
    );
    expect(entry.content).not.toContain('__config');
    // The shared http/schemas modules are unchanged by the facade choice.
    expect(files.find((f) => f.path.endsWith('client.http.ts'))!.content).toContain(
      'export async function __request<T>('
    );
  });
});
