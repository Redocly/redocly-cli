// `client.cliOutput` in redocly.yaml: one `generate-client --config` run composes the generated
// CLIs of every api that selected the cli generator behind one entry, and the command rejects
// an entry it cannot write.
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { runCommandResult } from '../../helpers.js';
import { cliEntry, copyConsumer, runTsx } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'openapi.yaml');

describe('config-driven composition (client.cliOutput)', () => {
  let project: string;

  beforeAll(() => {
    project = copyConsumer(join(__dirname, 'consumer'));
    // The config names the description by a relative path, so it sits next to the config.
    copyFileSync(fixture, join(project, 'openapi.yaml'));
    // Eject the cli generator first: composition keys off the emitted module, so a
    // `./generators/cli/index.ts` path entry must compose exactly like the built-in name.
    const ejected = runCommandResult(
      'node',
      [cliEntry, 'eject-generator', 'cli', '--config', join(project, 'redocly.yaml')],
      { testPath: project }
    );
    expect(ejected.status, ejected.stderr).toBe(0);
    expect(readFileSync(join(project, 'redocly.yaml'), 'utf-8')).toContain(
      'generators: [typescript, zod, ./generators/cli/index.ts]'
    );
    const generated = runCommandResult(
      'node',
      [cliEntry, 'generate-client', '--config', join(project, 'redocly.yaml')],
      { testPath: project }
    );
    expect(generated.status, generated.stderr).toBe(0);
  });

  afterAll(() => {
    rmSync(project, { recursive: true, force: true });
  });

  it('one generate run emits the composed entry over every api that selected cli', async () => {
    const help = await runTsx(join(project, 'bin/cafe.ts'), ['--help'], { cwd: project });
    expect(help.status, help.stderr).toBe(0);
    // Run as a script, so help names the file without its extension — never `cafe.ts`,
    // which is not a command anyone can type.
    expect(help.stdout).toContain('Usage: cafe <api> <command>');
    expect(help.stdout).toContain('shop');
    expect(help.stdout).toContain('kitchen');
  });

  it('routes a namespace and reads the alias-scoped credential', async () => {
    const dry = await runTsx(
      join(project, 'bin/cafe.ts'),
      ['kitchen', 'orders', 'getOrder', 'ord_7', '--dry-run'],
      { cwd: project, env: { CAFE_KITCHEN_TOKEN: 'k-secret' } }
    );
    expect(dry.status, dry.stderr).toBe(0);
    const captured = JSON.parse(dry.stdout);
    expect(captured.url).toContain('/orders/ord_7');
    expect(captured.headers.Authorization).toBe('***');
    expect(JSON.stringify(captured)).not.toContain('k-secret');
  });
});

describe('client.cliOutput validation', () => {
  let project = '';

  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
  });

  // The value of `cliOutput` is what each test changes, so the config is written here.
  function generateWith(cliOutput: string) {
    project = mkdtempSync(join(tmpdir(), 'cli-output-invalid-'));
    writeFileSync(
      join(project, 'redocly.yaml'),
      outdent`
        extends: []
        client:
          cliOutput: ${cliOutput}
          generators: [typescript, zod, cli]
        apis:
          shop: { root: ${fixture}, clientOutput: ./src/shop.ts }
      `,
      'utf-8'
    );
    return runCommandResult(
      'node',
      [cliEntry, 'generate-client', '--config', join(project, 'redocly.yaml')],
      { testPath: project }
    );
  }

  it('rejects a non-.ts entry instead of writing TypeScript into it', () => {
    const result = generateWith('./bin/cafe.js');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('client.cliOutput must point at a TypeScript file');
  });

  it('rejects an entry that lands on a file the run generated', () => {
    const result = generateWith('./src/shop.cli.ts');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('client.cliOutput resolves to a file this run generated');
  });
});
