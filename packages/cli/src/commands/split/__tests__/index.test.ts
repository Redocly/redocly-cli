import { iteratePathItems } from '../index';
import * as path from 'path';
import * as openapiCore from '@redocly/openapi-core';
import {
  ComponentsFiles,
} from '../types';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  writeYaml: jest.fn(),
}));

jest.mock('@redocly/openapi-core', () => ({
  ...jest.requireActual('@redocly/openapi-core'),
  isRef: jest.fn(),
}));

describe('#split', () => {
  it('should have correct paths path', () => {
    const openapi = require("./fixtures/spec.json");
    const openapiDir = 'test';
    const componentsFiles: ComponentsFiles = {};
    
    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'paths/test.yaml');
    iteratePathItems(openapi.paths, openapiDir, path.join(openapiDir, 'paths'), componentsFiles);

    expect(openapiCore.slash).toHaveBeenCalledWith('paths/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/paths/test.yaml');
  });

  it('should have correct webhooks path', () => {
    const openapi = require("./fixtures/webhooks.json");
    const openapiDir = 'test';
    const componentsFiles: ComponentsFiles = {};

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(openapi.webhooks, openapiDir, path.join(openapiDir, 'webhooks'), componentsFiles, 'webhook_');

    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
  });

  it('should have correct x-webhooks path', () => {
    const openapi = require("./fixtures/spec.json");
    const openapiDir = 'test';
    const componentsFiles: ComponentsFiles = {};

    jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
    jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
    iteratePathItems(openapi['x-webhooks'], openapiDir, path.join(openapiDir, 'webhooks'), componentsFiles, 'webhook_');

    expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
    expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
  });
});
