import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
const fixture = join(__dirname, 'fixtures', 'auth.yaml');

const STRICT_TSCONFIG = {
  compilerOptions: {
    module: 'node16',
    moduleResolution: 'node16',
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

    // Token machinery for the resolvable (bearer + apiKey) schemes.
    expect(generated).toContain('export type TokenProvider');
    expect(generated).toContain('async function __auth');
    expect(generated).toContain('async function __resolve');

    // One setter per scheme kind. Three apiKey schemes (none sole) → keyed names.
    expect(generated).toContain('export function setBearer(token: TokenProvider | null)');
    expect(generated).toContain('export function setBasicAuth(username: string, password: string)');
    expect(generated).toContain('export function setApiKeyQueryKey(key: TokenProvider | null)'); // query
    expect(generated).toContain('export function setApiKeyHeaderKey(key: TokenProvider | null)'); // header
    expect(generated).toContain('export function setApiKeyCookieKey(key: TokenProvider | null)'); // cookie
    expect(generated).toContain('__basicAuth = btoa(`${username}:${password}`)');

    // Per-kind injection inside __auth — each prefers per-instance config.auth, then the global slot.
    expect(generated).toContain('headers["Authorization"] = `Bearer ${v}`');
    expect(generated).toContain('const basic = b ? btoa(`${b.username}:${b.password}`) : __basicAuth;');
    expect(generated).toContain('headers["Authorization"] = `Basic ${basic}`');
    expect(generated).toContain('query["api_key"] = v'); // apiKeyQuery
    expect(generated).toContain('cookies.push("sid=" + v)'); // apiKeyCookie
    expect(generated).toContain('headers["X-Key"] = v'); // apiKeyHeader

    // Per-instance credentials type + ClientConfig field.
    expect(generated).toContain('export type AuthCredentials = {');
    expect(generated).toContain('auth?: AuthCredentials;');

    // Authed operations resolve credentials at the call site (threading the config).
    expect(generated).toContain('const __a = await __auth(["Bearer"], __config);');
    expect(generated).toContain('const __a = await __auth(["HeaderKey"], __config);'); // header-kind awaits too
    expect(generated).toContain('...__a.headers');
    // Query-auth merges into the URL query object.
    expect(generated).toContain('{ ...params, ...__a.query }');
  }, 60_000);

  it('strict-tsc accepts the tags-split multi-file client (guards multi-file auth)', () => {
    // Multi-file modes derive their folder from a `.ts` entry path, so --output
    // must still point at a file; the generator fans out the tree around it.
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
        'tags-split',
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
  // token function resolves through `await __auth` onto the `Authorization`
  // header and (b) a query-key scheme lands `api_key=` in the request URL.
  it('async setBearer resolves onto Authorization and query-key lands in the URL', () => {
    // The driver owns its own throwaway http server (and binds BASE to it at
    // runtime via setBaseUrl), so a single `spawnSync` runs the whole behavioral
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
      `import * as http from 'node:http';
import { getBearer, getQuery, setBaseUrl, setBearer, setApiKeyQueryKey } from './client.js';

const captured: Array<{ url: string; auth?: string }> = [];
const server = http.createServer((req, res) => {
  captured.push({ url: req.url ?? '', auth: req.headers['authorization'] as string | undefined });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ id: 'x' }));
});

async function main() {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  setBaseUrl('http://127.0.0.1:' + port);
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
