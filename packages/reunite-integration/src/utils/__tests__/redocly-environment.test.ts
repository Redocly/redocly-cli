import { getRedoclyEnvironment } from '../redocly-environment.js';

describe('getRedoclyEnvironment()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return undefined when REDOCLY_ENVIRONMENT is not set', () => {
    vi.stubEnv('REDOCLY_ENVIRONMENT', undefined);

    expect(getRedoclyEnvironment()).toBeUndefined();
  });

  it('should return the trimmed value', () => {
    vi.stubEnv('REDOCLY_ENVIRONMENT', '  redocly-reunite-push-action/v1.4.0 ');

    expect(getRedoclyEnvironment()).toBe('redocly-reunite-push-action/v1.4.0');
  });

  it('should keep a plain environment name', () => {
    vi.stubEnv('REDOCLY_ENVIRONMENT', 'reunite');

    expect(getRedoclyEnvironment()).toBe('reunite');
  });

  it('should keep several space-separated product tokens', () => {
    vi.stubEnv('REDOCLY_ENVIRONMENT', 'azure-devops-task/1.0 custom/2');

    expect(getRedoclyEnvironment()).toBe('azure-devops-task/1.0 custom/2');
  });

  it.each(['', '   ', 'bad\nmarker', 'bad\tmarker', 'two  spaces', 'non-ascii/ü'])(
    'should ignore the invalid value %j',
    (marker) => {
      vi.stubEnv('REDOCLY_ENVIRONMENT', marker);

      expect(getRedoclyEnvironment()).toBeUndefined();
    }
  );
});
