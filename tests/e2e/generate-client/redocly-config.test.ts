// generate-client reads its settings from a `redocly.yaml` `client` block (top-level
// shared defaults) and per-API `apis.<name>.client` / `clientOutput`. Invocation modes:
// fan-out (no arg, over apis with a `client` block) and an `apis:` alias or file path,
// resolved like `bundle`/`lint`. CLI flags override the config.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { cliEntry, repoRoot } from './helpers.js';

// The smallest spec these tests need: `listOrders` fits the cursor convention
// (an `after` query param + `/page/endCursor` + `/items` pointers), `getRevenue`
// does not (no `after` param), and the named schemas give `zod` something to emit.
const SPEC =
  [
    'openapi: 3.1.0',
    'info: { title: Test, version: 1.0.0 }',
    'servers:',
    '  - url: https://api.example.com',
    'paths:',
    '  /orders:',
    '    get:',
    '      operationId: listOrders',
    '      tags: [Orders]',
    '      parameters:',
    '        - { name: after, in: query, schema: { type: string } }',
    '        - { name: limit, in: query, schema: { type: integer } }',
    '      responses:',
    "        '200':",
    '          description: ok',
    '          content:',
    '            application/json:',
    "              schema: { $ref: '#/components/schemas/OrderPage' }",
    '  /revenue:',
    '    get:',
    '      operationId: getRevenue',
    '      tags: [Revenue]',
    '      responses:',
    "        '200':",
    '          description: ok',
    '          content:',
    '            application/json:',
    '              schema: { type: object, properties: { total: { type: number } } }',
    'components:',
    '  schemas:',
    '    Order:',
    '      type: object',
    '      properties:',
    '        id: { type: string }',
    '    OrderPage:',
    '      type: object',
    '      properties:',
    '        page:',
    '          type: object',
    '          properties:',
    '            endCursor: { type: string }',
    '        items:',
    '          type: array',
    "          items: { $ref: '#/components/schemas/Order' }",
  ].join('\n') + '\n';

/** Write a temp project: the minimal spec + a redocly.yaml with the given contents. */
function project(redoclyYaml: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'ots-redocly-'));
  writeFileSync(join(dir, 'openapi.yaml'), SPEC, 'utf-8');
  writeFileSync(join(dir, 'redocly.yaml'), redoclyYaml, 'utf-8');
  return dir;
}
const run = (dir: string, args: string[] = []) =>
  spawnSync('node', [cliEntry, 'generate-client', ...args], { cwd: dir, encoding: 'utf-8' });

