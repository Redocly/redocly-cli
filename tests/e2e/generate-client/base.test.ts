import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const indexEntryPoint = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures/base.yaml');
const consumerDir = join(__dirname, 'base-consumer');
const generatedFile = join(consumerDir, 'api.ts');
const serverScript = join(consumerDir, 'server.ts');
const indexScript = join(consumerDir, 'index.ts');
const cancelScript = join(consumerDir, 'index-cancel.ts');

const SERVER_PORT = 3102;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

async function waitForServerReady(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${SERVER_BASE}/__test__/ready`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `Base server did not become ready within ${timeoutMs}ms: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

function killServer(server: ChildProcess): Promise<void> {
  return new Promise((resolveFn) => {
    if (!server.pid || server.exitCode !== null) {
      resolveFn();
      return;
    }
    const onExit = (): void => resolveFn();
    server.once('exit', onExit);
    server.kill('SIGTERM');
    setTimeout(() => {
      server.removeListener('exit', onExit);
      if (server.exitCode === null) {
        server.kill('SIGKILL');
      }
      resolveFn();
    }, 2_000);
  });
}

describe('generate-client base consumer (single-file output)', () => {
  let serverProcess: ChildProcess | undefined;

  beforeAll(async () => {
    if (existsSync(generatedFile)) {
      rmSync(generatedFile, { force: true });
    }

    serverProcess = spawn('npx', ['tsx', serverScript], {
      cwd: consumerDir,
      env: { ...process.env, BASE_SERVER_PORT: String(SERVER_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(`[base-server stderr] ${chunk.toString()}`);
    });

    await waitForServerReady(15_000);
  }, 30_000);

  afterAll(async () => {
    if (serverProcess) {
      await killServer(serverProcess);
    }
  });

  test('end-to-end: generate single file, type-check, run, assert real call', async () => {
    const generateResult = spawnSync(
      'node',
      [indexEntryPoint, 'generate-client', fixture, '--output', generatedFile],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(generateResult.status, `generate-client stderr:\n${generateResult.stderr}`).toBe(0);

    expect(existsSync(generatedFile)).toBe(true);
    const generated = readFileSync(generatedFile, 'utf-8');
    expect(generated).toContain('export type Pet');
    expect(generated).toContain('export class ApiError');
    expect(generated).toContain('export async function getPetById');
    expect(generated).toContain('export async function getSlowPet');
    expect(generated).toContain('export async function listPets');
    // BASE is emitted as a mutable binding so setServerUrl() can override it.
    expect(generated).toContain('let BASE = "http://localhost:3102"');
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

    const typecheckResult = spawnSync('npx', ['tsc', '--noEmit', '-p', consumerDir], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(
      typecheckResult.status,
      `tsc --noEmit failed:\nstdout:\n${typecheckResult.stdout}\nstderr:\n${typecheckResult.stderr}`
    ).toBe(0);

    const runResult = spawnSync('npx', ['tsx', indexScript], {
      encoding: 'utf-8',
      cwd: consumerDir,
    });
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

    const logResponse = await fetch(`${SERVER_BASE}/__test__/log`);
    const log = (await logResponse.json()) as Array<{ method: string; url: string }>;
    expect(log).toContainEqual({ method: 'GET', url: '/pets/1' });
    expect(log).toContainEqual({ method: 'POST', url: '/pets' });
    expect(
      log.some(
        (e) =>
          e.method === 'GET' &&
          e.url.startsWith('/pets?') &&
          e.url.includes('filter%5Bname%5D=rex') &&
          e.url.includes('filter%5Bstatus%5D=available')
      ),
      `deepObject query not found in log:\n${JSON.stringify(log, null, 2)}`
    ).toBe(true);
  }, 60_000);

  test('cancel: AbortController aborts the underlying request', async () => {
    expect(existsSync(generatedFile), 'previous test must have produced api.ts').toBe(true);

    const cancelResult = spawnSync('npx', ['tsx', cancelScript], {
      encoding: 'utf-8',
      cwd: consumerDir,
      timeout: 15_000,
    });
    expect(
      cancelResult.status,
      `cancel stdout:\n${cancelResult.stdout}\nstderr:\n${cancelResult.stderr}`
    ).toBe(0);
    expect(cancelResult.stdout.trim()).toBe('CANCELLED:AbortError');
  }, 30_000);
});
