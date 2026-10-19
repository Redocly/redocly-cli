import { generateClient } from '@redocly/client-generator';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses, runTsx } from '../helpers.js';
import { MockServer } from '../mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');

describe('generate-client base consumer (single-file output)', () => {
  let server: MockServer;
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer'));
    server = await MockServer.start(fixture, {
      handlers: {
        // The cancel consumer aborts this call, so the answer must be slow enough to abort.
        // The mock server answers at once, so this handler holds the response open.
        getSlowPet: ({ response }) => {
          const timer = setTimeout(() => {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ id: 1, name: 'Slow', status: 'available' }));
          }, 30_000);
          response.on('close', () => clearTimeout(timer));
          return undefined;
        },
      },
    });
  }, 30_000);

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  test('end-to-end: generate single file, type-check, run, assert real call', async () => {
    const generatedFile = join(workDir, 'api.ts');
    await generateClient({ api: fixture, output: generatedFile });

    expect(existsSync(generatedFile)).toBe(true);
    const generated = readFileSync(generatedFile, 'utf-8');
    expect(generated).toContain('export type Pet');
    expect(generated).toContain('export class ApiError');
    // The descriptor wiring with the embedded runtime, plus one binding per operation.
    expect(generated).toContain('// ─── Embedded runtime');
    expect(generated).toContain('as const satisfies Record<string, OperationDescriptor>');
    expect(generated).toContain('export const { configure, use } = client;');
    expect(generated).toContain(
      'export const { getPetById, listPets, createPet, getSlowPet, search, bulkUpsertPets, getStatus } = client;'
    );
    // The spec's server URL is baked into the client instance.
    expect(generated).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, string>(OPERATIONS, { serverUrl: "http://localhost:3102", clientHeader: "redocly-client-generator" });'
    );
    // An OAS 3.1 enum that includes null renders as a nullable union.
    expect(generated).toMatch(/status\?:\s*\("available" \| "pending" \| "sold"\) \| null;/);
    // A free-form object (`type: object`, no properties) renders as a record, not `{}`.
    expect(generated).toMatch(/metadata\?:\s*Record<string, unknown>;/);
    // readOnly `id` is dropped from the create body via Omit (the response Pet keeps it).
    expect(generated).toContain('export type CreatePetBody = Omit<Pet, "id">;');
    // The readOnly `id` carries the `readonly` modifier on the model (for OmitReadOnly<T>).
    expect(generated).toMatch(/readonly id\?: number;/);
    // A oneOf with an empty branch keeps the real type — no `| unknown` collapse.
    expect(generated).toMatch(/owner\?:\s*string;/);
    expect(generated).not.toContain('| unknown');
    // OAS 3.1 single null type renders as `null`, not `unknown`.
    expect(generated).toMatch(/deletedAt\?:\s*null;/);
    // A discriminated union nested as array items emits guards narrowing the members.
    expect(generated).toContain(
      'export function isPetBulkSuccessItem(value: PetBulkSuccessItem | PetBulkErrorItem): value is PetBulkSuccessItem {'
    );
    expect(generated).toContain(
      'export function isPetBulkErrorItem(value: PetBulkSuccessItem | PetBulkErrorItem): value is PetBulkErrorItem {'
    );
    // A schema with its own properties AND allOf keeps the own discriminant.
    expect(generated).toContain('export type ExtendedPet =');
    expect(generated).toMatch(/kind:\s*"extended";/);
    expect(generated).toContain('} & Pet;');

    expectTscPasses(['--noEmit', '-p', workDir]);

    const runResult = await runTsx(join(workDir, 'index.ts'), [server.url], { cwd: workDir });
    expect(
      runResult.status,
      `consumer stdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
    ).toBe(0);
    const parsed = JSON.parse(runResult.stdout.trim()) as {
      pet: { id: number; name: string };
      filtered: Array<{ id: number; name: string }>;
      created: { name: string };
    };
    expect(typeof parsed.pet.id).toBe('number');
    expect(typeof parsed.pet.name).toBe('string');
    expect(Array.isArray(parsed.filtered)).toBe(true);
    // Bucket C round-trip: createPet ran with a body that omits the readOnly `id`.
    expect(typeof parsed.created.name).toBe('string');

    const requests = server.requests.map(({ method, url }) => ({ method, url }));
    expect(requests).toContainEqual({ method: 'GET', url: '/pets/1' });
    expect(requests).toContainEqual({ method: 'POST', url: '/pets' });
    // The deepObject query param: the object is sent as filter[name]=…&filter[status]=….
    const listCall = server.requests.find((request) => request.operationId === 'listPets');
    expect(listCall?.query).toEqual({ 'filter[name]': 'rex', 'filter[status]': 'available' });
    expect(server.handlerErrors).toEqual([]);
  }, 60_000);

  test('cancel: AbortController aborts the underlying request', async () => {
    expect(existsSync(join(workDir, 'api.ts')), 'previous test must have produced api.ts').toBe(
      true
    );

    const cancelResult = await runTsx(join(workDir, 'index-cancel.ts'), [server.url], {
      cwd: workDir,
    });
    expect(
      cancelResult.status,
      `cancel stdout:\n${cancelResult.stdout}\nstderr:\n${cancelResult.stderr}`
    ).toBe(0);
    expect(cancelResult.stdout.trim()).toBe('CANCELLED:AbortError');
  }, 30_000);
});
