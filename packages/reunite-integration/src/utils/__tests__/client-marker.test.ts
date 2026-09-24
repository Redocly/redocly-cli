import { getClientMarker } from '../client-marker.js';

describe('getClientMarker()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return undefined when REDOCLY_CLIENT is not set', () => {
    vi.stubEnv('REDOCLY_CLIENT', undefined);

    expect(getClientMarker()).toBeUndefined();
  });

  it('should return the trimmed marker', () => {
    vi.stubEnv('REDOCLY_CLIENT', '  redocly-reunite-push-action/v1.4.0 ');

    expect(getClientMarker()).toBe('redocly-reunite-push-action/v1.4.0');
  });

  it('should keep several space-separated product tokens', () => {
    vi.stubEnv('REDOCLY_CLIENT', 'azure-devops-task/1.0 custom/2');

    expect(getClientMarker()).toBe('azure-devops-task/1.0 custom/2');
  });

  it.each(['', '   ', 'bad\nmarker', 'bad\tmarker', 'two  spaces', 'non-ascii/ü'])(
    'should ignore the invalid marker %j',
    (marker) => {
      vi.stubEnv('REDOCLY_CLIENT', marker);

      expect(getClientMarker()).toBeUndefined();
    }
  );
});
