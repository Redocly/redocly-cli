import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PHP_RUNTIME_SOURCE } from '../../runtime-sources/php.js';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const hasPhp = spawnSync('php', ['--version']).status === 0;

describe('PHP_RUNTIME_SOURCE (the embedded PHP runtime)', () => {
  it('embeds the load-bearing declarations', () => {
    for (const declaration of [
      'final class ApiError extends \\RuntimeException',
      'final class TimeoutError extends \\RuntimeException',
      'function resolveAuth(',
      'function buildUrl(',
      'function send(Config $config',
      'function iterPages(',
      'function iterSse(',
      'function toMultipart(',
      'Idempotency-Key',
      'retry-after',
    ]) {
      expect(PHP_RUNTIME_SOURCE).toContain(declaration);
    }
  });

  it.skipIf(!hasPhp)('the runtime module passes php -l', () => {
    const result = spawnSync('php', ['-l', 'runtime.php'], {
      cwd: join(pkgRoot, 'src', 'generators', 'php', 'runtime'),
      encoding: 'utf-8',
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  });
});
