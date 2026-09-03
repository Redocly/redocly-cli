import { describe, expect, it } from 'vitest';

import { selectAction, type RecheckArgv } from '../args.js';

const base: RecheckArgv = { format: 'table' };

describe('selectAction', () => {
  it('defaults to lint', () => {
    expect(selectAction(base)).toEqual({ action: 'lint' });
  });

  it('picks one action flag', () => {
    expect(selectAction({ ...base, readability: true })).toEqual({ action: 'readability' });
    expect(selectAction({ ...base, 'generate-baseline': true })).toEqual({ action: 'baseline' });
    expect(
      selectAction({
        ...base,
        'generate-markdoc-schema': true,
        from: ['./theme.ts'],
        out: 'schema.json',
      })
    ).toEqual({
      action: 'markdoc-schema',
    });
  });

  it('rejects two action flags', () => {
    const result = selectAction({ ...base, readability: true, 'generate-baseline': true });
    expect(result).toEqual({
      error: 'Use one of --readability, --generate-baseline, or --generate-markdoc-schema.',
    });
  });

  it('rejects --fix outside lint', () => {
    expect(selectAction({ ...base, readability: true, fix: true })).toEqual({
      error: '--fix applies to linting only.',
    });
  });

  it('rejects unsupported readability formats', () => {
    expect(selectAction({ ...base, readability: true, format: 'sarif' })).toEqual({
      error: '--readability supports --format table or json.',
    });
  });

  it('requires --from and --out for the markdoc schema action', () => {
    expect(selectAction({ ...base, 'generate-markdoc-schema': true })).toEqual({
      error: '--generate-markdoc-schema requires --from and --out.',
    });
    expect(
      selectAction({
        ...base,
        'generate-markdoc-schema': true,
        from: ['./theme.ts'],
        out: 'schema.json',
      })
    ).toEqual({ action: 'markdoc-schema' });
  });
});
