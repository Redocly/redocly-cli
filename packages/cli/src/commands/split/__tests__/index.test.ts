import * as openapiCore from '@redocly/openapi-core';
import { blue, green } from 'colorette';
import * as path from 'node:path';
import * as process from 'node:process';

import { configFixture } from '../../../__tests__/fixtures/config.js';
import * as utils from '../../../utils/miscellaneous.js';
import { handleSplit } from '../index.js';

describe('split', () => {
  const openapiDir = 'output/split-test';

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

  it('aborts instead of writing a component file outside the output directory', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/path-traversal.json';

    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(
      handleSplit({
        argv: {
          api: filePath,
          outDir: openapiDir,
          separator: '_',
        },
        config: configFixture,
        version: 'cli-version',
      })
    ).rejects.toThrow(openapiCore.HandledError);

    expect(utils.writeToFileByExtension).not.toHaveBeenCalled();
  });

  it('aborts instead of writing a path file outside the output directory', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/path-traversal-paths.json';

    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(
      handleSplit({
        argv: {
          api: filePath,
          outDir: openapiDir,
          separator: '/',
        },
        config: configFixture,
        version: 'cli-version',
      })
    ).rejects.toThrow(openapiCore.HandledError);

    expect(utils.writeToFileByExtension).not.toHaveBeenCalled();
  });

  it('aborts before writing any file when an asyncapi component would be written outside the output directory', async () => {
    const filePath =
      'packages/cli/src/commands/split/__tests__/fixtures/path-traversal-asyncapi.json';

    await expect(
      handleSplit({
        argv: {
          api: filePath,
          outDir: openapiDir,
          separator: '_',
        },
        config: configFixture,
        version: 'cli-version',
      })
    ).rejects.toThrow(openapiCore.HandledError);

    expect(utils.writeToFileByExtension).not.toHaveBeenCalled();
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

  it('should have correct path with paths', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/spec.json';

    await handleSplit({
      argv: {
        api: filePath,
        outDir: openapiDir,
        separator: '_',
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(utils.writeToFileByExtension).toHaveBeenCalledWith(
      expect.anything(),
      path.join(openapiDir, 'paths', 'test.json')
    );
    expect(utils.writeToFileByExtension).toHaveBeenCalledWith(
      expect.objectContaining({ paths: { '/test': { $ref: 'paths/test.json' } } }),
      path.join(openapiDir, 'openapi.json')
    );
  });

  it('should have correct path with webhooks', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/webhooks.json';

    await handleSplit({
      argv: {
        api: filePath,
        outDir: openapiDir,
        separator: '_',
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(utils.writeToFileByExtension).toHaveBeenCalledWith(
      expect.anything(),
      path.join(openapiDir, 'webhooks', 'test.json')
    );
    expect(utils.writeToFileByExtension).toHaveBeenCalledWith(
      expect.objectContaining({ webhooks: { test: { $ref: 'webhooks/test.json' } } }),
      path.join(openapiDir, 'openapi.json')
    );
  });

  it('should have correct path with x-webhooks', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/spec.json';

    await handleSplit({
      argv: {
        api: filePath,
        outDir: openapiDir,
        separator: '_',
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(utils.writeToFileByExtension).toHaveBeenCalledWith(
      expect.anything(),
      path.join(openapiDir, 'webhooks', 'test.json')
    );
    expect(utils.writeToFileByExtension).toHaveBeenCalledWith(
      expect.objectContaining({ 'x-webhooks': { test: { $ref: 'webhooks/test.json' } } }),
      path.join(openapiDir, 'openapi.json')
    );
  });

  it('should create correct folder name for code samples', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/samples.json';

    vi.spyOn(utils, 'escapeLanguageName');

    await handleSplit({
      argv: {
        api: filePath,
        outDir: openapiDir,
        separator: '_',
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(utils.escapeLanguageName).nthCalledWith(1, 'C#');
    expect(utils.escapeLanguageName).nthReturnedWith(1, 'C_sharp');

    expect(utils.escapeLanguageName).nthCalledWith(2, 'C/AL');
    expect(utils.escapeLanguageName).nthReturnedWith(2, 'C_AL');

    expect(utils.escapeLanguageName).nthCalledWith(3, 'Visual Basic');
    expect(utils.escapeLanguageName).nthReturnedWith(3, 'VisualBasic');

    expect(utils.escapeLanguageName).toBeCalledTimes(3);
  });

  it('should split an AsyncAPI 2 file and show the success message', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/asyncapi2.json';

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

  it('should split an AsyncAPI 3 file and show the success message', async () => {
    const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/asyncapi3.json';

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
});
