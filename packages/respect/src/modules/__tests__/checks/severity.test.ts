import { resolveSeverityConfiguration, DEFAULT_SEVERITY_CONFIGURATION } from '../../checks';

describe('resolveSeverityConfiguration', () => {
  it('should return the default severity configuration if no severity argument is provided', () => {
    const result = resolveSeverityConfiguration(undefined);
    expect(result).toEqual(DEFAULT_SEVERITY_CONFIGURATION);
  });

  it('should return the severity configuration if a severity argument stringified object is provided', () => {
    const result = resolveSeverityConfiguration('{"STATUS_CODE_CHECK":"off","SCHEMA_CHECK":"off"}');
    expect(result).toEqual({
      ...DEFAULT_SEVERITY_CONFIGURATION,
      STATUS_CODE_CHECK: 'off',
      SCHEMA_CHECK: 'off',
    });
  });

  it('should return the severity configuration if a severity argument list is provided', () => {
    const result = resolveSeverityConfiguration(['STATUS_CODE_CHECK=off', 'SCHEMA_CHECK=off']);
    expect(result).toEqual({
      ...DEFAULT_SEVERITY_CONFIGURATION,
      STATUS_CODE_CHECK: 'off',
      SCHEMA_CHECK: 'off',
    });
  });

  it('should return the severity configuration if a severity argument string is provided', () => {
    const result = resolveSeverityConfiguration('STATUS_CODE_CHECK=off,SCHEMA_CHECK=off');
    expect(result).toEqual({
      ...DEFAULT_SEVERITY_CONFIGURATION,
      STATUS_CODE_CHECK: 'off',
      SCHEMA_CHECK: 'off',
    });
  });

  it('should throw an error if the severity configuration is not valid', () => {
    expect(() => resolveSeverityConfiguration('invalid')).toThrow(
      'Failed to parse severity configuration',
    );
  });
});
