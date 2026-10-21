import { existsSync, readdirSync } from 'node:fs';
// The CLI side of the generator compatibility contract: `--help` names every built-in
// generator, and an incompatible `--generator` selection fails with an actionable message.
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommandResult } from '../../helpers.js';
import { cliEntry, repoRoot } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const cafe = join(repoRoot, 'resources/cafe.yaml');

// Every built-in must be discoverable from `--help`: an inline list that goes stale is
// what made four separate reports say the languages "aren't supported".
describe('generate-client --help', () => {
  it('names every built-in generator', () => {
    // Each built-in generator is a folder with an `index.ts` entry.
    const generatorsDir = join(repoRoot, 'packages/client-generator/src/generators');
    const generatorNames = readdirSync(generatorsDir, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && existsSync(join(generatorsDir, entry.name, 'index.ts'))
      )
      .map((entry) => entry.name);
    expect(generatorNames).toContain('typescript');

    const result = runCommandResult('node', [cliEntry, 'generate-client', '--help'], {
      testPath: __dirname,
    });
    // yargs wraps help text mid-token (`tanstack-query-v\nue`), so read it with the
    // whitespace removed — a generator name never contains any.
    const help = `${result.stdout}\n${result.stderr}`.replace(/\s+/g, '');
    // The `--generator` description lists the names as `Built-in: typescript, zod, ... — or ...`.
    const listStart = help.indexOf('Built-in:') + 'Built-in:'.length;
    const listEnd = help.indexOf('—or', listStart);
    const listedNames = help.slice(listStart, listEnd).split(',');
    expect(listedNames).toEqual(expect.arrayContaining(generatorNames));
  });
});

describe('generate-client generator compatibility contract', () => {
  it('fails with exit code 1 when the generator rejects the selection', () => {
    const result = runCommandResult(
      'node',
      [
        cliEntry,
        'generate-client',
        cafe,
        '--output',
        join(tmpdir(), 'generator-contract-client.ts'),
        '--generator',
        'typescript',
        '--generator',
        'tanstack-query',
        '--error-mode',
        'result',
      ],
      { testPath: __dirname }
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Failed to generate client');
    expect(result.stderr).toMatch(/does not support --error-mode "result"/);
  });
});
