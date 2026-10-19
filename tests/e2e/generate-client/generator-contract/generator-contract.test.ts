// The CLI side of the generator compatibility contract: `--help` names every built-in
// generator, and an incompatible `--generator` selection fails with an actionable message.

import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { repoRoot, runGenerateClient } from '../helpers.js';

const cafe = join(repoRoot, 'resources/cafe.yaml');

// Every built-in must be discoverable from `--help`: an inline list that goes stale is
// what made four separate reports say the languages "aren't supported".
describe('generate-client --help', () => {
  it('names every built-in generator', () => {
    // Each built-in generator is a folder with an `index.ts` entry.
    const generatorsDir = join(repoRoot, 'packages/client-generator/src/generators');
    const generatorNames: string[] = [];
    for (const entry of readdirSync(generatorsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && existsSync(join(generatorsDir, entry.name, 'index.ts'))) {
        generatorNames.push(entry.name);
      }
    }
    expect(generatorNames).toContain('typescript');

    const result = runGenerateClient(['--help']);
    // yargs wraps help text mid-token (`tanstack-query-v\nue`), so read it with the
    // whitespace removed — a generator name never contains any.
    const help = `${result.stdout}\n${result.stderr}`.replace(/\s+/g, '');
    // The `--generator` description lists the names as `Built-in: typescript, zod, ... — or ...`.
    const listStart = help.indexOf('Built-in:') + 'Built-in:'.length;
    const listEnd = help.indexOf('—or', listStart);
    const listedNames = help.slice(listStart, listEnd).split(',');
    for (const name of generatorNames) {
      expect(listedNames, `--help does not list the "${name}" generator`).toContain(name);
    }
  });
});

describe('generate-client generator compatibility contract', () => {
  it('fails with exit code 1 when the generator rejects the selection', () => {
    const result = runGenerateClient([
      cafe,
      '--output',
      join(tmpdir(), 'generator-contract-client.ts'),
      '--generator',
      'typescript',
      '--generator',
      'tanstack-query',
      '--error-mode',
      'result',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Failed to generate client');
    expect(result.stderr).toMatch(/does not support --error-mode "result"/);
  });
});
