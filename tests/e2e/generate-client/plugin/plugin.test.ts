// The experimental custom-generator (plugin) API end-to-end: a `generators` entry that is a path
// specifier is dynamically imported and run alongside the built-ins, and a bad specifier fails fast.

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { runCommandResult } from '../../helpers.js';
import { cliEntry, repoRoot } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cafe = join(repoRoot, 'resources/cafe.yaml');
const plugin = join(__dirname, 'route-map-plugin.mjs');

describe('generate-client custom generator (plugin) API', () => {
  let dir = '';
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'generate-client-plugin-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads a generator from a path specifier and runs it alongside the sdk', () => {
    const output = join(dir, 'client.ts');
    const result = runCommandResult(
      'node',
      [
        cliEntry,
        'generate-client',
        cafe,
        '--output',
        output,
        '--generator',
        'typescript',
        '--generator',
        plugin,
      ],
      { testPath: __dirname }
    );

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(existsSync(output)).toBe(true);
    const routesFile = join(dir, 'client.routes.ts');
    expect(existsSync(routesFile)).toBe(true);
    const routes = readFileSync(routesFile, 'utf-8');
    expect(routes).toContain('export const routes = {');
    // The plugin walked the same IR the built-ins see (real operations from cafe.yaml).
    expect(routes).toMatch(/: '(GET|POST|PUT|PATCH|DELETE) \//);
  });

  it('resolves a relative --generator path against the cwd, not the --config dir', () => {
    cpSync(plugin, join(dir, 'route-map-plugin.mjs'));
    const result = runCommandResult(
      'node',
      [
        cliEntry,
        'generate-client',
        cafe,
        '--output',
        join(dir, 'client.ts'),
        '--generator',
        'typescript',
        '--generator',
        './route-map-plugin.mjs',
        '--config',
        // A config folder without the plugin: resolving against it would fail.
        join(__dirname, 'config-elsewhere/redocly.yaml'),
      ],
      { testPath: dir }
    );
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(existsSync(join(dir, 'client.routes.ts'))).toBe(true);
  });

  it("validates the generator's declared options from the config block and passes them to run", () => {
    cpSync(plugin, join(dir, 'route-map-plugin.mjs'));
    const config = join(dir, 'redocly.yaml');

    writeFileSync(
      config,
      outdent`
        extends: []
        client:
          generators: [typescript, ./route-map-plugin.mjs]
          options:
            route-map:
              exportName: paths
      `,
      'utf-8'
    );
    const valid = runCommandResult(
      'node',
      [cliEntry, 'generate-client', cafe, '--output', join(dir, 'client.ts'), '--config', config],
      { testPath: dir }
    );
    expect(valid.status, `${valid.stdout}\n${valid.stderr}`).toBe(0);
    expect(readFileSync(join(dir, 'client.routes.ts'), 'utf-8')).toContain(
      'export const paths = {'
    );

    writeFileSync(
      config,
      outdent`
        extends: []
        client:
          generators: [typescript, ./route-map-plugin.mjs]
          options:
            route-map:
              exportname: paths
      `,
      'utf-8'
    );
    const typo = runCommandResult(
      'node',
      [cliEntry, 'generate-client', cafe, '--output', join(dir, 'client.ts'), '--config', config],
      { testPath: dir }
    );
    expect(typo.status).not.toBe(0);
    expect(`${typo.stdout}\n${typo.stderr}`).toMatch(/unknown option "exportname".*exportName/s);
  });

  it('fails fast with an actionable message when a specifier cannot be loaded', () => {
    const result = runCommandResult(
      'node',
      [
        cliEntry,
        'generate-client',
        cafe,
        '--output',
        join(dir, 'client.ts'),
        '--generator',
        'typescript',
        '--generator',
        join(dir, 'missing-plugin.mjs'),
      ],
      { testPath: __dirname }
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/Could not load generator/);
  });
});
