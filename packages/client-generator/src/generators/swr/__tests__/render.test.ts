import { apiModel, namedSchema, operation, param, SCALAR } from '../../../__tests__/fixtures.js';
import { renderSwrModule } from '../render.js';

const SDK = './client.js';

function render(ops: Parameters<typeof operation>[0][]) {
  return renderSwrModule(
    apiModel({ services: [{ name: 'Default', operations: ops.map(operation) }] }),
    { sdkModule: SDK }
  );
}

describe('renderSwrModule', () => {
  it('returns empty string when the model has no operations', () => {
    expect(renderSwrModule(apiModel(), { sdkModule: SDK })).toBe('');
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
      { sdkModule: SDK }
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
        'export function useGetPet(vars: GetPetVariables, init?: Omit<RequestOptions, "envelope">) {'
      );
      expect(out).toContain(
        'return useSWR(getPetKey(vars), () => getPet(vars, { ...init, envelope: undefined }));'
      );
    });
  });

  describe('no-input query operation', () => {
    it('drops the vars param; key takes no args', () => {
      const out = render([{ name: 'listPets', method: 'get', path: '/pets' }]);
      expect(out).toContain('export const listPetsKey = () => ["listPets"] as const;');
      expect(out).toContain(
        'export function useListPets(init?: Omit<RequestOptions, "envelope">) {'
      );
      // Grouped signature is `(args?, init?)` — the init must not land in the args slot.
      expect(out).toContain(
        'return useSWR(listPetsKey(), () => listPets({}, { ...init, envelope: undefined }));'
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

  describe('input forwarding', () => {
    it('forwards the whole input object, whatever shape the sdk takes', () => {
      const out = render([
        {
          name: 'getPet',
          method: 'get',
          path: '/pets/{petId}',
          pathParams: [param('petId', 'path', true)],
          queryParams: [param('expand', 'query', false)],
        },
      ]);
      expect(out).toContain('() => getPet(vars, { ...init, envelope: undefined })');
    });

    it('a mutation trigger forwards its `arg` the same way', () => {
      const out = render([
        {
          name: 'replace',
          method: 'put',
          path: '/a/{a}/b/{b}',
          pathParams: [param('b', 'path', true), param('a', 'path', true)],
          queryParams: [param('q', 'query', false)],
          requestBody: { contentType: 'application/json', schema: SCALAR, required: true },
          headerParams: [param('X-Trace', 'header', false)],
        },
      ]);
      expect(out).toContain('}) => replace(arg));');
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
