import { generateClient } from '@redocly/client-generator';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runConsumer, strictTypecheck } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'openapi.yaml');

describe('generate-client auth breadth', () => {
  let dir = '';

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits all five injectable scheme kinds and strict-tsc accepts the single-file client', async () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-auth-'));
    const out = join(dir, 'client.ts');
    await generateClient({ api: fixture, output: out });
    expect(existsSync(out)).toBe(true);
    const generated = readFileSync(out, 'utf-8');
    strictTypecheck(dir, ['client.ts']);

    // Token machinery for the resolvable (bearer + apiKey) schemes lives in the embedded runtime.
    expect(generated).toContain('export type TokenProvider');
    expect(generated).toContain('async function resolveAuth(');
    expect(generated).toContain('async function resolveToken(');

    // Credentials go through `configure({ auth })` or `client.auth.*`; the module exports
    // no per-scheme setter, so a scheme's key never becomes a reserved export name.
    expect(generated).toContain('export const { configure, use } = client;');
    expect(generated).not.toContain('export const setBearer');
    expect(generated).not.toContain('export const setBasicAuth');
    expect(generated).not.toContain('export const setApiKey');
    // Each scheme still reaches the runtime through the descriptor that requires it.
    expect(generated).toContain('scheme: "QueryKey"');
    expect(generated).toContain('scheme: "CookieKey"');

    // Per-kind injection inside resolveAuth, driven by the descriptors' security specs.
    expect(generated).toContain('headers.Authorization = `Bearer ${await resolveToken(provider)}`');
    expect(generated).toContain(
      'headers.Authorization = `Basic ${encodeBase64(`${basic.username}:${basic.password}`)}`'
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
    expect(generated).toContain('security: [[{ scheme: "Bearer", kind: "bearer" }]]');
    expect(generated).toContain('security: [[{ scheme: "Basic", kind: "basic" }]]');
    expect(generated).toContain(
      'security: [[{ scheme: "QueryKey", kind: "apiKey", name: "api_key", in: "query" }]]'
    );
    expect(generated).toContain(
      'security: [[{ scheme: "CookieKey", kind: "apiKey", name: "sid", in: "cookie" }]]'
    );
    expect(generated).toContain(
      'security: [[{ scheme: "HeaderKey", kind: "apiKey", name: "X-Key", in: "header" }]]'
    );
  }, 60_000);

  it('strict-tsc accepts the split two-file client (guards multi-file auth)', async () => {
    // Split mode derives its folder from a `.ts` entry path, so `output`
    // must still point at a file; the generator emits the schemas file beside it.
    dir = mkdtempSync(join(tmpdir(), 'ots-auth-split-'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts'), outputMode: 'split' });
    strictTypecheck(dir);
  }, 60_000);

  // Behavioral check on a real wire. The cafe mock-server harness is bound to
  // cafe.yaml and heavy to clone, so we drive the generated client against a tiny
  // throwaway http server instead — enough to prove (a) an async bearer provider
  // token function resolves through the runtime's auth capability onto the
  // `Authorization` header and (b) a query-key scheme lands `api_key=` in the URL.
  it('an async bearer provider resolves onto Authorization and a query key lands in the URL', async () => {
    // The driver owns its own throwaway http server (and points the client at it
    // via configure({ serverUrl })), so a single `runConsumer` runs the whole behavioral
    // probe — the server can't be starved by the test process's blocking spawn.
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts') });

    const captured = (await runConsumer(join(dir, 'bearer-and-query-key.ts'))) as Array<{
      url: string;
      auth?: string;
    }>;

    const bearerReq = captured.find((c) => c.url.startsWith('/bearer'));
    expect(bearerReq, JSON.stringify(captured)).toBeDefined();
    expect(bearerReq!.auth).toBe('Bearer tok');

    const queryReq = captured.find((c) => c.url.startsWith('/query'));
    expect(queryReq, JSON.stringify(captured)).toBeDefined();
    expect(queryReq!.url).toContain('api_key=secret-key');
  }, 90_000);

  it('createClient instances keep their own credentials: an authed one sends Basic, a no-auth one sends none', async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts') });

    const calls = (await runConsumer(join(dir, 'instance-credentials.ts'))) as (string | null)[];

    expect(calls).toEqual(['Basic ' + Buffer.from('alice:pw').toString('base64'), null]);
  }, 90_000);
});
