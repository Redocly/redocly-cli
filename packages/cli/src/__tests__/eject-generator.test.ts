import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packedAssets } from '../commands/eject-generator.js';

const clientGeneratorDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../client-generator'
);

// `npm pack` on a directory runs that package's prepare script, so give it room.
vi.setConfig({ testTimeout: 180_000 });

describe('packedAssets', () => {
  it('reads the generator and its skills out of a packed @redocly/client-generator', () => {
    // A directory stands in for the version spec `--update` passes: same pack, same
    // extraction, no registry needed to prove the mechanism.
    const members = [
      'package/eject-assets/generators/php.mjs',
      'package/eject-assets/skills/php-generator/SKILL.md',
      'package/eject-assets/skills/not-a-member/SKILL.md',
    ];
    const assets = packedAssets(clientGeneratorDir, members);
    expect(assets.get(members[0])).toBe(
      readFileSync(join(clientGeneratorDir, 'eject-assets/generators/php.mjs'), 'utf-8')
    );
    expect(assets.get(members[1])).toBe(
      readFileSync(join(clientGeneratorDir, 'eject-assets/skills/php-generator/SKILL.md'), 'utf-8')
    );
    // A member the packed version does not ship is absent, so the caller falls back per file.
    expect(assets.has(members[2])).toBe(false);
  });

  it('returns nothing when the spec cannot be packed, so the caller can fall back', () => {
    expect(
      packedAssets('@redocly/client-generator@0.0.0-does-not-exist', [
        'package/eject-assets/generators/php.mjs',
      ]).size
    ).toBe(0);
  });
});
