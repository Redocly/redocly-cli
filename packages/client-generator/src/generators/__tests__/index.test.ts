import { logger } from '@redocly/openapi-core';

import { NotSupportedError } from '../../errors.js';
import { builtinGenerators, validateGenerators } from '../index.js';
import { typescriptGenerator } from '../typescript/index.js';
import { zodGenerator } from '../zod/index.js';

describe('builtinGenerators', () => {
  it('registers the sdk generator descriptor', () => {
    expect(builtinGenerators().get('typescript')?.run).toBe(typescriptGenerator);
  });

  it('registers the zod generator descriptor', () => {
    expect(builtinGenerators().get('zod')?.run).toBe(zodGenerator);
  });

  it('has no entry for an unknown generator name', () => {
    expect(builtinGenerators().has('nope')).toBe(false);
  });
});

describe('validateGenerators', () => {
  it('accepts sdk alone', () => {
    expect(() => validateGenerators(['typescript'], {})).not.toThrow();
  });

  it('accepts zod alone — it requires nothing', () => {
    expect(() => validateGenerators(['zod'], {})).not.toThrow();
  });

  it('accepts sdk + tanstack-query with the default error-mode', () => {
    expect(() => validateGenerators(['typescript', 'tanstack-query'], {})).not.toThrow();
  });

  it.each(['tanstack-query', 'transformers', 'swr', 'mock'] as const)(
    'rejects %s without typescript, naming the fix',
    (generator) => {
      expect(() => validateGenerators([generator], {})).toThrow(
        new RegExp(
          `requires the "typescript" generator.*--generator typescript --generator ${generator}`
        )
      );
    }
  );

  it('rejects transformers without --date-type Date (would assign Date to string fields)', () => {
    expect(() => validateGenerators(['typescript', 'transformers'], {})).toThrow(
      /requires --date-type Date .*got "string"/
    );
  });

  it('accepts sdk + transformers with --date-type Date', () => {
    expect(() =>
      validateGenerators(['typescript', 'transformers'], { dateType: 'Date' })
    ).not.toThrow();
  });

  it.each(['tanstack-query', 'swr'] as const)('rejects %s with result error mode', (generator) => {
    expect(() => validateGenerators(['typescript', generator], { errorMode: 'result' })).toThrow(
      /does not support --error-mode "result".*throw/
    );
  });

  it('rejects --error-mode result for the go and php SDKs (their idiom IS the error mode)', () => {
    for (const language of ['go', 'php']) {
      expect(() => validateGenerators([language], { errorMode: 'result' })).toThrow(
        /does not support --error-mode "result"/
      );
      // Throw mode — what they actually emit — stays valid.
      expect(() => validateGenerators([language], { errorMode: 'throw' })).not.toThrow();
    }
    // python implements both modes.
    expect(() => validateGenerators(['python'], { errorMode: 'result' })).not.toThrow();
  });

  it('warns (never silently drops) when a language SDK ignores an option the user set', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      // `outputMode` travels beside `emit`, hence the trailing argument.
      validateGenerators(['php'], { runtime: 'inline', argsStyle: 'grouped' }, undefined, 'split');
      const messages = warn.mock.calls.map(([message]) => message).join('');
      expect(messages).toContain('the "php" generator ignores outputMode');
      expect(messages).toContain('the "php" generator ignores argsStyle');
      // `runtime` applies to every runtime-embedding generator since module mode landed.
      expect(messages).not.toContain('ignores runtime');

      // Defaults must stay quiet: only an EXPLICIT option warns.
      warn.mockClear();
      validateGenerators(['php'], {});
      expect(warn).not.toHaveBeenCalled();

      // The TypeScript sdk applies all of them — no warning.
      warn.mockClear();
      validateGenerators(
        ['typescript'],
        { runtime: 'inline', argsStyle: 'grouped' },
        undefined,
        'split'
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('warns when a single-generator option is set without its generator', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      validateGenerators(['python'], { goPackage: 'mypkg' });
      const messages = warn.mock.calls.map(([message]) => message).join('');
      expect(messages).toContain('goPackage is ignored');

      // The generator that reads it is selected, so nothing to say — even alongside
      // generators that don't read it.
      warn.mockClear();
      validateGenerators(['typescript', 'go'], { goPackage: 'mypkg' });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('throws NotSupportedError for an unknown generator name', () => {
    expect(() => validateGenerators(['nope' as never], {})).toThrow(NotSupportedError);
  });
});

describe('swr generator', () => {
  it('is registered and requires typescript', () => {
    const descriptor = builtinGenerators().get('swr');
    expect(descriptor?.run).toBeDefined();
    expect(descriptor?.requires).toContain('typescript');
  });

  it('accepts sdk + swr with the default error-mode', () => {
    expect(() => validateGenerators(['typescript', 'swr'], {})).not.toThrow();
  });
});

describe('mock generator', () => {
  it('is registered and requires typescript', () => {
    expect(builtinGenerators().get('mock')?.requires).toContain('typescript');
  });

  it('validateGenerators accepts sdk + mock', () => {
    expect(() => validateGenerators(['typescript', 'mock'], {})).not.toThrow();
  });
});
