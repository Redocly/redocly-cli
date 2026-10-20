// generate-client reads its settings from a `redocly.yaml` `client` block (top-level
// shared defaults) and per-API `apis.<name>.client` / `clientOutput`. Invocation modes:
// fan-out (no arg, over apis with a `client` block) and an `apis:` alias or file path,
// resolved like `bundle`/`lint`. CLI flags override the config.
// Each case below is one redocly.yaml, the arguments, and what the run must produce.
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

import { runCommandResult } from '../helpers.js';
import { cliEntry, repoRoot } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixture = join(repoRoot, 'resources/cafe.yaml');

type ConfigCase = {
  name: string;
  /** The redocly.yaml of the project. */
  config: string;
  /** The arguments after `generate-client`. */
  args: string[];
  /** The expected exit code: 0 for a generated client, 1 for a rejected config. */
  status: number;
  /** An openapi.yaml for the project. The default is the cafe description. */
  openapi?: string;
  /** Files that must exist after the run, relative to the project. */
  files?: string[];
  /** Files that must not exist after the run. */
  missingFiles?: string[];
  /** Text that a generated file must contain. */
  contains?: { file: string; text: string }[];
  /** Text that a generated file must not contain. */
  notContains?: { file: string; text: string }[];
  /** Text that stderr must contain: a warning or an error message. */
  stderr?: string[];
};

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

