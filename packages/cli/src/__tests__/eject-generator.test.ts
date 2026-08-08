import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packedAsset } from '../commands/eject-generator.js';

const clientGeneratorDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../client-generator'
);

// `npm pack` on a directory runs that package's prepare script, so give it room.
vi.setConfig({ testTimeout: 180_000 });

describe('packedAsset', () => {
  it('reads a generator out of a packed @redocly/client-generator', () => {
    // A directory stands in for the version spec `--update` passes: same pack, same
    // extraction, no registry needed to prove the mechanism.
    const asset = packedAsset(clientGeneratorDir, 'php');
    expect(asset).toBe(
      readFileSync(join(clientGeneratorDir, 'eject-assets/generators/php.mjs'), 'utf-8')
    );
  });

  it('returns undefined when the spec cannot be packed, so the caller can fall back', () => {
    expect(packedAsset('@redocly/client-generator@0.0.0-does-not-exist', 'php')).toBeUndefined();
  });
});
