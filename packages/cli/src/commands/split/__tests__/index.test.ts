import * as path from 'node:path';
import * as process from 'node:process';

import * as openapiCore from '@redocly/openapi-core';
import { blue, green } from 'colorette';

import { configFixture } from '../../../__tests__/fixtures/config.js';
import * as utils from '../../../utils/miscellaneous.js';
import { iteratePathItems, handleSplit } from '../index.js';

import type { ComponentsFiles } from '../types.js';

describe('split', () => {
  const openapiDir = 'output/split-test';
  const componentsFiles: ComponentsFiles = {};

  beforeEach(() => {
    vi.mock('node:path', async () => {
      const actual = await vi.importActual('node:path');
      return { ...actual };
    });
    vi.mock('node:process', async () => {
      const actual = await vi.importActual('node:process');
      return {
        ...actual,
      };
    });
    vi.mock('node:fs', async () => {
      const actual = await vi.importActual('node:fs');
      return {
        ...actual,
        writeFileSync: vi.fn(),
      };
    });
    vi.mock('../../../utils/miscellaneous.js', async () => {
      const actual = await vi.importActual('../../../utils/miscellaneous.js');
      return {
        ...actual,
        writeToFileByExtension: vi.fn(),
      };
    });
  });

  it('should split the file and show the success message', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/spec.json';

    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await handleSplit({
      argv: {
        api: filePath,
        outDir: openapiDir,
        separator: '_',
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(vi.mocked(process.stderr.write)).toBeCalledTimes(2);
    expect(vi.mocked(process.stderr.write).mock.calls[0][0]).toBe(
      `🪓 Document: ${blue(filePath!)} ${green('is successfully split')}
    and all related files are saved to the directory: ${blue(openapiDir)} \n`
    );
    expect(vi.mocked(process.stderr.write).mock.calls[1][0]).toContain(
      `${filePath}: split processed in <test>ms`
    );
  });

  it('should use the correct separator', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/spec.json';

    vi.spyOn(utils, 'pathToFilename').mockImplementation(() => 'newFilePath');

    await handleSplit({
      argv: {
        api: filePath,
        outDir: openapiDir,
        separator: '_',
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(utils.pathToFilename).toBeCalledWith(expect.anything(), '_');
  });

  it('should have correct path with paths', () => {
    const openapi = require('./fixtures/spec.json');

    vi.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths/test.yaml');
    vi.spyOn(path, 'relative').mockImplementation(() => 'paths/test.yaml');
    iteratePathItems(
      openapi.paths,
      openapiDir,
      path.join(openapiDir, 'paths'),
      componentsFiles,
      '_',
      undefined,
      'yaml'
    );

    expect(openapiCore.slash).toHaveBeenCalledWith('paths/test.yaml');
    expect(path.relative).toHaveBeenCalledWith(
      'output/split-test',
      'output/split-test/paths/test.yaml'
    );
  });

  it('should have correct path with webhooks', () => {
    const openapi = require('./fixtures/webhooks.json');

    vi.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    vi.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(
      openapi.webhooks,
      openapiDir,
      path.join(openapiDir, 'webhooks'),
      componentsFiles,
      'webhook_',
      undefined,
      'yaml'
    );

    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith(
      'output/split-test',
      'output/split-test/webhooks/test.yaml'
    );
  });

  it('should have correct path with x-webhooks', () => {
    const openapi = require('./fixtures/spec.json');

    vi.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    vi.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(
      openapi['x-webhooks'],
      openapiDir,
      path.join(openapiDir, 'webhooks'),
      componentsFiles,
      'webhook_',
      undefined,
      'yaml'
    );

    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith(
      'output/split-test',
      'output/split-test/webhooks/test.yaml'
    );
  });

  it('should create correct folder name for code samples', async () => {
    const openapi = require('./fixtures/samples.json');

    vi.spyOn(utils, 'escapeLanguageName');
    iteratePathItems(
      openapi.paths,
      openapiDir,
      path.join(openapiDir, 'paths'),
      componentsFiles,
      '_',
      undefined,
      'yaml'
    );

    expect(utils.escapeLanguageName).nthCalledWith(1, 'C#');
    expect(utils.escapeLanguageName).nthReturnedWith(1, 'C_sharp');

    expect(utils.escapeLanguageName).nthCalledWith(2, 'C/AL');
    expect(utils.escapeLanguageName).nthReturnedWith(2, 'C_AL');

    expect(utils.escapeLanguageName).nthCalledWith(3, 'Visual Basic');
    expect(utils.escapeLanguageName).nthReturnedWith(3, 'VisualBasic');

    expect(utils.escapeLanguageName).toBeCalledTimes(3);
  });
});
