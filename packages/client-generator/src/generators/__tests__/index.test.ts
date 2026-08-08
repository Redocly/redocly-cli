import { logger } from '@redocly/openapi-core';

import { NotSupportedError } from '../../errors.js';
import { builtinGenerators, validateGenerators } from '../index.js';
import { sdkGenerator } from '../sdk/index.js';
import { zodGenerator } from '../zod/index.js';

describe('builtinGenerators', () => {
  it('registers the sdk generator descriptor', () => {
    expect(builtinGenerators().get('sdk')?.run).toBe(sdkGenerator);
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
    expect(() => validateGenerators(['sdk'], {})).not.toThrow();
  });

  it('accepts zod alone — it requires nothing', () => {
    expect(() => validateGenerators(['zod'], {})).not.toThrow();
  });

  it('accepts sdk + tanstack-query with the default error-mode', () => {
    expect(() => validateGenerators(['sdk', 'tanstack-query'], {})).not.toThrow();
  });

  it.each(['tanstack-query', 'transformers', 'swr', 'mock'] as const)(
    'rejects %s without sdk, naming the fix',
    (generator) => {
      expect(() => validateGenerators([generator], {})).toThrow(
        new RegExp(`requires the "sdk" generator.*--generator sdk --generator ${generator}`)
      );
    }
  );

  it('rejects transformers without --date-type Date (would assign Date to string fields)', () => {
    expect(() => validateGenerators(['sdk', 'transformers'], {})).toThrow(
      /requires --date-type Date .*got "string"/
    );
  });

  it('accepts sdk + transformers with --date-type Date', () => {
    expect(() => validateGenerators(['sdk', 'transformers'], { dateType: 'Date' })).not.toThrow();
  });

  it.each(['tanstack-query', 'swr'] as const)('rejects %s with result error mode', (generator) => {
    expect(() => validateGenerators(['sdk', generator], { errorMode: 'result' })).toThrow(
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
      validateGenerators(['php'], { runtime: 'package', argsStyle: 'grouped' }, undefined, 'split');
      const messages = warn.mock.calls.map(([message]) => message).join('');
      expect(messages).toContain('the "php" generator ignores outputMode');
      expect(messages).toContain('the "php" generator ignores runtime');
      expect(messages).toContain('the "php" generator ignores argsStyle');

      // Defaults must stay quiet: only an EXPLICIT option warns.
      warn.mockClear();
      validateGenerators(['php'], {});
      expect(warn).not.toHaveBeenCalled();

      // The TypeScript sdk applies all of them — no warning.
      warn.mockClear();
      validateGenerators(['sdk'], { runtime: 'package', argsStyle: 'grouped' }, undefined, 'split');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('warns when a single-generator option is set without its generator', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      validateGenerators(['python'], { goPackage: 'mypkg' });
      validateGenerators(['go'], { binName: 'cafe-api' });
      const messages = warn.mock.calls.map(([message]) => message).join('');
      expect(messages).toContain('goPackage is ignored');
      expect(messages).toContain('binName is ignored');

      // The generator that reads it is selected, so nothing to say — even alongside
      // generators that don't read it.
      warn.mockClear();
      validateGenerators(['sdk', 'zod', 'cli'], { binName: 'cafe-api' });
      validateGenerators(['go'], { goPackage: 'mypkg' });
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
  it('is registered and requires sdk', () => {
    const descriptor = builtinGenerators().get('swr');
    expect(descriptor?.run).toBeDefined();
    expect(descriptor?.requires).toContain('sdk');
  });

  it('accepts sdk + swr with the default error-mode', () => {
    expect(() => validateGenerators(['sdk', 'swr'], {})).not.toThrow();
  });
});

describe('validateGenerators — runtime compatibility', () => {
  /** A registry with one runtimes-restricted generator (no built-in restricts runtimes anymore). */
  function registryWith(runtimes: ('inline' | 'package')[]) {
    const registry = builtinGenerators();
    registry.set('inline-only', { run: () => [], runtimes });
    return registry;
  }

  it('rejects a runtimes-restricted generator with runtime: package, naming both', () => {
    expect(() =>
      validateGenerators(['inline-only'], { runtime: 'package' }, registryWith(['inline']))
    ).toThrow(/"inline-only".*runtime "package".*inline/);
  });

  it('accepts a runtimes-restricted generator when the runtime matches (or is defaulted)', () => {
    expect(() =>
      validateGenerators(['inline-only'], { runtime: 'inline' }, registryWith(['inline']))
    ).not.toThrow();
    expect(() => validateGenerators(['inline-only'], {}, registryWith(['inline']))).not.toThrow();
  });

  it('accepts the wrapper generators with runtime: package (no longer restricted)', () => {
    expect(() =>
      validateGenerators(
        ['sdk', 'tanstack-query', 'swr'],
        { runtime: 'package' },
        builtinGenerators()
      )
    ).not.toThrow();
  });
});

describe('mock generator', () => {
  it('is registered and requires sdk', () => {
    expect(builtinGenerators().get('mock')?.requires).toContain('sdk');
  });

  it('validateGenerators accepts sdk + mock', () => {
    expect(() => validateGenerators(['sdk', 'mock'], {})).not.toThrow();
  });
});
