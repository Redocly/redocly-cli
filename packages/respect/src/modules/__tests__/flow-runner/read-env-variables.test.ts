import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { readEnvVariables } from '../../flow-runner';

jest.mock('dotenv');
jest.mock('fs');

describe('readEnvVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load environment variables from the correct .env file', () => {
    const mockExecutionFilePath = '/some/folder/executionFile.js';
    const mockEnvPath = path.resolve(path.dirname(mockExecutionFilePath), '.env');

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock dotenv.config to simulate loading of environment variables
    (dotenv.config as jest.Mock).mockImplementation(({ path }) => {
      if (path === mockEnvPath) {
        process.env.MOCK_VAR = 'mock_value';
        return { parsed: { MOCK_VAR: 'mock_value' } };
      }
      return { parsed: undefined };
    });

    const result = readEnvVariables(mockExecutionFilePath);

    expect(fs.existsSync).toHaveBeenCalledWith(mockEnvPath);
    expect(dotenv.config).toHaveBeenCalledWith({ path: mockEnvPath });
    // @ts-ignore
    expect(result?.MOCK_VAR).toBe('mock_value');

    // Cleanup
    delete process.env.MOCK_VAR;
  });

  it('should return process.env when .env file does not exist', () => {
    const mockExecutionFilePath = '/some/folder/executionFile.js';

    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = readEnvVariables(mockExecutionFilePath);

    expect(fs.existsSync).toHaveBeenCalled();
    expect(dotenv.config).not.toHaveBeenCalled();
    expect(result).toBe(process.env);
  });

  it('should return process.env when no executionFilePath is provided', () => {
    const result = readEnvVariables();

    expect(fs.existsSync).not.toHaveBeenCalled();
    expect(dotenv.config).not.toHaveBeenCalled();
    expect(result).toBe(process.env);
  });
});