const cases: ConfigCase[] = [
  {
    // `outputOnly` opts in with `clientOutput` alone; `lintOnly` has neither, so the fan-out skips it.
    // The clientOutput-only api inherits the top-level `client` defaults.
    name: 'fan-out (no arg) builds every api with a `client` block or `clientOutput`',
    config: outdent`
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
    `,
    args: [],
    status: 0,
    files: ['src/cafe.ts'],
    missingFiles: ['lintOnly.client.ts'],
    contains: [{ file: 'src/output-only.ts', text: 'serverUrl: "https://shared.example.com"' }],
  },
  {
    name: 'defaults the output to `<name>.client.ts` in the config dir when clientOutput is omitted',
    config: outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          client:
            generators: [typescript]
    `,
    args: [],
    status: 0,
    files: ['cafe.client.ts'],
  },
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
    status: 0,
    contains: [{ file: 'out.ts', text: 'serverUrl: "https://per-api.example.com"' }],
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
    status: 0,
    contains: [{ file: 'out.ts', text: 'serverUrl: "https://top-level.example.com"' }],
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
    status: 0,
    contains: [{ file: 'matched.ts', text: 'serverUrl: "https://per-api.example.com"' }],
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
    status: 0,
    contains: [{ file: 'unmatched.ts', text: 'serverUrl: "https://top-level.example.com"' }],
  },
  {
    name: 'a CLI flag overrides the client block',
    config: configWithServerUrl('https://per-api.example.com'),
    args: ['cafe', '--server-url', 'https://flag.example.com'],
    status: 0,
    contains: [{ file: 'out.ts', text: 'serverUrl: "https://flag.example.com"' }],
  },
  {
    name: 'a root-relative serverUrl is accepted',
    config: configWithServerUrl('/v1'),
    args: ['cafe'],
    status: 0,
    contains: [{ file: 'out.ts', text: 'serverUrl: "/v1"' }],
  },
  {
    // An api with its own `client` uses that block as a whole: default throw mode, no zod module.
    name: 'a per-api client block replaces the top-level one (no field-by-field merging)',
    config: outdent`
      client:
        generators: [typescript, zod]
        errorMode: result
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            argsStyle: flat
    `,
    args: ['cafe'],
    status: 0,
    contains: [{ file: 'out.ts', text: 'argsStyle: "flat"' }],
    notContains: [{ file: 'out.ts', text: 'errorMode: "result"' }],
    missingFiles: ['out.zod.ts'],
  },
  {
    name: 'a per-api block drives split output and extra generators',
    config: outdent`
      apis:
        realm:
          root: ./openapi.yaml
          clientOutput: ./out/client.ts
          client:
            generators: [typescript, zod]
            outputMode: split
    `,
    args: ['realm'],
    status: 0,
    files: ['out/client.ts', 'out/client.schemas.ts', 'out/client.zod.ts'],
  },
  {
    // The client is generated from the api's resolved config, so a per-api `remove-x-internal`
    // decorator strips the x-internal operation before the client is built.
    name: "applies the api's per-alias decorators to the input before generating",
    openapi: outdent`
      openapi: 3.1.0
      info: { title: T, version: 1.0.0 }
      paths:
        /public:
          get: { operationId: getPublic, responses: { 200: { description: ok } } }
        /secret:
          get: { operationId: getSecret, x-internal: true, responses: { 200: { description: ok } } }
    `,
    config: outdent`
      apis:
        main:
          root: ./openapi.yaml
          clientOutput: ./client.ts
          decorators:
            remove-x-internal: on
          client:
            generators: [typescript]
    `,
    args: ['main'],
    status: 0,
    contains: [{ file: 'client.ts', text: 'getPublic' }],
    notContains: [{ file: 'client.ts', text: 'getSecret' }],
  },
  {
    name: 'warns on a removed `facade` key (config struct rule) but still generates',
    config: outdent`
      apis:
        cafe:
          root: ./openapi.yaml
          clientOutput: ./out.ts
          client:
            generators: [typescript]
            facade: service-class
    `,
    args: ['cafe'],
    status: 0,
    files: ['out.ts'],
    stderr: ['Property `facade` is not expected here.', 'Your config has 1 warning'],
  },
  {
    name: 'warns on an unknown key inside `client.pagination` (config struct rule) but still generates',
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
    args: ['cafe'],
    status: 0,
    files: ['out.ts'],
    stderr: ['Property `cursor_param` is not expected here.', 'Your config has 1 warning'],
  },
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
    status: 1,
    stderr: ["--output can't target multiple APIs"],
  },
  {
    name: 'errors when no api has a `client` block and none is named',
    config: outdent`
      apis:
        cafe:
          root: ./openapi.yaml
    `,
    args: [],
    status: 1,
    stderr: ['No API to generate'],
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
    status: 1,
    stderr: ['Two APIs write to the same path'],
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
    status: 1,
    stderr: ['must be a local file path'],
  },
  // The serverUrl is inlined as the client's default fetch base, so only an absolute http(s)
  // URL or a root-relative path is allowed.
  {
    name: 'rejects the serverUrl api.example.com',
    config: configWithServerUrl('api.example.com'),
    args: ['cafe'],
    status: 1,
    stderr: ['serverUrl must be an absolute URL'],
  },
  {
    name: 'rejects the serverUrl javascript:alert(1)',
    config: configWithServerUrl('javascript:alert(1)'),
    args: ['cafe'],
    status: 1,
    stderr: ['serverUrl must be an absolute URL'],
  },
  {
    name: 'rejects the serverUrl file:///etc/passwd',
    config: configWithServerUrl('file:///etc/passwd'),
    args: ['cafe'],
    status: 1,
    stderr: ['serverUrl must be an absolute URL'],
  },
  {
    name: 'rejects the serverUrl //evil.example.com',
    config: configWithServerUrl('//evil.example.com'),
    args: ['cafe'],
    status: 1,
    stderr: ['serverUrl must be an absolute URL'],
  },
];

describe('generate-client redocly.yaml config', () => {
  let dir = '';

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'generate-client-config-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // A plain loop keeps the full case name. `it.each` with `$name` cuts it at 40 characters.
  for (const testCase of cases) {
    it(testCase.name, () => {
      writeFileSync(join(dir, 'redocly.yaml'), testCase.config, 'utf-8');
      writeFileSync(join(dir, 'openapi.yaml'), testCase.openapi ?? readFileSync(fixture), 'utf-8');

      const res = runCommandResult('node', [cliEntry, 'generate-client', ...testCase.args], {
        testPath: dir,
      });
      expect(res.status, res.stderr).toBe(testCase.status);

      for (const text of testCase.stderr ?? []) {
        expect(res.stderr).toContain(text);
      }
      for (const file of testCase.files ?? []) {
        expect(existsSync(join(dir, file)), `${file} must exist`).toBe(true);
      }
      for (const file of testCase.missingFiles ?? []) {
        expect(existsSync(join(dir, file)), `${file} must not exist`).toBe(false);
      }
      for (const check of testCase.contains ?? []) {
        expect(readFileSync(join(dir, check.file), 'utf-8')).toContain(check.text);
      }
      for (const check of testCase.notContains ?? []) {
        expect(readFileSync(join(dir, check.file), 'utf-8')).not.toContain(check.text);
      }
    });
  }

  it('resolves a relative clientOutput against the redocly.yaml dir (via --config)', () => {
    copyFileSync(fixture, join(dir, 'openapi.yaml'));
    writeFileSync(
      join(dir, 'redocly.yaml'),
      outdent`
        apis:
          cafe:
            root: ./openapi.yaml
            clientOutput: ./out/client.ts
            client:
              generators: [typescript]
      `,
      'utf-8'
    );
    // Run from another folder, pointing at the config with --config.
    const res = runCommandResult(
      'node',
      [cliEntry, 'generate-client', '--config', join(dir, 'redocly.yaml')],
      { testPath: __dirname }
    );
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'out/client.ts'))).toBe(true);
  });
});
