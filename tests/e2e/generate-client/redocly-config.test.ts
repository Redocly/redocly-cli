import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
// generate-client reads its settings from a `redocly.yaml` `client` block (top-level
// shared defaults) and per-API `apis.<name>.client` / `clientOutput`. Invocation modes:
// fan-out (no arg, over apis with a `client` block) and an `apis:` alias or file path,
// resolved like `bundle`/`lint`. CLI flags override the config.
// The config is what each test changes, so each test writes its own redocly.yaml.
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { runCommandResult } from '../helpers.js';
import { cliEntry, repoRoot } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixture = join(repoRoot, 'resources/cafe.yaml');

let dir = '';

/** Write a temp project: the cafe description as openapi.yaml + a redocly.yaml with the given contents. */
function writeProject(redoclyYaml: string): void {
  dir = mkdtempSync(join(tmpdir(), 'generate-client-config-'));
  copyFileSync(fixture, join(dir, 'openapi.yaml'));
  writeFileSync(join(dir, 'redocly.yaml'), redoclyYaml, 'utf-8');
}

/** A config with one `cafe` api whose client block sets the given serverUrl. */
function configWithServerUrl(serverUrl: string): string {
  return outdent`
    apis:
      cafe:
        root: ./openapi.yaml
        clientOutput: ./out.ts
        client:
          generators: [typescript]
          serverUrl: "${serverUrl}"
  `;
}

