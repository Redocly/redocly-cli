import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PYTHON_RUNTIME_SOURCES } from '../../emitters/python-runtime-sources.js';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const hasPython = spawnSync('python3', ['--version']).status === 0;

describe('PYTHON_RUNTIME_SOURCES (the embedded Python runtime)', () => {
  it('embeds every runtime module with its load-bearing declarations', () => {
    expect(PYTHON_RUNTIME_SOURCES['_errors.py']).toContain('class ApiError');
    expect(PYTHON_RUNTIME_SOURCES['_errors.py']).toContain('class ApiTimeoutError');
    expect(PYTHON_RUNTIME_SOURCES['_errors.py']).toContain('class Result');
    expect(PYTHON_RUNTIME_SOURCES['_auth.py']).toContain('def resolve_auth');
    expect(PYTHON_RUNTIME_SOURCES['_send.py']).toContain('def send');
    expect(PYTHON_RUNTIME_SOURCES['_send.py']).toContain('Idempotency-Key');
  });

  it.skipIf(!hasPython)('the runtime sources are valid Python (py_compile)', () => {
    for (const name of Object.keys(PYTHON_RUNTIME_SOURCES)) {
      const result = spawnSync(
        'python3',
        ['-m', 'py_compile', join(pkgRoot, 'runtime', 'python', name)],
        {
          encoding: 'utf-8',
        }
      );
      expect(result.status, `${name}: ${result.stderr}`).toBe(0);
    }
  });
});
