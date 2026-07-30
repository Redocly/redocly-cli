import { vi } from 'vitest';

describe('typescript compiler API guard', () => {
  it('fails with instructions when the installed typescript lacks the compiler API (TS 7+)', async () => {
    // typescript@7 (the native compiler) ships only the tsc binary: `import ts` resolves,
    // but every compiler-API member is undefined. Without the guard the module dies on
    // its first `ts.*` call with a bare TypeError.
    vi.resetModules();
    vi.doMock('typescript', () => ({ default: { version: '7.0.2' } }));
    await expect(import('../ts.js')).rejects.toThrow(
      /TypeScript 7.*ships only.*tsc.*typescript@6/s
    );
    vi.doUnmock('typescript');
    vi.resetModules();
  });
});
