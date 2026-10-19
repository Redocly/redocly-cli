// The CLI rejects a remote `--setup` module before it calls the generator.
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runGenerateClient } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/cafe.yaml');

describe('--setup rejects remote modules', () => {
  test('a URL fails with the local-file-path error instead of a garbage path', () => {
    const result = runGenerateClient([
      fixture,
      '--output',
      join(tmpdir(), 'setup-url-client.ts'),
      '--setup',
      'https://evil.example/mod.ts',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must be a local file path');
  });
});
