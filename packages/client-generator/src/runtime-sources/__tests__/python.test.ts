import { PYTHON_RUNTIME_SOURCES } from '../python.js';

describe('PYTHON_RUNTIME_SOURCES (the embedded Python runtime)', () => {
  it('embeds every runtime module with its load-bearing declarations', () => {
    expect(PYTHON_RUNTIME_SOURCES['_errors.py']).toContain('class ApiError');
    expect(PYTHON_RUNTIME_SOURCES['_errors.py']).toContain('class ApiTimeoutError');
    expect(PYTHON_RUNTIME_SOURCES['_errors.py']).toContain('class Result');
    expect(PYTHON_RUNTIME_SOURCES['_auth.py']).toContain('def resolve_auth');
    expect(PYTHON_RUNTIME_SOURCES['_send.py']).toContain('def send');
    expect(PYTHON_RUNTIME_SOURCES['_send.py']).toContain('Idempotency-Key');
  });
});
