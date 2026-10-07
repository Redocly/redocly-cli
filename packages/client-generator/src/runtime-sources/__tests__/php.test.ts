import { PHP_RUNTIME_SOURCE } from '../php.js';

describe('PHP_RUNTIME_SOURCE (the embedded PHP runtime)', () => {
  // PHP binds functions when they are called, and no e2e bar calls the pagination, SSE,
  // or multipart helpers yet, so a missing declaration would otherwise ship unnoticed.
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
});
