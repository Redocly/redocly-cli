import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RUNTIME_SOURCES } from '../runtime-sources.js';

const runtimeDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'runtime');

describe('runtime-sources', () => {
  it('the generated snapshot matches src/runtime (every module except the barrel)', () => {
    const expected = Object.fromEntries(
      readdirSync(runtimeDir)
        .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
        .map((name) => [name, readFileSync(join(runtimeDir, name), 'utf-8')])
    );
    expect(
      { ...RUNTIME_SOURCES },
      'emitters/runtime-sources.ts is stale — run `npm run prepare -w @redocly/client-generator`'
    ).toEqual(expected);
  });
});
