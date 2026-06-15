import { NotSupportedError } from '../../errors.js';
import { getGenerator, validateGenerators } from '../index.js';
import { sdkGenerator } from '../sdk.js';
import { zodGenerator } from '../zod.js';

describe('getGenerator', () => {
  it('returns the sdk generator descriptor', () => {
    expect(getGenerator('sdk').run).toBe(sdkGenerator);
  });

  it('returns the zod generator descriptor', () => {
    expect(getGenerator('zod').run).toBe(zodGenerator);
  });

  it('throws NotSupportedError for an unknown generator name', () => {
    expect(() => getGenerator('nope' as never)).toThrow(NotSupportedError);
  });
});

describe('validateGenerators', () => {
  it('accepts sdk alone', () => {
    expect(() => validateGenerators(['sdk'], {})).not.toThrow();
  });

  it('accepts zod alone — it requires nothing', () => {
    expect(() => validateGenerators(['zod'], {})).not.toThrow();
  });

  it('accepts sdk + tanstack-query with the default facade/error-mode', () => {
    expect(() => validateGenerators(['sdk', 'tanstack-query'], {})).not.toThrow();
  });

  it('rejects tanstack-query without sdk, naming the fix', () => {
    expect(() => validateGenerators(['tanstack-query'], {})).toThrow(
      /requires the "sdk" generator.*--generators sdk,tanstack-query/
    );
  });

  it('rejects transformers without sdk', () => {
    expect(() => validateGenerators(['transformers'], {})).toThrow(/requires the "sdk" generator/);
  });

  it('rejects transformers without --date-type Date (would assign Date to string fields)', () => {
    expect(() => validateGenerators(['sdk', 'transformers'], {})).toThrow(
      /requires --date-type Date .*got "string"/
    );
  });

  it('accepts sdk + transformers with --date-type Date', () => {
    expect(() => validateGenerators(['sdk', 'transformers'], { dateType: 'Date' })).not.toThrow();
  });

  it('rejects tanstack-query with the service-class facade', () => {
    expect(() =>
      validateGenerators(['sdk', 'tanstack-query'], { facade: 'service-class' })
    ).toThrow(/does not support --facade "service-class".*functions/);
  });

  it('rejects tanstack-query with result error mode', () => {
    expect(() => validateGenerators(['sdk', 'tanstack-query'], { errorMode: 'result' })).toThrow(
      /does not support --error-mode "result".*throw/
    );
  });

  it('allows the service-class facade for sdk (unconstrained)', () => {
    expect(() => validateGenerators(['sdk'], { facade: 'service-class' })).not.toThrow();
  });

  it('throws NotSupportedError for an unknown generator name', () => {
    expect(() => validateGenerators(['nope' as never], {})).toThrow(NotSupportedError);
  });
});

describe('swr generator', () => {
  it('is registered and requires sdk', () => {
    const descriptor = getGenerator('swr');
    expect(descriptor.run).toBeDefined();
    expect(descriptor.requires).toContain('sdk');
  });

  it('rejects swr without sdk, naming the fix', () => {
    expect(() => validateGenerators(['swr'], {})).toThrow(
      /requires the "sdk" generator.*--generators sdk,swr/
    );
  });

  it('accepts sdk + swr with the default facade/error-mode', () => {
    expect(() => validateGenerators(['sdk', 'swr'], {})).not.toThrow();
  });

  it('rejects swr with the service-class facade', () => {
    expect(() => validateGenerators(['sdk', 'swr'], { facade: 'service-class' })).toThrow(
      /does not support --facade "service-class".*functions/
    );
  });

  it('rejects swr with result error mode', () => {
    expect(() => validateGenerators(['sdk', 'swr'], { errorMode: 'result' })).toThrow(
      /does not support --error-mode "result".*throw/
    );
  });
});

describe('mock generator', () => {
  it('is registered and requires sdk', () => {
    const descriptor = getGenerator('mock');
    expect(descriptor.requires).toContain('sdk');
  });

  it('validateGenerators rejects mock without sdk', () => {
    expect(() => validateGenerators(['mock'], {})).toThrow(/requires the "sdk" generator/);
  });

  it('validateGenerators accepts sdk + mock', () => {
    expect(() => validateGenerators(['sdk', 'mock'], {})).not.toThrow();
  });
});
