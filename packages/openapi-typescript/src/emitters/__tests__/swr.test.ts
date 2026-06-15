import { renderSwrModule } from '../swr.js';
import { apiModel, namedSchema, operation, param, SCALAR } from './fixtures.js';

const SDK = './client.js';

function render(ops: Parameters<typeof operation>[0][], argsStyle: 'flat' | 'grouped' = 'grouped') {
  return renderSwrModule(
    apiModel({ services: [{ name: 'Default', operations: ops.map(operation) }] }),
    { sdkModule: SDK, argsStyle }
  );
}

describe('renderSwrModule', () => {
  it('returns empty string when the model has no operations', () => {
    expect(renderSwrModule(apiModel(), { sdkModule: SDK, argsStyle: 'flat' })).toBe('');
  });

  it('skips SSE operations (not exported by the sdk) and wraps only the regular ones', () => {
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
    expect(out).toContain('useGetPet');
    expect(out).not.toContain('streamEvents');
  });

  it('skips an op whose <Op>Variables name collides with a schema', () => {
    const out = renderSwrModule(
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
            ],
          },
        ],
      }),
      { sdkModule: SDK, argsStyle: 'grouped' }
    );
    expect(out).not.toContain('useGetUser');
    expect(out).toContain('useListUsers');
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

  describe('query operation (GET) with inputs', () => {
    const getOp = {
      name: 'getPet',
      method: 'get' as const,
      path: '/pets/{petId}',
      pathParams: [param('petId', 'path', true)],
      queryParams: [param('expand', 'query', false)],
    };

    it('emits a key factory + useSWR hook forwarding (vars, init)', () => {
      const out = render([getOp]);
      expect(out).toContain(
        'export const getPetKey = (vars: GetPetVariables) => ["getPet", vars] as const;'
      );
      expect(out).toContain(
        'export function useGetPet(vars: GetPetVariables, init?: RequestOptions) {'
      );
      expect(out).toContain('return useSWR(getPetKey(vars), () => getPet(vars, init));');
    });
  });

  describe('no-input query operation', () => {
    it('drops the vars param; key takes no args', () => {
      const out = render([{ name: 'listPets', method: 'get', path: '/pets' }]);
      expect(out).toContain('export const listPetsKey = () => ["listPets"] as const;');
      expect(out).toContain('export function useListPets(init?: RequestOptions) {');
      expect(out).toContain('return useSWR(listPetsKey(), () => listPets(init));');
    });
  });

  describe('mutation operation (POST) with a body', () => {
    const postOp = {
      name: 'createPet',
      method: 'post' as const,
      path: '/pets',
      requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
    };

    it('emits a useSWRMutation hook with key + (key, { arg }) trigger', () => {
      const out = render([postOp]);
      expect(out).toContain('export function useCreatePet() {');
      expect(out).toContain('return useSWRMutation("createPet", (_key: string, { arg }: {');
      expect(out).toContain('arg: CreatePetVariables;');
      expect(out).toContain('}) => createPet(arg));');
    });
  });

  describe('no-input mutation operation', () => {
    it('drops the arg; trigger takes no args', () => {
      const out = render([{ name: 'ping', method: 'post', path: '/ping' }]);
      expect(out).toContain('export function usePing() {');
      expect(out).toContain('return useSWRMutation("ping", () => ping());');
    });
  });

  describe('flat forwarding', () => {
    it('query: spreads vars.<path>, vars.params, then init (URL-template order)', () => {
      const out = render(
        [
          {
            name: 'getPet',
            method: 'get',
            path: '/pets/{petId}',
            pathParams: [param('petId', 'path', true)],
            queryParams: [param('expand', 'query', false)],
          },
        ],
        'flat'
      );
      expect(out).toContain('() => getPet(vars.petId, vars.params, init)');
    });

    it('mutation: spreads arg.<path> (URL-template order), then params, body, headers', () => {
      const out = render(
        [
          {
            name: 'replace',
            method: 'put',
            path: '/a/{a}/b/{b}',
            pathParams: [param('b', 'path', true), param('a', 'path', true)],
            queryParams: [param('q', 'query', false)],
            requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
            headerParams: [param('X-Trace', 'header', false)],
          },
        ],
        'flat'
      );
      expect(out).toContain('=> replace(arg.a, arg.b, arg.params, arg.body, arg.headers)');
    });
  });

  describe('module header (imports)', () => {
    it('imports useSWR only when a query op exists, useSWRMutation only when a mutation exists', () => {
      const queryOnly = render([{ name: 'listPets', method: 'get', path: '/pets' }]);
      expect(queryOnly).toContain('import useSWR from "swr";');
      expect(queryOnly).not.toContain('swr/mutation');

      const mutationOnly = render([{ name: 'ping', method: 'post', path: '/ping' }]);
      expect(mutationOnly).toContain('import useSWRMutation from "swr/mutation";');
      expect(mutationOnly).not.toContain('import useSWR from "swr";');
    });

    it('imports used opFns + Variables types + RequestOptions from the sdk module', () => {
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
        'import { createPet, getPet, type CreatePetVariables, type GetPetVariables, type RequestOptions } from "./client.js";'
      );
    });

    it('omits RequestOptions when there are only mutations (no query)', () => {
      const out = render([
        {
          name: 'createPet',
          method: 'post',
          path: '/pets',
          requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
        },
      ]);
      expect(out).toContain('import { createPet, type CreatePetVariables } from "./client.js";');
      expect(out).not.toContain('RequestOptions');
    });

    it('imports only the opFn for a no-input op (no Variables type)', () => {
      const out = render([{ name: 'ping', method: 'post', path: '/ping' }]);
      expect(out).toContain('import { ping } from "./client.js";');
    });
  });
});
