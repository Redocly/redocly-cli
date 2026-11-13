import { generateClient } from '@redocly/client-generator';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runCommand } from '../helpers/helpers.js';
import { MockServer } from '../helpers/mock-server.js';
import { expectJavacPasses } from './javac.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');
let workDir = '';

describe('generate-client java generator, base.yaml against the mock server', () => {
  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({
      api: fixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['java'],
    });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it(
    'the generated client compiles with every lint on and the smoke runs real HTTP: hydration, bodies, ApiException',
    async () => {
      // The class is named after the output stem, so the file is `Client.java`.
      expectJavacPasses(workDir, ['client/Client.java', 'Smoke.java']);

      const server = await MockServer.start(fixture);
      try {
        const result = await runCommand('java', ['-cp', 'out', 'Smoke', server.url], {
          cwd: workDir,
        });
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('JAVA_SMOKE_OK');
        expect(server.handlerErrors).toEqual([]);
      } finally {
        await server.close();
      }
    },
    // javac starts a JVM, and a cold CI runner takes its time over that.
    180_000
  );
});

describe('generate-client java generator, parameter names an SDK cannot take literally', () => {
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'java-repeated-'));
    await generateClient({
      api: join(__dirname, '../fixtures/repeated-params.yaml'),
      output: join(dir, 'client.ts'),
      generators: ['java'],
    });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('renames a parameter that clashes with one of the method arguments, and still compiles', () => {
    const source = readFileSync(join(dir, 'Client.java'), 'utf-8');
    // Query params live in their own class, so `id` needs no rename here…
    expect(source).toContain('public Thing getThing(String id, GetThingParams params) {');
    // …but a path parameter named after an argument the method declares itself does.
    expect(source).toContain(
      'public Thing makeThing(String body2, String ctx, Thing body, MakeThingParams params) {'
    );
    // The request is unchanged: the wire names stay.
    expect(source).toContain('pathParams("body", textValue(body2), "ctx", textValue(ctx))');
    expectJavacPasses(dir, ['Client.java']);
  }, 180_000);
});
