import * as Sampler from 'openapi-sampler';

import { DefaultLogger } from '../../../utils/logger/logger';
import { generateTestDataFromJsonSchema } from '../../arazzo-description-generator';

const logger = DefaultLogger.getInstance();

jest.mock('openapi-sampler');

describe('generateTestDataFromJsonSchema', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });
  it('should generate test data from JSON Schema', () => {
    (Sampler as jest.Mocked<typeof Sampler>).sample.mockReturnValue({ name: 'string' });

    expect(
      generateTestDataFromJsonSchema({
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      })
    ).toEqual({
      name: 'string',
    });
  });

  it('should return undefined if schema is not provided', () => {
    expect(generateTestDataFromJsonSchema(undefined)).toBeUndefined();
  });

  it('should return null if schema is not valid', () => {
    (Sampler as jest.Mocked<typeof Sampler>).sample.mockReturnValue(null);
    expect(
      generateTestDataFromJsonSchema({
        type: 'unknown',
        properties: {
          name: {
            type: 'string',
          },
        },
      })
    ).toBeNull();
  });

  it('should log error if schema is not valid', () => {
    const mockLogger = jest.spyOn(logger, 'error').mockImplementation();

    (Sampler as jest.Mocked<typeof Sampler>).sample.mockImplementation(() => {
      throw new Error('Mocked error from openapi-sampler');
    });

    expect(
      generateTestDataFromJsonSchema({
        type: 'unknown',
        properties: {
          name: {
            type: 'string',
          },
        },
      })
    ).toBeUndefined();
    expect(mockLogger).toHaveBeenCalledWith(
      expect.stringContaining('Mocked error from openapi-sampler')
    );

    mockLogger.mockRestore();
  });
});
