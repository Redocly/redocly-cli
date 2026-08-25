import type { PaginationConfig } from '../pagination.js';
import { renderTanstackModule } from '../tanstack-query.js';
import { apiModel, namedSchema, operation, param, SCALAR } from './fixtures.js';

const SDK = './client.js';

function render(
  ops: Parameters<typeof operation>[0][],
  extra: {
    framework?: 'react' | 'vue' | 'svelte' | 'solid';
    pagination?: PaginationConfig;
    schemas?: NonNullable<Parameters<typeof apiModel>[0]>['schemas'];
  } = {}
) {
  return renderTanstackModule(
    apiModel({
      schemas: extra.schemas ?? [],
      services: [{ name: 'Default', operations: ops.map(operation) }],
    }),
    { sdkModule: SDK, framework: extra.framework ?? 'react', pagination: extra.pagination }
  );
}

describe('renderTanstackModule', () => {
  it('returns empty string when the model has no operations', () => {
    expect(renderTanstackModule(apiModel(), { sdkModule: SDK, framework: 'react' })).toBe('');
  });

  it('skips SSE operations (not request/response functions) and wraps only the regular ones', () => {
    const out = render([
      {
        name: 'getPet',
        method: 'get',
        path: '/pets/{id}',
        pathParams: [param('id', 'path', true)],
      },
      {
        name: 'streamEvents',
        method: 'get',
        path: '/events',
        successResponses: [{ contentType: 'text/event-stream', schema: SCALAR, status: 200 }],
      },
    ]);
    expect(out).toContain('getPetOptions');
    expect(out).not.toContain('streamEvents');
  });

  it('skips an op whose <Op>Variables name collides with a schema (would import the wrong type)', () => {
    const out = render(
      [
        {
          name: 'getUser',
          method: 'get',
          path: '/u/{id}',
          pathParams: [param('id', 'path', true)],
        },
        { name: 'listUsers', method: 'get' },
      ],
      { schemas: [namedSchema('GetUserVariables', { kind: 'object', properties: [] })] }
    );
    expect(out).not.toContain('getUserOptions');
    expect(out).toContain('listUsersOptions');
  });

  it('returns empty string when every operation is SSE', () => {
    const out = render([
      {
        name: 'streamEvents',
        method: 'get',
        path: '/events',
        successResponses: [{ contentType: 'text/event-stream', schema: SCALAR, status: 200 }],
      },
    ]);
    expect(out).toBe('');
  });

  describe('query operation (GET) with path + query params', () => {
    const getOp = {
      name: 'getPet',
      method: 'get' as const,
      path: '/pets/{petId}',
      pathParams: [param('petId', 'path', true)],
      queryParams: [param('expand', 'query', false)],
    };

    it('emits an optional-vars queryKey: the no-args call is the invalidation prefix', () => {
      const out = render([getOp]);
      expect(out).toContain('export const getPetQueryKey = (vars?: GetPetVariables) =>');
      expect(out).toContain(
        'vars === undefined ? (["getPet"] as const) : (["getPet", vars] as const)'
      );
    });

    it('emits an Options factory whose queryFn forwards the abort signal to the client call', () => {
      const out = render([getOp]);
      expect(out).toContain(
        'getPetOptions: (vars: GetPetVariables, init?: Omit<RequestOptions, "envelope">) => queryOptions({'
      );
      expect(out).toContain('queryKey: getPetQueryKey(vars)');
      expect(out).toContain(
        'queryFn: ({ signal }) => instance.getPet(vars, { ...init, signal, envelope: undefined })'
      );
    });
  });

  describe('mutation operation (POST) with a body', () => {
    const postOp = {
      name: 'createPet',
      method: 'post' as const,
      path: '/pets',
      requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
    };

    it('emits a Mutation factory that accepts and forwards per-call init', () => {
      const out = render([postOp]);
      expect(out).toContain('createPetMutation: (init?: Omit<RequestOptions, "envelope">) => ({');
      expect(out).toContain('mutationKey: ["createPet"] as const');
      expect(out).toContain(
        'mutationFn: (vars: CreatePetVariables) => instance.createPet(vars, { ...init, envelope: undefined })'
      );
    });
  });

  describe('queryKeyPrefix', () => {
    it('namespaces every query and mutation key (operationIds may collide across APIs)', () => {
      const out = renderTanstackModule(
        apiModel({
          services: [
            {
              name: 'Default',
              operations: [
                operation({ name: 'listPets', method: 'get', path: '/pets' }),
                operation({ name: 'ping', method: 'post', path: '/ping' }),
              ],
            },
          ],
        }),
        { sdkModule: SDK, framework: 'react', queryKeyPrefix: 'main' }
      );
      expect(out).toContain('export const listPetsQueryKey = () => ["main", "listPets"] as const;');
      expect(out).toContain('mutationKey: ["main", "ping"] as const');
    });

    it('escapes line terminators in the prefix so it cannot alter the emitted statement', () => {
      const out = renderTanstackModule(
        apiModel({
          services: [
            {
              name: 'Default',
              operations: [operation({ name: 'ping', method: 'post', path: '/p' })],
            },
          ],
        }),
        { sdkModule: SDK, framework: 'react', queryKeyPrefix: 'a\u2028b' }
      );
      expect(out).toContain('mutationKey: ["a\\u2028b", "ping"] as const');
    });
  });

  describe('createQueryFactories', () => {
    it('binds the factories to a client parameter defaulting to the module singleton', () => {
      const out = render([{ name: 'listPets', method: 'get', path: '/pets' }]);
      expect(out).toContain(
        'export const createQueryFactories = (instance: typeof client = client) => ({'
      );
      expect(out).toContain('const defaultFactories = createQueryFactories();');
      expect(out).toContain('export const listPetsOptions = defaultFactories.listPetsOptions;');
    });
  });

  describe('paginated query operations (InfiniteOptions)', () => {
    const listOp = {
      name: 'listOrders',
      method: 'get' as const,
      path: '/orders',
      queryParams: [param('after', 'query', false), param('limit', 'query', false)],
      successResponses: [
        {
          contentType: 'application/json',
          status: 200,
          schema: {
            kind: 'object' as const,
            properties: [
              {
                name: 'items',
                schema: { kind: 'array' as const, items: SCALAR },
                required: true,
              },
              {
                name: 'page',
                schema: {
                  kind: 'object' as const,
                  properties: [
                    {
                      name: 'endCursor',
                      schema: {
                        kind: 'union' as const,
                        members: [SCALAR, { kind: 'null' as const }],
                      },
                      required: false,
                    },
                    {
                      name: 'hasNextPage',
                      schema: { kind: 'scalar' as const, scalar: 'boolean' as const },
                      required: true,
                    },
                  ],
                },
                required: true,
              },
            ],
          },
        },
      ],
    };
    const cursorRule: PaginationConfig = {
      style: 'cursor',
      cursorParam: 'after',
      nextCursor: '/page/endCursor',
      hasMore: '/page/hasNextPage',
      limitParam: 'limit',
      items: '/items',
    };

    it('compiles a cursor rule into initialPageParam + getNextPageParam with a distinct key', () => {
      const out = render([listOp], { pagination: cursorRule });
      expect(out).toContain(
        'listOrdersInfiniteOptions: (vars: ListOrdersVariables, init?: Omit<RequestOptions, "envelope">) => infiniteQueryOptions({'
      );
      expect(out).toContain('queryKey: [...listOrdersQueryKey(vars), "infinite"] as const');
      expect(out).toContain(
        'queryFn: ({ pageParam, signal }) => instance.listOrders({ ...vars, params: { ...vars.params, after: pageParam } }, { ...init, signal, envelope: undefined })'
      );
      expect(out).toContain('initialPageParam: vars.params?.after');
      expect(out).toContain('if (lastPage.page?.hasNextPage === false)');
      expect(out).toContain('const next = lastPage.page?.endCursor;');
      // The cursor is a nullable string reached through an optional chain: all three stops.
      expect(out).toContain(
        'next === undefined || next === null || next === "" ? undefined : next'
      );
      expect(out).toContain(
        'export const listOrdersInfiniteOptions = defaultFactories.listOrdersInfiniteOptions;'
      );
    });

    it('omits stop checks the cursor type cannot hit (required plain string, single segment)', () => {
      const flatCursor = {
        ...listOp,
        successResponses: [
          {
            contentType: 'application/json',
            status: 200,
            schema: {
              kind: 'object' as const,
              properties: [
                {
                  name: 'items',
                  schema: { kind: 'array' as const, items: SCALAR },
                  required: true,
                },
                { name: 'next', schema: SCALAR, required: true },
              ],
            },
          },
        ],
      };
      const out = render([flatCursor], {
        pagination: { style: 'cursor', cursorParam: 'after', nextCursor: '/next', items: '/items' },
      });
      // A required, non-nullable string can only be `""` — no undefined/null comparison
      // (each would be a TS2367 "no overlap" in the consumer's build).
      expect(out).toContain('next === "" ? undefined : next');
      expect(out).not.toContain('next === undefined');
      expect(out).not.toContain('next === null');
    });

    // The advance param must be numeric for offset/page fit; `after`/`limit` are strings.
    const offsetOp = {
      ...listOp,
      queryParams: [
        {
          name: 'offset',
          in: 'query' as const,
          required: false,
          schema: { kind: 'scalar' as const, scalar: 'integer' as const },
        },
      ],
    };

    it('compiles an offset rule: advance by each page item count, stop on an empty page', () => {
      const out = render([offsetOp], {
        pagination: { style: 'offset', offsetParam: 'offset', items: '/items' },
      });
      expect(out).toContain('initialPageParam: vars.params?.offset ?? 0');
      expect(out).toContain('getNextPageParam: (lastPage, _allPages, lastPageParam) => {');
      expect(out).toContain('const count = lastPage.items?.length ?? 0;');
      expect(out).toContain('return count === 0 ? undefined : lastPageParam + count;');
    });

    it('compiles a page rule: increment by one, starting from 1', () => {
      const out = render([offsetOp], {
        pagination: { style: 'page', offsetParam: 'offset', items: '/items' },
      });
      expect(out).toContain('initialPageParam: vars.params?.offset ?? 1');
      expect(out).toContain('return count === 0 ? undefined : lastPageParam + 1;');
    });

    it('skips InfiniteOptions for link-style pagination (the next page lives in a header)', () => {
      const linkOp = {
        ...listOp,
        successResponseHeaders: [
          { name: 'link', schema: { kind: 'scalar', scalar: 'string' } as const },
        ],
      };
      const out = render([linkOp], { pagination: { style: 'link', items: '/items' } });
      expect(out).toContain('listOrdersOptions');
      expect(out).not.toContain('InfiniteOptions');
      expect(out).not.toContain('infiniteQueryOptions');
    });

    it('emits no InfiniteOptions (and no infiniteQueryOptions import) without pagination', () => {
      const out = render([listOp]);
      expect(out).not.toContain('InfiniteOptions');
      expect(out).not.toContain('infiniteQueryOptions');
      expect(out).toContain('import { queryOptions } from "@tanstack/react-query";');
    });
  });

  describe('no-input operations', () => {
    it('query: init-only Options, queryKey without vars, empty args object to the client', () => {
      const out = render([{ name: 'listPets', method: 'get', path: '/pets' }]);
      expect(out).toContain('export const listPetsQueryKey = () => ["listPets"] as const;');
      expect(out).toContain(
        'listPetsOptions: (init?: Omit<RequestOptions, "envelope">) => queryOptions({'
      );
      expect(out).toContain('queryKey: listPetsQueryKey()');
      expect(out).toContain(
        'queryFn: ({ signal }) => instance.listPets({}, { ...init, signal, envelope: undefined })'
      );
    });

    it('mutation: mutationFn takes no vars, passes an empty args object plus init', () => {
      const out = render([{ name: 'ping', method: 'post', path: '/ping' }]);
      expect(out).toContain('pingMutation: (init?: Omit<RequestOptions, "envelope">) => ({');
      expect(out).toContain(
        'mutationFn: () => instance.ping({}, { ...init, envelope: undefined })'
      );
    });
  });

  describe('module header (imports)', () => {
    it('imports queryOptions only when a query op exists; client and RequestOptions always', () => {
      const queryOnly = render([{ name: 'listPets', method: 'get', path: '/pets' }]);
      expect(queryOnly).toContain('import { queryOptions } from "@tanstack/react-query";');
      expect(queryOnly).toContain('import { client, type RequestOptions } from "./client.js";');

      const mutationOnly = render([{ name: 'ping', method: 'post', path: '/ping' }]);
      expect(mutationOnly).not.toContain('@tanstack/react-query');
      expect(mutationOnly).toContain('import { client, type RequestOptions } from "./client.js";');
    });

    it('imports the referenced Variables types from the sdk module', () => {
      const out = render([
        {
          name: 'getPet',
          method: 'get',
          path: '/pets/{petId}',
          pathParams: [param('petId', 'path', true)],
        },
        {
          name: 'createPet',
          method: 'post',
          path: '/pets',
          requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
        },
      ]);
      expect(out).toContain(
        'import { client, type CreatePetVariables, type GetPetVariables, type RequestOptions } from "./client.js";'
      );
    });
  });

  describe('framework', () => {
    const op = [{ name: 'listPets', method: 'get' as const, path: '/pets' }];

    it('defaults to react: imports from @tanstack/react-query', () => {
      expect(render(op)).toContain('import { queryOptions } from "@tanstack/react-query";');
    });

    it('imports from @tanstack/vue-query when framework is vue', () => {
      expect(render(op, { framework: 'vue' })).toContain(
        'import { queryOptions } from "@tanstack/vue-query";'
      );
    });

    it('changes only the import specifier — the rest of the body is byte-identical', () => {
      const ops = [
        {
          name: 'getPet',
          method: 'get' as const,
          path: '/pets/{petId}',
          pathParams: [param('petId', 'path', true)],
        },
      ];
      const react = render(ops, { framework: 'react' });
      const vue = render(ops, { framework: 'vue' });
      const importLine = (q: string) => `import { queryOptions } from "@tanstack/${q}-query";`;
      expect(react.replace(importLine('react'), importLine('vue'))).toBe(vue);
    });
  });
});
