import { renderTanstackModule } from '../tanstack-query.js';
import { apiModel, namedSchema, operation, param, SCALAR } from './fixtures.js';

const SDK = './client.js';

function render(
  ops: Parameters<typeof operation>[0][],
  argsStyle: 'flat' | 'grouped',
  framework: 'react' | 'vue' | 'svelte' | 'solid' = 'react'
) {
  return renderTanstackModule(
    apiModel({ services: [{ name: 'Default', operations: ops.map(operation) }] }),
    { argsStyle, sdkModule: SDK, framework }
  );
}

describe('renderTanstackModule', () => {
  it('returns empty string when the model has no operations', () => {
    expect(
      renderTanstackModule(apiModel(), { argsStyle: 'flat', sdkModule: SDK, framework: 'react' })
    ).toBe('');
  });

  it('skips SSE operations (not exported by the sdk) and wraps only the regular ones', () => {
    const out = render(
      [
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
      ],
      'grouped'
    );
    expect(out).toContain('getPetOptions');
    // The SSE op is neither imported nor wrapped.
    expect(out).not.toContain('streamEvents');
  });

  it('skips an op whose <Op>Variables name collides with a schema (would import the wrong type)', () => {
    const out = renderTanstackModule(
      apiModel({
        schemas: [namedSchema('GetUserVariables', { kind: 'object', properties: [] })],
        services: [
          {
            name: 'Default',
            operations: [
              operation({
                name: 'getUser',
                method: 'get',
                path: '/u/{id}',
                pathParams: [param('id', 'path', true)],
              }),
              operation({ name: 'listUsers', method: 'get' }),
            ].map((o) => o),
          },
        ],
      }),
      { argsStyle: 'grouped', sdkModule: SDK, framework: 'react' }
    );
    // The colliding op is skipped; the non-colliding one is still wrapped.
    expect(out).not.toContain('getUserOptions');
    expect(out).toContain('listUsersOptions');
  });

  it('returns empty string when every operation is SSE', () => {
    const out = render(
      [
        {
          name: 'streamEvents',
          method: 'get',
          path: '/events',
          successResponses: [{ contentType: 'text/event-stream', schema: SCALAR, status: 200 }],
        },
      ],
      'flat'
    );
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

    it('emits queryKey + Options factories with grouped forwarding', () => {
      const out = render([getOp], 'grouped');
      expect(out).toContain(
        'export const getPetQueryKey = (vars: GetPetVariables) => ["getPet", vars] as const;'
      );
      expect(out).toContain('queryOptions({');
      expect(out).toContain('queryKey: getPetQueryKey(vars)');
      expect(out).toContain('queryFn: () => getPet(vars, init)');
      expect(out).toContain(
        'export const getPetOptions = (vars: GetPetVariables, init?: RequestOptions) =>'
      );
    });

    it('emits flat positional forwarding (path ident, then params, then init)', () => {
      const out = render([getOp], 'flat');
      expect(out).toContain('queryFn: () => getPet(vars.petId, vars.params, init)');
    });
  });

  describe('mutation operation (POST) with a body', () => {
    const postOp = {
      name: 'createPet',
      method: 'post' as const,
      path: '/pets',
      requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
    };

    it('emits a Mutation factory with mutationKey + mutationFn (grouped)', () => {
      const out = render([postOp], 'grouped');
      expect(out).toContain('export const createPetMutation = () => ({');
      expect(out).toContain('mutationKey: ["createPet"] as const');
      expect(out).toContain('mutationFn: (vars: CreatePetVariables) => createPet(vars)');
    });

    it('forwards the body positionally in flat mode (no trailing init)', () => {
      const out = render([postOp], 'flat');
      expect(out).toContain('mutationFn: (vars: CreatePetVariables) => createPet(vars.body)');
    });
  });

  describe('flat forwarding ordering', () => {
    it('orders path params (URL-template order), then params, body, headers', () => {
      const op = {
        name: 'replace',
        method: 'put' as const,
        path: '/a/{a}/b/{b}',
        pathParams: [param('b', 'path', true), param('a', 'path', true)],
        queryParams: [param('q', 'query', false)],
        requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
        headerParams: [param('X-Trace', 'header', false)],
      };
      const out = render([op], 'flat');
      expect(out).toContain(
        'mutationFn: (vars: ReplaceVariables) => replace(vars.a, vars.b, vars.params, vars.body, vars.headers)'
      );
    });
  });

  describe('flat forwarding with an undeclared path placeholder', () => {
    it('skips a `{placeholder}` that has no matching declared path param', () => {
      const op = {
        name: 'getThing',
        method: 'get' as const,
        path: '/things/{id}/{undeclared}',
        pathParams: [param('id', 'path', true)],
      };
      const out = render([op], 'flat');
      // Only `id` is forwarded; `{undeclared}` has no param, so it is dropped.
      expect(out).toContain('queryFn: () => getThing(vars.id, init)');
    });
  });

  describe('no-input operations', () => {
    it('query: no vars param, queryKey without vars, forwards init', () => {
      const out = render([{ name: 'listPets', method: 'get', path: '/pets' }], 'grouped');
      expect(out).toContain('export const listPetsQueryKey = () => ["listPets"] as const;');
      expect(out).toContain('export const listPetsOptions = (init?: RequestOptions) =>');
      expect(out).toContain('queryKey: listPetsQueryKey()');
      expect(out).toContain('queryFn: () => listPets(init)');
    });

    it('mutation: mutationFn takes no vars, calls with no args', () => {
      const out = render([{ name: 'ping', method: 'post', path: '/ping' }], 'grouped');
      expect(out).toContain('export const pingMutation = () => ({');
      expect(out).toContain('mutationFn: () => ping()');
    });

    it('flat no-input query forwards init too', () => {
      const out = render([{ name: 'listPets', method: 'get', path: '/pets' }], 'flat');
      expect(out).toContain('queryFn: () => listPets(init)');
    });
  });

  describe('module header (imports)', () => {
    it('imports queryOptions only when a query op exists', () => {
      const queryOnly = render([{ name: 'listPets', method: 'get', path: '/pets' }], 'grouped');
      expect(queryOnly).toContain('import { queryOptions } from "@tanstack/react-query";');

      const mutationOnly = render([{ name: 'ping', method: 'post', path: '/ping' }], 'grouped');
      expect(mutationOnly).not.toContain('@tanstack/react-query');
    });

    it('imports used opFns + Variables types + RequestOptions from the sdk module', () => {
      const out = render(
        [
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
        ],
        'grouped'
      );
      expect(out).toContain(
        'import { createPet, getPet, type CreatePetVariables, type GetPetVariables, type RequestOptions } from "./client.js";'
      );
    });

    it('omits RequestOptions when there are only mutations (no query)', () => {
      const out = render(
        [
          {
            name: 'createPet',
            method: 'post',
            path: '/pets',
            requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
          },
        ],
        'grouped'
      );
      expect(out).toContain('import { createPet, type CreatePetVariables } from "./client.js";');
      expect(out).not.toContain('RequestOptions');
    });

    it('imports only the opFn for a no-input op (no Variables type)', () => {
      const out = render([{ name: 'ping', method: 'post', path: '/ping' }], 'grouped');
      expect(out).toContain('import { ping } from "./client.js";');
    });
  });

  describe('queryFramework', () => {
    const op = [{ name: 'listPets', method: 'get' as const, path: '/pets' }];

    it('defaults to react: imports from @tanstack/react-query', () => {
      expect(render(op, 'grouped')).toContain(
        'import { queryOptions } from "@tanstack/react-query";'
      );
    });

    it('imports from @tanstack/vue-query when framework is vue', () => {
      expect(render(op, 'grouped', 'vue')).toContain(
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
        {
          name: 'createPet',
          method: 'post' as const,
          path: '/pets',
          requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
        },
      ];
      const react = render(ops, 'grouped', 'react');
      const vue = render(ops, 'grouped', 'vue');
      // Replace each rendering's import line with the other's; the documents must then match,
      // proving the framework choice touches nothing but the `@tanstack/<framework>-query` string.
      const importLine = (q: string) => `import { queryOptions } from "@tanstack/${q}-query";`;
      expect(react.replace(importLine('react'), importLine('vue'))).toBe(vue);
    });
  });
});
