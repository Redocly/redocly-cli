import { iteratePaths } from '../index';
import * as path from 'path';
import * as openapiCore from '@redocly/openapi-core';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  writeYaml: jest.fn(),
}));

describe('#split', () => {
  it('should have correct paths for mac', () => {
    const pathsDir = 'test/paths';
    const openapiDir = 'test';

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'paths/test.yaml');
    iteratePaths(require("./fixtures/spec.json"), pathsDir, openapiDir);
    expect(openapiCore.slash).toHaveBeenCalledWith('paths/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/paths/test.yaml');
  });

  it('should have correct paths for windows', () => {
    const pathsDir = 'test\\paths';
    const openapiDir = 'test';

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths\\test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'paths\\test.yaml');
    iteratePaths(require("./fixtures/spec.json"), pathsDir, openapiDir);
    expect(openapiCore.slash).toHaveBeenCalledWith('paths\\test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test\\paths/test.yaml');
  });
});