describe('generate-client redocly.yaml config', () => {
  it('fan-out (no arg) builds every api with a `client` block or `clientOutput`', () => {
    const dir = project(
      [
        'client:', // shared defaults, inherited by apis without their own block
        '  generators: [sdk]',
        '  serverUrl: https://shared.example.com',
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./src/cafe.ts',
        '    client:',
        '      generators: [sdk]',
        '  outputOnly:', // `clientOutput` alone also opts in
        '    root: ./openapi.yaml',
        '    clientOutput: ./src/output-only.ts',
        '  lintOnly:', // neither -> skipped by the fan-out
        '    root: ./openapi.yaml',
      ].join('\n') + '\n'
    );
    const res = run(dir);
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'src/cafe.ts'))).toBe(true);
    expect(existsSync(join(dir, 'lintOnly.client.ts'))).toBe(false);
    expect(readFileSync(join(dir, 'src/cafe.ts'), 'utf-8')).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS,'
    );
    // The clientOutput-only api inherits the top-level `client` defaults.
    expect(readFileSync(join(dir, 'src/output-only.ts'), 'utf-8')).toContain(
      'serverUrl: "https://shared.example.com"'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('defaults the output to `<name>.client.ts` in the config dir when clientOutput is omitted', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    client:',
        '      generators: [sdk]',
      ].join('\n') + '\n'
    );
    const res = run(dir);
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'cafe.client.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('resolves an `apis:` alias passed as <api>, using its client block + clientOutput', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      serverUrl: https://per-api.example.com',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://per-api.example.com"'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('a named alias falls back to the top-level `client` when it has no per-api block', () => {
    const dir = project(
      [
        'client:',
        '  generators: [sdk]',
        '  serverUrl: https://top-level.example.com',
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    // serverUrl came from the top-level client block (the api declares none).
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://top-level.example.com"'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it("a file path matching an api root uses that api's config (like `bundle`); an unmatched path uses the top-level defaults", () => {
    const dir = project(
      [
        'client:',
        '  generators: [sdk, zod]', // shared defaults that must survive the per-api override
        '  serverUrl: https://top-level.example.com',
        '  pagination:',
        '    style: cursor',
        '    cursorParam: after',
        '    nextCursor: /page/endCursor',
        '    items: /items',
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    client:',
        '      serverUrl: https://per-api.example.com',
        '      pagination:', // partial: must layer onto the shared convention, not replace it
        '        exclude: [getRevenue]',
      ].join('\n') + '\n'
    );
    writeFileSync(join(dir, 'standalone.yaml'), SPEC, 'utf-8'); // not registered under `apis:`

    const matched = run(dir, ['./openapi.yaml', '--output', './matched.ts']);
    expect(matched.status, matched.stderr).toBe(0);
    const matchedOut = readFileSync(join(dir, 'matched.ts'), 'utf-8');
    expect(matchedOut).toContain('serverUrl: "https://per-api.example.com"');
    expect(matchedOut).toContain('pagination: {'); // top-level convention kept, field by field
    // The shared `generators` default kept too: the zod module is emitted alongside.
    expect(existsSync(join(dir, 'matched.zod.ts'))).toBe(true);

    const unmatched = run(dir, ['./standalone.yaml', '--output', './unmatched.ts']);
    expect(unmatched.status, unmatched.stderr).toBe(0);
    expect(readFileSync(join(dir, 'unmatched.ts'), 'utf-8')).toContain(
      'serverUrl: "https://top-level.example.com"'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('CLI flags override the client block', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      serverUrl: https://per-api.example.com',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe', '--server-url', 'https://flag.example.com']);
    expect(res.status, res.stderr).toBe(0);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://flag.example.com"'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('warns on a removed `facade` key (config struct rule) but still generates', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      facade: service-class', // removed option -> property-not-expected warning
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout + res.stderr).toContain('Property `facade` is not expected here.');
    expect(res.stderr).toContain('Your config has 1 warning');
    expect(existsSync(join(dir, 'out.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('applies a `client.pagination` convention rule (descriptor + flat-sugar iterators)', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      pagination:',
        '        style: cursor',
        '        cursorParam: after',
        '        nextCursor: /page/endCursor',
        '        limitParam: limit',
        '        items: /items',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    // The pagination block is part of the config schema -> no struct-rule warning.
    expect(res.stdout + res.stderr).not.toContain('is not expected here');
    const out = readFileSync(join(dir, 'out.ts'), 'utf-8');
    // The convention fits the cursor-style list operations -> descriptor pagination…
    expect(out).toContain('pagination: {');
    // …and the flat sugar preserves the method-attached iterators.
    expect(out).toContain('items: client.listOrders.items');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('fails generation when an explicit `pagination.operations` rule does not fit', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      pagination:',
        '        operations:',
        '          getRevenue:', // has no `after` query param -> explicit misfit = error
        '            style: cursor',
        '            cursorParam: after',
        '            nextCursor: /page/endCursor',
        '            items: /items',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('Invalid pagination configuration');
    expect(res.stderr).toContain(
      'Pagination for operation "getRevenue" (pagination.operations["getRevenue"]): query parameter "after" is not declared on the operation'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('warns on an unknown key inside `client.pagination` (config struct rule) but still generates', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      pagination:',
        '        style: cursor',
        '        cursor_param: after', // unknown key -> property-not-expected warning
        '        cursorParam: after',
        '        nextCursor: /page/endCursor',
        '        items: /items',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout + res.stderr).toContain('Property `cursor_param` is not expected here.');
    expect(res.stderr).toContain('Your config has 1 warning');
    expect(existsSync(join(dir, 'out.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('rejects --output in fan-out mode', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    client:',
        '      generators: [sdk]',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['--output', './out.ts']);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("--output can't target multiple APIs");
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('errors when no api has a `client` block and none is named', () => {
    const dir = project(['apis:', '  cafe:', '    root: ./openapi.yaml'].join('\n') + '\n');
    const res = run(dir);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('No API to generate');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('errors when two fan-out apis resolve to the same clientOutput', () => {
    const dir = project(
      [
        'apis:',
        '  a:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./dupe.ts',
        '    client: { generators: [sdk] }',
        '  b:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./dupe.ts',
        '    client: { generators: [sdk] }',
      ].join('\n') + '\n'
    );
    const res = run(dir);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('resolve to the same output path');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('rejects a bare-hostname serverUrl but accepts absolute and root-relative', () => {
    const withServerUrl = (serverUrl: string) =>
      project(
        [
          'apis:',
          '  cafe:',
          '    root: ./openapi.yaml',
          '    clientOutput: ./out.ts',
          '    client:',
          '      generators: [sdk]',
          `      serverUrl: ${serverUrl}`,
        ].join('\n') + '\n'
      );
    const bare = withServerUrl('api.example.com');
    const bad = run(bare, ['cafe']);
    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toContain('--server-url must be an absolute URL');
    rmSync(bare, { recursive: true, force: true });

    for (const ok of ['https://api.example.com', '/v1']) {
      const dir = withServerUrl(ok);
      const res = run(dir, ['cafe']);
      expect(res.status, res.stderr).toBe(0);
      rmSync(dir, { recursive: true, force: true });
    }

    // Non-http(s) schemes and protocol-relative hosts are rejected too — the value is
    // inlined as the client's default fetch base.
    for (const hostile of ['javascript:alert(1)', 'file:///etc/passwd', '//evil.example.com']) {
      const dir = withServerUrl(`"${hostile}"`);
      const res = run(dir, ['cafe']);
      expect(res.status, `expected rejection for ${hostile}`).not.toBe(0);
      expect(res.stderr).toContain('--server-url must be an absolute URL');
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('rejects a URL `client.setup` upfront (setup is a local module baked into the client)', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      setup: https://cdn.example.com/setup.ts',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('must be a local file path');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('a `client.runtime: package` config block reaches the writer', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      runtime: package',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    const out = readFileSync(join(dir, 'out.ts'), 'utf-8');
    expect(out).toContain("from '@redocly/client-generator'");
    expect(out).not.toContain('__send');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('resolves a relative clientOutput against the redocly.yaml dir (via --config)', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out/client.ts',
        '    client:',
        '      generators: [sdk]',
      ].join('\n') + '\n'
    );
    // Run from the repo root, pointing at the config elsewhere via --config.
    const res = spawnSync(
      'node',
      [cliEntry, 'generate-client', '--config', join(dir, 'redocly.yaml')],
      { cwd: repoRoot, encoding: 'utf-8' }
    );
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'out/client.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it("applies the api's per-alias decorators to the input before generating", () => {
    // The client is generated from the api's resolved config (like `bundle`/`lint`), so a
    // per-api `remove-x-internal` decorator strips the x-internal operation before the IR
    // is built — the generated client must not contain it.
    const dir = mkdtempSync(join(tmpdir(), 'ots-redocly-decorators-'));
    writeFileSync(
      join(dir, 'openapi.yaml'),
      [
        'openapi: 3.1.0',
        'info: { title: T, version: 1.0.0 }',
        'paths:',
        '  /public:',
        '    get: { operationId: getPublic, responses: { 200: { description: ok } } }',
        '  /secret:',
        '    get: { operationId: getSecret, x-internal: true, responses: { 200: { description: ok } } }',
      ].join('\n') + '\n',
      'utf-8'
    );
    writeFileSync(
      join(dir, 'redocly.yaml'),
      [
        'apis:',
        '  main:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./client.ts',
        '    decorators:',
        '      remove-x-internal: on',
        '    client:',
        '      generators: [sdk]',
      ].join('\n') + '\n',
      'utf-8'
    );
    const res = run(dir, ['main']);
    expect(res.status, res.stderr).toBe(0);
    const client = readFileSync(join(dir, 'client.ts'), 'utf-8');
    expect(client).toContain('getPublic');
    expect(client).not.toContain('getSecret');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
