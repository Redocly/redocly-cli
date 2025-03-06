import * as Sampler from 'openapi-sampler';

import { DefaultLogger } from '../../../utils/logger/logger';
import { generateTestDataFromJsonSchema } from '../../arazzo-description-generator';
import { type Mocked } from 'vitest';

const logger = DefaultLogger.getInstance();

vi.mock('openapi-sampler');

describe('generateTestDataFromJsonSchema', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('should generate test data from JSON Schema', () => {
    (Sampler as Mocked<typeof Sampler>).sample.mockReturnValue({ name: 'string' });

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
    (Sampler as Mocked<typeof Sampler>).sample.mockReturnValue(null);
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
    const mockLogger = vi.spyOn(logger, 'error').mockImplementation((message) => {
      console.log(message);
      return true;
    });

    (Sampler as Mocked<typeof Sampler>).sample.mockImplementation(() => {
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