describe('generate-client redocly.yaml config', () => {
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('fan-out (no arg) builds every api with a `client` block or `clientOutput`', () => {
    // `outputOnly` opts in with `clientOutput` alone; `lintOnly` has neither, so the fan-out skips it.
    writeProject(outdent`
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
    const res = runCommandResult('node', [cliEntry, 'generate-client'], { testPath: dir });
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'src/cafe.ts'))).toBe(true);
    expect(existsSync(join(dir, 'lintOnly.client.ts'))).toBe(false);
    // The clientOutput-only api inherits the top-level `client` defaults.
    expect(readFileSync(join(dir, 'src/output-only.ts'), 'utf-8')).toContain(
      'serverUrl: "https://shared.example.com"'
    );
  });

  it('defaults the output to `<name>.client.ts` in the config dir when clientOutput is omitted', () => {
    writeProject(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          client:
            generators: [typescript]
    `);
    const res = runCommandResult('node', [cliEntry, 'generate-client'], { testPath: dir });
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'cafe.client.ts'))).toBe(true);
  });

  const serverUrlCases = [
    {
      name: 'an `apis:` alias uses its own client block and clientOutput',
      config: outdent`
        apis:
          cafe:
            root: ./openapi.yaml
            clientOutput: ./out.ts
            client:
              generators: [typescript]
              serverUrl: https://per-api.example.com
      `,
      args: ['cafe'],
      outputFile: 'out.ts',
      serverUrl: 'https://per-api.example.com',
    },
    {
      name: 'an alias without a client block falls back to the top-level block',
      config: outdent`
        client:
          generators: [typescript]
          serverUrl: https://top-level.example.com
        apis:
          cafe:
            root: ./openapi.yaml
            clientOutput: ./out.ts
      `,
      args: ['cafe'],
      outputFile: 'out.ts',
      serverUrl: 'https://top-level.example.com',
    },
    {
      name: "a file path that matches an api root uses that api's block (like `bundle`)",
      config: outdent`
        client:
          generators: [typescript]
          serverUrl: https://top-level.example.com
        apis:
          cafe:
            root: ./openapi.yaml
            client:
              generators: [typescript]
              serverUrl: https://per-api.example.com
      `,
      args: ['./openapi.yaml', '--output', './matched.ts'],
      outputFile: 'matched.ts',
      serverUrl: 'https://per-api.example.com',
    },
    {
      name: 'a file path that matches no api root uses the top-level block',
      config: outdent`
        client:
          generators: [typescript]
          serverUrl: https://top-level.example.com
        apis:
          cafe:
            root: ./openapi.yaml
            client:
              generators: [typescript]
              serverUrl: https://per-api.example.com
      `,
      args: [fixture, '--output', './unmatched.ts'],
      outputFile: 'unmatched.ts',
      serverUrl: 'https://top-level.example.com',
    },
    {
      name: 'a CLI flag overrides the client block',
      config: configWithServerUrl('https://per-api.example.com'),
      args: ['cafe', '--server-url', 'https://flag.example.com'],
      outputFile: 'out.ts',
      serverUrl: 'https://flag.example.com',
    },
    {
      name: 'a root-relative serverUrl is accepted',
      config: configWithServerUrl('/v1'),
      args: ['cafe'],
      outputFile: 'out.ts',
      serverUrl: '/v1',
    },
  ];
  for (const testCase of serverUrlCases) {
    it(`serverUrl: ${testCase.name}`, () => {
      writeProject(testCase.config);
      const res = runCommandResult('node', [cliEntry, 'generate-client', ...testCase.args], {
        testPath: dir,
      });
      expect(res.status, res.stderr).toBe(0);
      expect(readFileSync(join(dir, testCase.outputFile), 'utf-8')).toContain(
        `serverUrl: "${testCase.serverUrl}"`
      );
    });
  }

  it('a per-api client block REPLACES the top-level one (no field-by-field merging)', () => {
    // One resolution path, obvious to reason about: an api with its own `client`
    // uses that block wholesale; the top-level block only serves apis without one.
    writeProject(outdent`
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
    const res = runCommandResult('node', [cliEntry, 'generate-client', 'cafe'], { testPath: dir });
    expect(res.status, res.stderr).toBe(0);
    const entry = readFileSync(join(dir, 'out.ts'), 'utf-8');
    // The per-api block applied…
    expect(entry).toContain('argsStyle: "flat"');
    // …and the top-level fields did NOT leak in: default throw mode, no zod module.
    expect(entry).not.toContain('errorMode: "result"');
    expect(existsSync(join(dir, 'out.zod.ts'))).toBe(false);
  });

  const structWarningCases = [
    {
      name: 'a removed `facade` key',
      config: outdent`
        apis:
          cafe:
            root: ./openapi.yaml
            clientOutput: ./out.ts
            client:
              generators: [typescript]
              facade: service-class
      `,
      warning: 'Property `facade` is not expected here.',
    },
    {
      name: 'an unknown key inside `client.pagination`',
      config: outdent`
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
      `,
      warning: 'Property `cursor_param` is not expected here.',
    },
  ];
  for (const testCase of structWarningCases) {
    it(`warns on ${testCase.name} (config struct rule) but still generates`, () => {
      writeProject(testCase.config);
      const res = runCommandResult('node', [cliEntry, 'generate-client', 'cafe'], {
        testPath: dir,
      });
      expect(res.status, res.stderr).toBe(0);
      expect(res.stdout + res.stderr).toContain(testCase.warning);
      expect(res.stderr).toContain('Your config has 1 warning');
      expect(existsSync(join(dir, 'out.ts'))).toBe(true);
    });
  }

  const errorCases = [
    {
      name: 'rejects --output in fan-out mode',
      config: outdent`
        apis:
          cafe:
            root: ./openapi.yaml
            client:
              generators: [typescript]
      `,
      args: ['--output', './out.ts'],
      message: "--output can't target multiple APIs",
    },
    {
      name: 'errors when no api has a `client` block and none is named',
      config: outdent`
        apis:
          cafe:
            root: ./openapi.yaml
      `,
      args: [],
      message: 'No API to generate',
    },
    {
      name: 'errors when two fan-out apis resolve to the same clientOutput',
      config: outdent`
        apis:
          a:
            root: ./openapi.yaml
            clientOutput: ./dupe.ts
            client: { generators: [typescript] }
          b:
            root: ./openapi.yaml
            clientOutput: ./dupe.ts
            client: { generators: [typescript] }
      `,
      args: [],
      message: 'Two APIs write to the same path',
    },
    {
      // setup is a local module baked into the client.
      name: 'rejects a URL `client.setup` upfront',
      config: outdent`
        apis:
          cafe:
            root: ./openapi.yaml
            clientOutput: ./out.ts
            client:
              generators: [typescript]
              setup: https://cdn.example.com/setup.ts
      `,
      args: ['cafe'],
      message: 'must be a local file path',
    },
  ];
  for (const testCase of errorCases) {
    it(testCase.name, () => {
      writeProject(testCase.config);
      const res = runCommandResult('node', [cliEntry, 'generate-client', ...testCase.args], {
        testPath: dir,
      });
      expect(res.status).not.toBe(0);
      expect(res.stderr).toContain(testCase.message);
    });
  }

  // The value is inlined as the client's default fetch base, so only an absolute http(s)
  // URL or a root-relative path is allowed.
  it.each(['api.example.com', 'javascript:alert(1)', 'file:///etc/passwd', '//evil.example.com'])(
    'rejects the serverUrl %s',
    (serverUrl) => {
      writeProject(configWithServerUrl(serverUrl));
      const res = runCommandResult('node', [cliEntry, 'generate-client', 'cafe'], {
        testPath: dir,
      });
      expect(res.status).not.toBe(0);
      expect(res.stderr).toContain('serverUrl must be an absolute URL');
    }
  );

  it('a per-api block drives split output and extra generators', () => {
    writeProject(outdent`
      apis:
        realm:
          root: ./openapi.yaml
          clientOutput: ./out/client.ts
          client:
            generators: [typescript, zod]
            outputMode: split
    `);
    const res = runCommandResult('node', [cliEntry, 'generate-client', 'realm'], { testPath: dir });
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'out/client.ts'))).toBe(true);
    expect(existsSync(join(dir, 'out/client.schemas.ts'))).toBe(true); // split layout
    expect(existsSync(join(dir, 'out/client.zod.ts'))).toBe(true);
  });

  it('resolves a relative clientOutput against the redocly.yaml dir (via --config)', () => {
    writeProject(outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out/client.ts
          client:
            generators: [typescript]
    `);
    // Run from another folder, pointing at the config with --config.
    const res = runCommandResult(
      'node',
      [cliEntry, 'generate-client', '--config', join(dir, 'redocly.yaml')],
      { testPath: __dirname }
    );
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
    const res = runCommandResult('node', [cliEntry, 'generate-client', 'main'], { testPath: dir });
    expect(res.status, res.stderr).toBe(0);
    const client = readFileSync(join(dir, 'client.ts'), 'utf-8');
    expect(client).toContain('getPublic');
    expect(client).not.toContain('getSecret');
  });
});
