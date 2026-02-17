import * as openapiCore from '@redocly/openapi-core';
import { generate } from '@redocly/respect-core';
import { writeFileSync } from 'node:fs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  type GenerateArazzoCommandArgv,
  handleGenerateArazzo,
} from '../../commands/generate-arazzo.js';

vi.mock('@redocly/respect-core', async () => {
  const actual =
    await vi.importActual<typeof import('@redocly/respect-core')>('@redocly/respect-core');
  return {
    ...actual,
    generate: vi.fn(),
  };
});

vi.mock('@redocly/openapi-core', async () => {
  const actual = await vi.importActual('@redocly/openapi-core');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
    },
    stringifyYaml: vi.fn(() => 'mocked yaml'),
  };
});

vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));

describe('handleGenerateArazzo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generate).mockResolvedValue('{"mocked": "arazzo"}');
  });

  it('should call generate with the correct arguments', async () => {
    const mockConfig = await openapiCore.createConfig({});
    const commandArgs = {
      argv: {
        descriptionPath: 'openapi.yaml',
      } as GenerateArazzoCommandArgv,
      config: mockConfig,
      version: '1.0.0',
      collectSpecData: vi.fn(),
    };

    await handleGenerateArazzo(commandArgs);

    expect(generate).toHaveBeenCalledWith({
      outputFile: 'auto-generated.arazzo.yaml',
      descriptionPath: 'openapi.yaml',
      collectSpecData: commandArgs.collectSpecData,
      version: '1.0.0',
      config: mockConfig,
    });
    expect(writeFileSync).toHaveBeenCalledWith('auto-generated.arazzo.yaml', 'mocked yaml');
  });

  it('should use custom output file when provided', async () => {
    const mockConfig = await openapiCore.createConfig({});
    const commandArgs = {
      argv: {
        descriptionPath: 'openapi.yaml',
        'output-file': 'custom.arazzo.yaml',
      } as GenerateArazzoCommandArgv,
      config: mockConfig,
      version: '1.0.0',
      collectSpecData: vi.fn(),
    };

    await handleGenerateArazzo(commandArgs);

    expect(generate).toHaveBeenCalledWith({
      outputFile: 'custom.arazzo.yaml',
      descriptionPath: 'openapi.yaml',
      collectSpecData: commandArgs.collectSpecData,
      version: '1.0.0',
      config: mockConfig,
    });

    expect(writeFileSync).toHaveBeenCalledWith('custom.arazzo.yaml', 'mocked yaml');
  });

  it('should throw an error if the openapi file is not valid', async () => {
    const mockConfig = await openapiCore.createConfig({});
    const commandArgs = {
      argv: {
        descriptionPath: 'openapi.yaml',
      } as GenerateArazzoCommandArgv,
      config: mockConfig,
      version: '1.0.0',
      collectSpecData: vi.fn(),
    };

    vi.mocked(generate).mockRejectedValueOnce(new Error('Invalid OpenAPI file'));

    await expect(handleGenerateArazzo(commandArgs)).rejects.toThrow(
      '❌  Failed to generate Arazzo description. Check the output file path you provided, or the OpenAPI file content.'
    );
    expect(writeFileSync).not.toHaveBeenCalled();
  });
});
