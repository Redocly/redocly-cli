// The hand-written language runtimes are embedded as strings at prepare time
// (scripts/generate-runtime-sources.mjs). Editing a runtime file WITHOUT re-running
// prepare ships a stale runtime: the generator's own unit bars still pass (they assert
// on generated declarations, not runtime behavior), so the mismatch only surfaces at
// the compile bar — or in a user's client. This pins snapshot == source.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GO_RUNTIME_SOURCE } from '../../emitters/go-runtime-sources.js';
import { PHP_RUNTIME_SOURCE } from '../../emitters/php-runtime-sources.js';
import { PYTHON_RUNTIME_SOURCES } from '../../emitters/python-runtime-sources.js';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const STALE = 'stale embed — run `npm run prepare -w @redocly/client-generator`';

describe('embedded runtimes match their source files', () => {
  it('go', () => {
    const source = readFileSync(join(pkgRoot, 'go-runtime/runtime.go'), 'utf-8');
    expect(GO_RUNTIME_SOURCE, STALE).toBe(source);
  });

  it('php', () => {
    const source = readFileSync(join(pkgRoot, 'php-runtime/runtime.php'), 'utf-8');
    expect(PHP_RUNTIME_SOURCE, STALE).toBe(source);
  });

  it('python — every module, and no module missing from the snapshot', () => {
    const dir = join(pkgRoot, 'python-runtime');
    const onDisk = readdirSync(dir).filter((name) => name.endsWith('.py'));
    expect(Object.keys(PYTHON_RUNTIME_SOURCES).sort(), STALE).toEqual(onDisk.sort());
    for (const name of onDisk) {
      expect(PYTHON_RUNTIME_SOURCES[name], `${name}: ${STALE}`).toBe(
        readFileSync(join(dir, name), 'utf-8')
      );
    }
  });
});
