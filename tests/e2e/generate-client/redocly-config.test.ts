// generate-client reads its settings from a `redocly.yaml` `client` block (top-level
// shared defaults) and per-API `apis.<name>.client` / `clientOutput`. Invocation modes:
// fan-out (no arg, over apis with a `client` block) and an `apis:` alias or file path,
// resolved like `bundle`/`lint`. CLI flags override the config.
// The config is what each test changes, so each test writes its own redocly.yaml.

import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { runGenerateClient } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');

let dir = '';

/** Write a temp project: the cafe description as openapi.yaml + a redocly.yaml with the given contents. */
function project(redoclyYaml: string): void {
  dir = mkdtempSync(join(tmpdir(), 'generate-client-config-'));
  copyFileSync(fixture, join(dir, 'openapi.yaml'));
  writeFileSync(join(dir, 'redocly.yaml'), redoclyYaml, 'utf-8');
}
const run = (cwd: string, args: string[] = []) => runGenerateClient(args, cwd);

describe('generate-client redocly.yaml config', () => {
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('fan-out (no arg) builds every api with a `client` block or `clientOutput`', () => {
    // `outputOnly` opts in with `clientOutput` alone; `lintOnly` has neither, so the fan-out skips it.
    project(outdent`
      client:
        generators: [typescript]
        serverUrl: https://shared.example.com
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./src/cafe.ts
          client:
            generators: [typescript]
        outputOnly:
          root: ./openapi.yaml
          clientOutput: ./src/output-only.ts
        lintOnly:
          root: ./openapi.yaml
    `);
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
  });

  it('defaults the output to `<name>.client.ts` in the config dir when clientOutput is omitted', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          client:
            generators: [typescript]
    `);
    const res = run(dir);
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'cafe.client.ts'))).toBe(true);
  });

  it('resolves an `apis:` alias passed as <api>, using its client block + clientOutput', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            generators: [typescript]
            serverUrl: https://per-api.example.com
    `);
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://per-api.example.com"'
    );
  });

  it('a named alias falls back to the top-level `client` when it has no per-api block', () => {
    project(outdent`
      client:
        generators: [typescript]
        serverUrl: https://top-level.example.com
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
    `);
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    // serverUrl came from the top-level client block (the api declares none).
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://top-level.example.com"'
    );
  });

  it('a per-api client block REPLACES the top-level one (no field-by-field merging)', () => {
    // One resolution path, obvious to reason about: an api with its own `client`
    // uses that block wholesale; the top-level block only serves apis without one.
    project(outdent`
      client:
        generators: [typescript, zod]
        errorMode: result
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            argsStyle: flat
    `);
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    const entry = readFileSync(join(dir, 'out.ts'), 'utf-8');
    // The per-api block applied…
    expect(entry).toContain('argsStyle: "flat"');
    // …and the top-level fields did NOT leak in: default throw mode, no zod module.
    expect(entry).not.toContain('errorMode: "result"');
    expect(existsSync(join(dir, 'out.zod.ts'))).toBe(false);
  });

  it("a file path matching an api root uses that api's config (like `bundle`); an unmatched path uses the top-level defaults", () => {
    project(outdent`
      client:
        generators: [typescript]
        serverUrl: https://top-level.example.com
      apis:
        cafe:
          root: ./openapi.yaml
          client:
            generators: [typescript]
            serverUrl: https://per-api.example.com
    `);
    copyFileSync(fixture, join(dir, 'standalone.yaml')); // not registered under `apis:`

    const matched = run(dir, ['./openapi.yaml', '--output', './matched.ts']);
    expect(matched.status, matched.stderr).toBe(0);
    const matchedOut = readFileSync(join(dir, 'matched.ts'), 'utf-8');
    expect(matchedOut).toContain('serverUrl: "https://per-api.example.com"');

    const unmatched = run(dir, ['./standalone.yaml', '--output', './unmatched.ts']);
    expect(unmatched.status, unmatched.stderr).toBe(0);
    expect(readFileSync(join(dir, 'unmatched.ts'), 'utf-8')).toContain(
      'serverUrl: "https://top-level.example.com"'
    );
  });

  it('CLI flags override the client block', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            generators: [typescript]
            serverUrl: https://per-api.example.com
    `);
    const res = run(dir, ['cafe', '--server-url', 'https://flag.example.com']);
    expect(res.status, res.stderr).toBe(0);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://flag.example.com"'
    );
  });

  it('warns on a removed `facade` key (config struct rule) but still generates', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            generators: [typescript]
            facade: service-class
    `);
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout + res.stderr).toContain('Property `facade` is not expected here.');
    expect(res.stderr).toContain('Your config has 1 warning');
    expect(existsSync(join(dir, 'out.ts'))).toBe(true);
  });

  it('warns on an unknown key inside `client.pagination` (config struct rule) but still generates', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            generators: [typescript]
            pagination:
              style: cursor
              cursor_param: after
              cursorParam: after
              nextCursor: /page/endCursor
              items: /items
    `);
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout + res.stderr).toContain('Property `cursor_param` is not expected here.');
    expect(res.stderr).toContain('Your config has 1 warning');
    expect(existsSync(join(dir, 'out.ts'))).toBe(true);
  });

  it('rejects --output in fan-out mode', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          client:
            generators: [typescript]
    `);
    const res = run(dir, ['--output', './out.ts']);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("--output can't target multiple APIs");
  });

  it('errors when no api has a `client` block and none is named', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
    `);
    const res = run(dir);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('No API to generate');
  });

  it('errors when two fan-out apis resolve to the same clientOutput', () => {
    project(outdent`
      apis:
        a:
          root: ./openapi.yaml
          clientOutput: ./dupe.ts
          client: { generators: [typescript] }
        b:
          root: ./openapi.yaml
          clientOutput: ./dupe.ts
          client: { generators: [typescript] }
    `);
    const res = run(dir);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('Two APIs write to the same path');
  });

  it('rejects a bare-hostname serverUrl but accepts absolute and root-relative', () => {
    const configWithServerUrl = (serverUrl: string) => outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            generators: [typescript]
            serverUrl: ${serverUrl}
    `;

    project(configWithServerUrl('api.example.com'));
    const bad = run(dir, ['cafe']);
    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toContain('serverUrl must be an absolute URL');

    for (const ok of ['https://api.example.com', '/v1']) {
      writeFileSync(join(dir, 'redocly.yaml'), configWithServerUrl(ok), 'utf-8');
      const res = run(dir, ['cafe']);
      expect(res.status, res.stderr).toBe(0);
    }

    // Non-http(s) schemes and protocol-relative hosts are rejected too — the value is
    // inlined as the client's default fetch base.
    for (const hostile of ['javascript:alert(1)', 'file:///etc/passwd', '//evil.example.com']) {
      writeFileSync(join(dir, 'redocly.yaml'), configWithServerUrl(`"${hostile}"`), 'utf-8');
      const res = run(dir, ['cafe']);
      expect(res.status, `expected rejection for ${hostile}`).not.toBe(0);
      expect(res.stderr).toContain('serverUrl must be an absolute URL');
    }
  });

  it('rejects a URL `client.setup` upfront (setup is a local module baked into the client)', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            generators: [typescript]
            setup: https://cdn.example.com/setup.ts
    `);
    const res = run(dir, ['cafe']);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('must be a local file path');
  });

  it('a per-api block drives split output and extra generators', () => {
    project(outdent`
      apis:
        realm:
          root: ./openapi.yaml
          clientOutput: ./out/client.ts
          client:
            generators: [typescript, zod]
            outputMode: split
    `);
    const res = run(dir, ['realm']);
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'out/client.ts'))).toBe(true);
    expect(existsSync(join(dir, 'out/client.schemas.ts'))).toBe(true); // split layout
    expect(existsSync(join(dir, 'out/client.zod.ts'))).toBe(true);
  });

  it('resolves a relative clientOutput against the redocly.yaml dir (via --config)', () => {
    project(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out/client.ts
          client:
            generators: [typescript]
    `);
    // Run from another folder, pointing at the config with --config.
    const res = runGenerateClient(['--config', join(dir, 'redocly.yaml')]);
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'out/client.ts'))).toBe(true);
  });

  it("applies the api's per-alias decorators to the input before generating", () => {
    // The client is generated from the api's resolved config (like `bundle`/`lint`), so a
    // per-api `remove-x-internal` decorator strips the x-internal operation before the IR
    // is built — the generated client must not contain it.
    dir = mkdtempSync(join(tmpdir(), 'generate-client-config-'));
    writeFileSync(
      join(dir, 'openapi.yaml'),
      outdent`
        openapi: 3.1.0
        info: { title: T, version: 1.0.0 }
        paths:
          /public:
            get: { operationId: getPublic, responses: { 200: { description: ok } } }
          /secret:
            get: { operationId: getSecret, x-internal: true, responses: { 200: { description: ok } } }
      `,
      'utf-8'
    );
    writeFileSync(
      join(dir, 'redocly.yaml'),
      outdent`
        apis:
          main:
            root: ./openapi.yaml
            clientOutput: ./client.ts
            decorators:
              remove-x-internal: on
            client:
              generators: [typescript]
      `,
      'utf-8'
    );
    const res = run(dir, ['main']);
    expect(res.status, res.stderr).toBe(0);
    const client = readFileSync(join(dir, 'client.ts'), 'utf-8');
    expect(client).toContain('getPublic');
    expect(client).not.toContain('getSecret');
  });
});
