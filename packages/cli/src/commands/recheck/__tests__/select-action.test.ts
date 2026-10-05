import { describe, expect, it } from 'vitest';

import { selectAction } from '../select-action.js';
import type { RecheckArgv } from '../types.js';

const base: RecheckArgv = { format: 'table' };

describe('selectAction', () => {
  it('defaults to lint', () => {
    expect(selectAction(base)).toEqual({ action: 'lint' });
  });

  it('picks one action flag', () => {
    expect(selectAction({ ...base, readability: true })).toEqual({ action: 'readability' });
    expect(selectAction({ ...base, 'generate-baseline': true })).toEqual({ action: 'baseline' });
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

  it('requires --from and --output for the markdoc schema action', () => {
    expect(selectAction({ ...base, 'generate-markdoc-schema': true })).toEqual({
      error: '--generate-markdoc-schema requires --from and --output.',
    });
    expect(
      selectAction({
        ...base,
        'generate-markdoc-schema': true,
        from: ['./theme.ts'],
        output: 'schema.json',
      })
    ).toEqual({ action: 'markdoc-schema' });
  });
});
