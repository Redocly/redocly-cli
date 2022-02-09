import { iteratePathItems } from '../index';
import * as path from 'path';
import * as openapiCore from '@redocly/openapi-core';
import {
  PATHS,
  ComponentsFiles,
  WEBHOOKS
} from '../types';


jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  writeYaml: jest.fn(),
}));

describe('#split', () => {
  it('should have correct paths path', () => {
    const openapiDir = 'test';
    const componentsFiles: ComponentsFiles = {};

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'paths/test.yaml');
    iteratePathItems(require("./fixtures/spec.json"), openapiDir, componentsFiles, PATHS);
    expect(openapiCore.slash).toHaveBeenCalledWith('paths/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/paths/test.yaml');
  });

  it('should have correct webhooks path', () => {
    const openapiDir = 'test';
    const componentsFiles: ComponentsFiles = {};

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(require("./fixtures/webhooks.json"), openapiDir, componentsFiles, WEBHOOKS);
    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
  });

  it('should have correct x-webhooks path', () => {
    const openapiDir = 'test';
    const componentsFiles: ComponentsFiles = {};

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(require("./fixtures/spec.json"), openapiDir, componentsFiles, WEBHOOKS);
    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
  });
});
