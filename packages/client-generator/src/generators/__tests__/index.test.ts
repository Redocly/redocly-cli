import { NotSupportedError } from '../../errors.js';
import { builtinGenerators, validateGenerators } from '../index.js';
import { sdkGenerator } from '../sdk.js';
import { zodGenerator } from '../zod.js';

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
