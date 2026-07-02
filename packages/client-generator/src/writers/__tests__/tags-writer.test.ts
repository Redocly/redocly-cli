import type { ApiModel, OperationModel } from '../../intermediate-representation/model.js';
import { tagsWriter } from '../tags-writer.js';

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
    title: 'T',
    version: '1.0.0',
    serverUrl: 'https://api.example.com',
    services: [{ name: 'Default', operations: [] }],
    schemas: [],
    securitySchemes: [],
    ...overrides,
  };
}

function run(m: ApiModel) {
  const files = tagsWriter({
    model: m,
    outputPath: '/out/client.ts',
    emit: {},
  });
  const find = (suffix: string) => files.find((f) => f.path.endsWith(suffix));
  return { files, paths: files.map((f) => f.path), find };
}

describe('tagsWriter', () => {
  it('emits shared http + schemas, one file per tag, and the barrel entry', () => {
    const { paths } = run(
      model({
        services: [
          {
            name: 'Default',
            operations: [
              operation({ name: 'listPets', path: '/pets', tags: ['pets'] }),
              operation({
                name: 'listOrders',
                path: '/orders',
                tags: ['orders'],
              }),
              operation({ name: 'health', path: '/health' }),
            ],
          },
        ],
      })
    );
    expect(paths.sort()).toEqual([
      '/out/client.http.ts',
      '/out/client.schemas.ts',
      '/out/client.ts',
      '/out/default.ts',
      '/out/orders.ts',
      '/out/pets.ts',
    ]);
  });

  it('places each operation in its first tag file and imports its own helpers', () => {
    const { find } = run(
      model({
        securitySchemes: [{ kind: 'bearer', key: 'oauth' }],
        services: [
          {
            name: 'Default',
            operations: [
              operation({ name: 'listPets', path: '/pets', tags: ['pets'] }),
              operation({
                name: 'createPet',
                path: '/pets',
                method: 'post',
                tags: ['pets'],
                security: ['oauth'],
              }),
              operation({
                name: 'listOrders',
                path: '/orders',
                tags: ['orders'],
              }),
            ],
          },
        ],
      })
    );
    const pets = find('pets.ts')!;
    expect(pets.content).toContain('export async function listPets(');
    expect(pets.content).toContain('export async function createPet(');
    // pets has an authed op → it imports __auth; orders does not.
    expect(pets.content).toContain(
      'import { __auth, __buildUrl, __config, __request, type RequestOptions } from "./client.http.js";'
    );
    const orders = find('orders.ts')!;
    expect(orders.content).toContain('export async function listOrders(');
    expect(orders.content).not.toContain('__auth');
  });

  it('service-class facade emits one <Tag>Service class per tag file', () => {
    const files = tagsWriter({
      model: model({
        services: [
          {
            name: 'Default',
            operations: [
              operation({ name: 'listPets', path: '/pets', tags: ['pets'] }),
              operation({
                name: 'listOrders',
                path: '/orders',
                tags: ['orders'],
              }),
              operation({ name: 'health', path: '/health' }),
            ],
          },
        ],
      }),
      outputPath: '/out/client.ts',
      emit: { facade: 'service-class' },
    });
    const find = (suffix: string) => files.find((f) => f.path.endsWith(suffix))!;
    expect(find('pets.ts').content).toContain('export class PetsService {');
    expect(find('orders.ts').content).toContain('export class OrdersService {');
    // Untagged operations land in a DefaultService.
    expect(find('default.ts').content).toContain('export class DefaultService {');
    expect(find('pets.ts').content).not.toContain('export async function');
    // The class constructor needs the ClientConfig type from the http module.
    expect(find('pets.ts').content).toContain(
      'type ClientConfig, type Middleware, type RequestOptions } from "./client.http.js";'
    );
    expect(find('pets.ts').content).not.toContain('__config');
  });

  it('barrel re-exports every tag file plus schemas and the public http surface', () => {
    const { find } = run(
      model({
        schemas: [{ name: 'Pet', schema: { kind: 'object', properties: [] } }],
        securitySchemes: [{ kind: 'bearer', key: 'oauth' }],
        services: [
          {
            name: 'Default',
            operations: [operation({ name: 'listPets', path: '/pets', tags: ['pets'] })],
          },
        ],
      })
    );
    const entry = find('/out/client.ts')!;
    expect(entry.content).toContain("export * from './client.schemas.js';");
    expect(entry.content).toContain(
      'export { ApiError, configure, setBearer, setServerUrl, use } from "./client.http.js";'
    );
    expect(entry.content).toContain(
      'export type { AuthCredentials, ClientConfig, Middleware, OperationContext, ParseAs, RequestContext, RequestOptions, RetryConfig, RetryContext, RetryStrategy, TokenProvider } from "./client.http.js";'
    );
    expect(entry.content).toContain("export * from './pets.js';");
  });

  it('merges per-tag SSE fragments into the barrel; each tag file exports its own fragment', () => {
    const sseOp = (name: string, tag: string) =>
      operation({
        name,
        path: `/${tag}/stream`,
        tags: [tag],
        successResponses: [
          {
            contentType: 'text/event-stream',
            status: 200,
            schema: { kind: 'unknown' },
            itemSchema: { kind: 'ref', name: 'Message' },
          },
        ],
      });
    const { find } = run(
      model({
        schemas: [{ name: 'Message', schema: { kind: 'object', properties: [] } }],
        services: [
          {
            name: 'Default',
            operations: [sseOp('streamPets', 'pets'), sseOp('streamOrders', 'orders')],
          },
        ],
      })
    );
    // Each tag file exposes its own `__sse_<Class>` fragment.
    expect(find('pets.ts')!.content).toContain('export const __sse_PetsService = {');
    expect(find('orders.ts')!.content).toContain('export const __sse_OrdersService = {');
    // The barrel imports the fragments and merges them into the public `sse`.
    const entry = find('/out/client.ts')!.content;
    expect(entry).toContain('export const sse = { ...__sse_PetsService, ...__sse_OrdersService };');
    expect(entry).toContain("import { __sse_PetsService } from './pets.js';");
  });

  it('service-class facade emits no sse barrel (per-tag classes carry their own .sse)', () => {
    const files = tagsWriter({
      model: model({
        schemas: [{ name: 'Message', schema: { kind: 'object', properties: [] } }],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'streamPets',
                path: '/pets/stream',
                tags: ['pets'],
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
      }),
      outputPath: '/out/client.ts',
      emit: { facade: 'service-class' },
    });
    const entry = files.find((f) => f.path.endsWith('/out/client.ts'))!;
    expect(entry.content).not.toContain('export const sse =');
  });

  it('omits the schemas re-export when there are no schemas and no operations', () => {
    // No operations ⇒ no OPERATIONS map either, so the schemas module is empty and
    // the barrel skips its re-export (exercises the `hasSchemas === false` path).
    const { find } = run(model());
    const entry = find('/out/client.ts')!;
    expect(entry.content).not.toContain("export * from './client.schemas.js';");
    expect(entry.content).toContain(
      'export { ApiError, configure, setServerUrl, use } from "./client.http.js";'
    );
  });
});
