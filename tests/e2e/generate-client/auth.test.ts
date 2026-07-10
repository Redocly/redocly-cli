import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
const fixture = join(__dirname, 'fixtures', 'auth.yaml');

const STRICT_TSCONFIG = {
  compilerOptions: {
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'es2022',
    lib: ['ES2022', 'DOM'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  },
};

/** Generate a single-file client and assert strict `tsc` accepts it. */
function generateSingleFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ots-auth-'));
  const out = join(dir, 'client.ts');
  const res = spawnSync('node', [cli, 'generate-client', fixture, '--output', out], {
    encoding: 'utf-8',
    cwd: repoRoot,
  });
  expect(res.status, res.stderr).toBe(0);
  expect(existsSync(out)).toBe(true);
  const generated = readFileSync(out, 'utf-8');
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({ ...STRICT_TSCONFIG, include: ['client.ts'] }),
    'utf-8'
  );
  const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
  expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  rmSync(dir, { recursive: true, force: true });
  return generated;
}

describe('generate-client auth breadth (auth.yaml)', () => {
  it('emits all five injectable scheme kinds and strict-tsc accepts the single-file client', () => {
    const generated = generateSingleFile();

    // Token machinery for the resolvable (bearer + apiKey) schemes lives in the embedded runtime.
    expect(generated).toContain('export type TokenProvider');
    expect(generated).toContain('async function resolveAuth(');
    expect(generated).toContain('async function resolveToken(');

    // One setter per scheme kind, as instance-bound sugar. Three apiKey schemes (none sole) → keyed names.
    expect(generated).toContain('export const setBearer = client.auth.bearer;');
    expect(generated).toContain('export const setBasicAuth = client.auth.basic;');
    expect(generated).toContain(
      'export const setApiKeyQueryKey = (value: TokenProvider) => client.auth.apiKey("QueryKey", value);'
    );
    expect(generated).toContain(
      'export const setApiKeyHeaderKey = (value: TokenProvider) => client.auth.apiKey("HeaderKey", value);'
    );
    expect(generated).toContain(
      'export const setApiKeyCookieKey = (value: TokenProvider) => client.auth.apiKey("CookieKey", value);'
    );

    // Per-kind injection inside resolveAuth, driven by the descriptors' security specs.
    expect(generated).toContain('headers.Authorization = `Bearer ${await resolveToken(provider)}`');
    expect(generated).toContain(
      'headers.Authorization = `Basic ${btoa(`${basic.username}:${basic.password}`)}`'
    );
    expect(generated).toContain("if (scheme.in === 'header') headers[scheme.name] = value;");
    expect(generated).toContain("else if (scheme.in === 'query') query[scheme.name] = value;");
    expect(generated).toContain(
      'else cookies.push(`${scheme.name}=${encodeURIComponent(value)}`);'
    );

    // Per-instance credentials type + ClientConfig field.
    expect(generated).toContain('export type AuthCredentials = {');
    expect(generated).toContain('auth?: AuthCredentials;');

    // Every scheme kind is denormalized onto its operation descriptor.
    expect(generated).toContain('security: [{ scheme: "Bearer", kind: "bearer" }]');
    expect(generated).toContain('security: [{ scheme: "Basic", kind: "basic" }]');
    expect(generated).toContain(
      'security: [{ scheme: "QueryKey", kind: "apiKey", name: "api_key", in: "query" }]'
    );
    expect(generated).toContain(
      'security: [{ scheme: "CookieKey", kind: "apiKey", name: "sid", in: "cookie" }]'
    );
    expect(generated).toContain(
      'security: [{ scheme: "HeaderKey", kind: "apiKey", name: "X-Key", in: "header" }]'
    );
  }, 60_000);

  it('strict-tsc accepts the split two-file client (guards multi-file auth)', () => {
    // Split mode derives its folder from a `.ts` entry path, so --output
    // must still point at a file; the generator emits the schemas file beside it.
    const dir = mkdtempSync(join(tmpdir(), 'ots-auth-split-'));
    const res = spawnSync(
      'node',
      [
        cli,
        'generate-client',
        fixture,
        '--output',
        join(dir, 'client.ts'),
        '--output-mode',
        'split',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(res.status, res.stderr).toBe(0);
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({ ...STRICT_TSCONFIG, include: ['**/*.ts'] }),
      'utf-8'
    );
    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  // Behavioral check on a real wire. The cafe mock-server harness is bound to
  // cafe.yaml and heavy to clone, so we drive the generated client against a tiny
  // throwaway http server instead — enough to prove (a) an async `setBearer`
  // token function resolves through the runtime's auth capability onto the
  // `Authorization` header and (b) a query-key scheme lands `api_key=` in the URL.
  it('async setBearer resolves onto Authorization and query-key lands in the URL', () => {
    // The driver owns its own throwaway http server (and points the client at it
    // via configure({ serverUrl })), so a single `spawnSync` runs the whole behavioral
    // probe — the server can't be starved by the test process's blocking spawn.
    const dir = mkdtempSync(join(tmpdir(), 'ots-auth-run-'));
    const out = join(dir, 'client.ts');
    const gen = spawnSync('node', [cli, 'generate-client', fixture, '--output', out], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(gen.status, gen.stderr).toBe(0);

    const driver = join(dir, 'driver.ts');
    writeFileSync(
      driver,
      outdent`
        import * as http from 'node:http';
        import { configure, getBearer, getQuery, setBearer, setApiKeyQueryKey } from './client.js';

        const captured: Array<{ url: string; auth?: string }> = [];
        const server = http.createServer((req, res) => {
          captured.push({ url: req.url ?? '', auth: req.headers['authorization'] as string | undefined });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: 'x' }));
        });

        async function main() {
          await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
          const port = (server.address() as { port: number }).port;
          configure({ serverUrl: 'http://127.0.0.1:' + port });
          setBearer(async () => 'tok');
          await getBearer();
          setApiKeyQueryKey('secret-key');
          await getQuery({ limit: 5 });
          await new Promise<void>((r) => server.close(() => r()));
          process.stdout.write(JSON.stringify(captured));
        }
        main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
      `,
      'utf-8'
    );
    const run = spawnSync('npx', ['tsx', driver], { encoding: 'utf-8', cwd: repoRoot });
    expect(run.status, `driver failed:\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`).toBe(0);
    const captured = JSON.parse(run.stdout.trim()) as Array<{ url: string; auth?: string }>;
    rmSync(dir, { recursive: true, force: true });

    const bearerReq = captured.find((c) => c.url.startsWith('/bearer'));
    expect(bearerReq, JSON.stringify(captured)).toBeDefined();
    expect(bearerReq!.auth).toBe('Bearer tok');

    const queryReq = captured.find((c) => c.url.startsWith('/query'));
    expect(queryReq, JSON.stringify(captured)).toBeDefined();
    expect(queryReq!.url).toContain('api_key=secret-key');
  }, 90_000);
});
