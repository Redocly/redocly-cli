import type { RecheckConfig } from '../types/rules.js';

describe('RecheckConfig', () => {
  it('accepts a rule entry object', () => {
    assertType<RecheckConfig>({ 'recheck/line-length': {} });
  });

  it('accepts rule options in assertions', () => {
    assertType<RecheckConfig>({
      'recheck/line-length': {
        severity: 'error',
        message: 'Line length',
        assertions: {
          'line-length': { lineLength: 120 },
        },
      },
      'recheck/no-duplicate-heading': {
        severity: 'error',
        message: 'Multiple headings with the same content',
        assertions: {
          'no-duplicate-heading': { siblingsOnly: true },
        },
      },
    });
  });

  it('rejects a severity string as a rule entry', () => {
    assertType<RecheckConfig>({
      // @ts-expect-error -- a rule entry must be an object, not a severity string
      'recheck/line-length': 'error',
    });
  });

  it('rejects a misspelled engine key', () => {
    assertType<RecheckConfig>({
      // @ts-expect-error -- 'extend' is not an engine key and has no '/', so it is not a rule name
      extend: ['recheck/markdown'],
    });
  });

  it('rejects a rule name without a namespace', () => {
    assertType<RecheckConfig>({
      // @ts-expect-error -- rule names contain a '/' (namespace/rule)
      'line-length': {},
    });
  });
});
