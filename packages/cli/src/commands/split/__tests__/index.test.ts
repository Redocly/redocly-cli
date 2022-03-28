import { iteratePathItems, handleSplit } from '../index';
import * as path from 'path';
import * as openapiCore from '@redocly/openapi-core';
import {
  ComponentsFiles,
} from '../types'; 
import { blue, green } from 'colorette';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  writeYaml: jest.fn(),
}));

jest.mock('@redocly/openapi-core', () => ({
  ...jest.requireActual('@redocly/openapi-core'),
  isRef: jest.fn(),
}));

describe('#split', () => {
  const openapiDir = 'test';
  const componentsFiles: ComponentsFiles = {};

  it('should split the file and show the success message', async () => {
    const filePath = "./packages/cli/src/commands/split/__tests__/fixtures/spec.json";
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await handleSplit (
      {
        entrypoint: filePath,
        outDir: openapiDir,
        separator: '_',
      }
    );

    expect(process.stderr.write).toBeCalledTimes(2);
    expect((process.stderr.write as jest.Mock).mock.calls[0][0]).toBe(
      `🪓 Document: ${blue(filePath!)} ${green('is successfully split')}
    and all related files are saved to the directory: ${blue(openapiDir)} \n`
    );
    expect((process.stderr.write as jest.Mock).mock.calls[1][0]).toContain(
      `${filePath}: split processed in <test>ms`
    );
  });


  it('should use the correct separator', async () => {
    const filePath = "./packages/cli/src/commands/split/__tests__/fixtures/spec.json";

    const utils = require('../../../utils');
    jest.spyOn(utils, 'pathToFilename').mockImplementation(() => 'newFilePath');

    await handleSplit (
      {
        entrypoint: filePath,
        outDir: openapiDir,
        separator: '_',
      }
    );

    expect(utils.pathToFilename).toBeCalledWith(expect.anything(), '_');
    utils.pathToFilename.mockRestore();
  });

  it('should have correct path with paths', () => {
    const openapi = require("./fixtures/spec.json");
    
    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'paths/test.yaml');
    iteratePathItems(openapi.paths, openapiDir, path.join(openapiDir, 'paths'), componentsFiles, '_');

    expect(openapiCore.slash).toHaveBeenCalledWith('paths/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/paths/test.yaml');
  });

  it('should have correct path with webhooks', () => {
    const openapi = require("./fixtures/webhooks.json");

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(openapi.webhooks, openapiDir, path.join(openapiDir, 'webhooks'), componentsFiles, 'webhook_');

    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
  });

  it('should have correct path with x-webhooks', () => {
    const openapi = require("./fixtures/spec.json");

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(openapi['x-webhooks'], openapiDir, path.join(openapiDir, 'webhooks'), componentsFiles, 'webhook_');

    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
  });
});
