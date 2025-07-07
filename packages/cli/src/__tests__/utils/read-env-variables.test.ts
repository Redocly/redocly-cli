import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { readEnvVariables } from '../../utils/read-env-variables.js';

vi.mock('dotenv');
vi.mock('node:fs');

describe('readEnvVariables', () => {
  it('should load environment variables from the correct .env file', () => {
    const mockExecutionFilePath = '/some/folder/executionFile.js';
    const mockEnvPath = path.resolve(path.dirname(mockExecutionFilePath), '.env');

    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Mock dotenv.config to simulate loading of environment variables
    vi.mocked(dotenv.config).mockImplementation(({ path }: any) => {
      if (path === mockEnvPath) {
        process.env.MOCK_VAR = 'mock_value';
        return { parsed: { MOCK_VAR: 'mock_value' } };
      }
      return { parsed: undefined };
    });

    const result = readEnvVariables(mockExecutionFilePath);

    expect(fs.existsSync).toHaveBeenCalledWith(mockEnvPath);
    expect(dotenv.config).toHaveBeenCalledWith({ path: mockEnvPath });
    expect(result?.MOCK_VAR).toBe('mock_value');

    // Cleanup
    delete process.env.MOCK_VAR;
  });

  it('should return process.env when .env file does not exist', () => {
    const mockExecutionFilePath = '/some/folder/executionFile.js';

    vi.mocked(fs.existsSync).mockReturnValue(false);

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
