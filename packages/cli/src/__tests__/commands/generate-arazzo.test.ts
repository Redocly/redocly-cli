import * as openapiCore from '@redocly/openapi-core';
import { generate } from '@redocly/respect-core';
import { writeFileSync } from 'node:fs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { generateWorkflowsWithAi } from '../../commands/generate-arazzo/ai/generate-workflows.js';
import {
  buildRespectHint,
  type GenerateArazzoCommandArgv,
  handleGenerateArazzo,
} from '../../commands/generate-arazzo/index.js';

vi.mock('@redocly/respect-core', async () => {
  const actual =
    // oxlint-disable-next-line typescript/consistent-type-imports
    await vi.importActual<typeof import('@redocly/respect-core')>('@redocly/respect-core');
  return {
    ...actual,
    generate: vi.fn(),
  };
});

vi.mock('../../commands/generate-arazzo/ai/generate-workflows.js', () => ({
  generateWorkflowsWithAi: vi.fn(),
}));

vi.mock('@redocly/openapi-core', async () => {
  const actual = await vi.importActual('@redocly/openapi-core');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
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
    vi.mocked(generate).mockResolvedValue({ workflows: [] });
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
      collectSpecData: expect.any(Function),
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
      collectSpecData: expect.any(Function),
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

  it('should write the AI-designed workflows when --with-ai succeeds', async () => {
    const mockConfig = await openapiCore.createConfig({});
    vi.mocked(generateWorkflowsWithAi).mockResolvedValueOnce({
      yaml: 'ai yaml',
      workflows: 2,
    });
    const commandArgs = {
      argv: {
        descriptionPath: 'openapi.yaml',
        'with-ai': true,
        'ai-provider': 'claude',
        'ai-model': 'claude-sonnet-5',
        'ai-concurrency': 4,
        'max-workflows': 10,
      } as GenerateArazzoCommandArgv,
      config: mockConfig,
      version: '1.0.0',
      collectSpecData: vi.fn(),
    };

    await handleGenerateArazzo(commandArgs);

    expect(generateWorkflowsWithAi).toHaveBeenCalledWith({
      provider: 'claude',
      model: 'claude-sonnet-5',
      baseline: { workflows: [] },
      description: undefined,
      maxWorkflows: 10,
      concurrency: 4,
    });
    expect(writeFileSync).toHaveBeenCalledWith(
      'auto-generated.arazzo.yaml',
      '# The workflows below were inferred by AI (--with-ai). Verify before use.\nai yaml'
    );
  });

  it('should keep the auto-generated workflows when --with-ai fails', async () => {
    const mockConfig = await openapiCore.createConfig({});
    vi.mocked(generateWorkflowsWithAi).mockRejectedValueOnce(new Error('no usable answer'));
    const commandArgs = {
      argv: {
        descriptionPath: 'openapi.yaml',
        'with-ai': true,
        'ai-provider': 'claude',
        'max-workflows': 10,
      } as GenerateArazzoCommandArgv,
      config: mockConfig,
      version: '1.0.0',
      collectSpecData: vi.fn(),
    };

    await handleGenerateArazzo(commandArgs);

    expect(writeFileSync).toHaveBeenCalledWith('auto-generated.arazzo.yaml', 'mocked yaml');
    expect(openapiCore.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('AI workflow design failed')
    );
  });

  it('should print a hint with the respect command', async () => {
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

    expect(openapiCore.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('npx @redocly/cli@latest respect auto-generated.arazzo.yaml')
    );
  });
});

describe('buildRespectHint', () => {
  it('lists a placeholder for every workflow input, resolving component refs', () => {
    const resultYaml = [
      'workflows:',
      '  - workflowId: first',
      '    inputs:',
      '      $ref: "#/components/inputs/bearerAuth"',
      '  - workflowId: second',
      '    inputs:',
      '      type: object',
      '      properties:',
      '        userEmail:',
      '          type: string',
      'components:',
      '  inputs:',
      '    bearerAuth:',
      '      type: object',
      '      properties:',
      '        bearerAuth:',
      '          type: string',
    ].join('\n');

    const hint = buildRespectHint(resultYaml, 'museum.arazzo.yaml');

    expect(hint).toContain(
      'npx @redocly/cli@latest respect museum.arazzo.yaml --input bearerAuth=YOUR_BEARERAUTH --input userEmail=YOUR_USEREMAIL'
    );
    expect(hint).toContain('Replace the YOUR_* values');
    expect(hint).toContain('REDOCLY_CLI_RESPECT_INPUT');
  });

  it('omits input flags when the workflows declare no inputs', () => {
    const hint = buildRespectHint('workflows:\n  - workflowId: first\n', 'museum.arazzo.yaml');

    expect(hint).toContain('npx @redocly/cli@latest respect museum.arazzo.yaml\n');
    expect(hint).not.toContain('--input');
    expect(hint).not.toContain('Replace the YOUR_* values');
  });
});
