import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GO_RUNTIME_SOURCE } from '../../emitters/go-runtime-sources.js';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const hasGo = spawnSync('go', ['version']).status === 0;

describe('GO_RUNTIME_SOURCE (the embedded Go runtime)', () => {
  it('embeds the load-bearing declarations', () => {
    for (const declaration of [
      'type APIError struct',
      'type TimeoutError struct',
      'func resolveAuth(',
      'func buildURL(',
      'func send(ctx context.Context',
      'Idempotency-Key',
      'Retry-After',
    ]) {
      expect(GO_RUNTIME_SOURCE).toContain(declaration);
    }
  });

  it.skipIf(!hasGo)('the runtime module passes go vet', () => {
    const result = spawnSync('go', ['vet', './...'], {
      cwd: join(pkgRoot, 'go-runtime'),
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
  });
});
