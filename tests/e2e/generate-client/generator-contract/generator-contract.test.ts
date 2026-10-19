// The CLI side of the generator compatibility contract: `--help` names every built-in
// generator, and an incompatible `--generator` selection fails with an actionable message.

import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { repoRoot, runGenerateClient } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cafe = join(__dirname, '../fixtures/cafe.yaml');

// Every built-in must be discoverable from `--help`: an inline list that goes stale is
// what made four separate reports say the languages "aren't supported".
describe('generate-client --help', () => {
  it('names every built-in generator', async () => {
    // The metadata table is the registry the pipeline resolves against — the one list
    // `--help` must not fall behind.
    const { BUILTIN_META } = await import(
      pathToFileURL(join(repoRoot, 'packages/client-generator/lib/generators/meta.js')).href
    );
    const result = runGenerateClient(['--help']);
    // yargs wraps help text mid-token (`tanstack-query-v\nue`), so compare with the
    // whitespace removed — a generator name never contains any.
    const help = `${result.stdout}\n${result.stderr}`.replace(/\s+/g, '');
    for (const name of Object.keys(BUILTIN_META as Record<string, unknown>)) {
      expect(help, `--help does not mention the "${name}" generator`).toContain(name);
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
