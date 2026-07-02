import type { ApiModel, OperationModel } from '../../intermediate-representation/model.js';
import { tagsSplitWriter } from '../tags-split-writer.js';

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
  const files = tagsSplitWriter({ model: m, outputPath: '/out/client.ts', emit: {} });
  const find = (suffix: string) => files.find((f) => f.path.endsWith(suffix));
  return { files, paths: files.map((f) => f.path), find };
}

describe('tagsSplitWriter', () => {
  it('puts each tag in its own folder, with shared modules at the root', () => {
    const { paths } = run(
      model({
        services: [
          {
            name: 'Default',
            operations: [
              operation({ name: 'listPets', path: '/pets', tags: ['pets'] }),
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
      '/out/default/client.ts',
      '/out/pets/client.ts',
    ]);
  });

  it('imports shared modules one level up from inside a tag folder', () => {
    const { find } = run(
      model({
        schemas: [{ name: 'Pet', schema: { kind: 'object', properties: [] } }],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'getPet',
                path: '/pets',
                tags: ['pets'],
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
      })
    );
    const pets = find('/out/pets/client.ts')!;
    expect(pets.content).toContain('import type { Pet } from "../client.schemas.js";');
    expect(pets.content).toContain(
      'import { __buildUrl, __config, __request, type RequestOptions } from "../client.http.js";'
    );
    expect(pets.content).toContain('export async function getPet(');
  });

  it('merges per-tag SSE fragments into the barrel using nested folder specifiers', () => {
    const { find } = run(
      model({
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
      })
    );
    expect(find('/out/pets/client.ts')!.content).toContain('export const __sse_PetsService = {');
    const entry = find('/out/client.ts')!.content;
    expect(entry).toContain("import { __sse_PetsService } from './pets/client.js';");
    expect(entry).toContain('export const sse = { ...__sse_PetsService };');
  });

  it('barrel re-exports each tag folder file plus shared schemas and setters', () => {
    const { find } = run(
      model({
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
    expect(entry.content).toContain(
      'export { ApiError, configure, setBearer, setServerUrl, use } from "./client.http.js";'
    );
    expect(entry.content).toContain(
      'export type { AuthCredentials, ClientConfig, Middleware, OperationContext, ParseAs, RequestContext, RequestOptions, RetryConfig, RetryContext, RetryStrategy, TokenProvider } from "./client.http.js";'
    );
    expect(entry.content).toContain("export * from './pets/client.js';");
  });
});
