import { iteratePathItem } from '../index';
import * as path from 'path';
import * as openapiCore from '@redocly/openapi-core';
import {
  PATHS,
  ComponentsFiles
} from '../types';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  writeYaml: jest.fn(),
}));

describe('#split', () => {
  it('should have correct paths for mac', () => {
    const pathsDir = 'test/paths';
    const openapiDir = 'test';
    const componentsFiles: ComponentsFiles = {};

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'paths/test.yaml');
    iteratePathItem(require("./fixtures/spec.json"), openapiDir, componentsFiles, PATHS, pathsDir);
    expect(openapiCore.slash).toHaveBeenCalledWith('paths/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/paths/test.yaml');
  });

  it('should have correct paths for windows', () => {
    const pathsDir = 'test\\paths';
    const openapiDir = 'test';
    const componentsFiles: ComponentsFiles = {};

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths\\test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'paths\\test.yaml');
    iteratePathItem(require("./fixtures/spec.json"), openapiDir, componentsFiles, PATHS, pathsDir);
    expect(openapiCore.slash).toHaveBeenCalledWith('paths\\test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test\\paths/test.yaml');
  });
});
