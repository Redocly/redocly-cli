// The other tests call `generateClient` directly, so this file proves the CLI layer:
// `redocly generate-client` with a flag writes the same files as the API with the
// matching option. If the CLI drops or renames a flag, the two outputs differ.
import { generateClient, type GenerateClientConfig } from '@redocly/client-generator';
import { logger } from '@redocly/openapi-core';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runGenerateClient } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');

// Each case uses a value that is not the default, so a lost flag changes the output.
const cases: Array<{ flags: string[]; options: GenerateClientConfig }> = [
  {
    flags: ['--server-url', 'https://flags.example.com'],
    options: { serverUrl: 'https://flags.example.com' },
  },
  { flags: ['--output-mode', 'split'], options: { outputMode: 'split' } },
  { flags: ['--runtime', 'module'], options: { runtime: 'module' } },
  { flags: ['--import-ext', 'ts'], options: { importExt: 'ts' } },
  { flags: ['--args-style', 'grouped'], options: { argsStyle: 'grouped' } },
  { flags: ['--error-mode', 'result'], options: { errorMode: 'result' } },
  {
    flags: ['--generator', 'go', '--go-package', 'cafe'],
    options: { generators: ['go'], goPackage: 'cafe' },
  },
  {
    flags: ['--generator', 'typescript', '--generator', 'transformers', '--date-type', 'Date'],
    options: { generators: ['typescript', 'transformers'], dateType: 'Date' },
  },
  {
    flags: [
      '--generator',
      'typescript',
      '--generator',
      'mock',
      '--mock-data',
      'faker',
      '--mock-seed',
      '42',
    ],
    options: { generators: ['typescript', 'mock'], mockData: 'faker', mockSeed: 42 },
  },
  {
    flags: ['--generator', 'typescript', '--generator', 'cli', '--docs'],
    options: { generators: ['typescript', 'cli'], docs: true },
  },
];

/** Read every file in `dir`, keyed by its path relative to `dir`. */
function readFiles(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(dir, { recursive: true, encoding: 'utf-8' })) {
    const path = join(dir, name);
    if (statSync(path).isFile()) {
      files[name] = readFileSync(path, 'utf-8');
    }
  }
  return files;
}

describe('generate-client CLI flags', () => {
  // `generateClient` runs in this process and reports the renamed `Error` schema of
  // cafe.yaml through `logger.warn`. The CLI run reports the same note in its own stderr.
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  it.each(cases)(
    '$flags writes the same files as the matching option',
    async ({ flags, options }) => {
      const cliDir = mkdtempSync(join(tmpdir(), 'cli-flags-cli-'));
      const apiDir = mkdtempSync(join(tmpdir(), 'cli-flags-api-'));
      try {
        const result = runGenerateClient([
          fixture,
          '--output',
          join(cliDir, 'client.ts'),
          ...flags,
        ]);
        expect(result.status, result.stderr).toBe(0);
        await generateClient({ api: fixture, output: join(apiDir, 'client.ts'), ...options });
        expect(readFiles(cliDir)).toEqual(readFiles(apiDir));
      } finally {
        rmSync(cliDir, { recursive: true, force: true });
        rmSync(apiDir, { recursive: true, force: true });
      }
    },
    60_000
  );
});
