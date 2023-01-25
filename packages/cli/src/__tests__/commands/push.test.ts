import * as fs from 'fs';
import { Config, getMergedConfig } from '@redocly/openapi-core';
import { exitWithError, loadConfigAndHandleErrors } from '../../utils';
import { getApiRoot, getDestinationProps, handlePush, transformPush } from '../../commands/push';
import { ConfigFixture } from '../fixtures/config';

jest.mock('fs');
jest.mock('node-fetch', () => ({
  default: jest.fn(() => ({
    ok: true,
    json: jest.fn().mockResolvedValue({}),
  })),
}));
jest.mock('@redocly/openapi-core');
jest.mock('../../utils');

(getMergedConfig as jest.Mock).mockImplementation((config) => config);

describe('push', () => {
  const redoclyClient = require('@redocly/openapi-core').__redoclyClient;

  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('pushes definition', async () => {
    await handlePush({
      upsert: true,
      api: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
      public: true,
      'batch-id': '123',
      'batch-size': 2,
    });

    expect(redoclyClient.registryApi.prepareFileUpload).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toHaveBeenLastCalledWith({
      branch: 'test',
      filePaths: ['filePath'],
      isUpsert: true,
      isPublic: true,
      name: 'my-api',
      organizationId: 'org',
      rootFilePath: 'filePath',
      version: '1.0.0',
      batchId: '123',
      batchSize: 2,
    });
  });

  it('fails if batchId value is an empty string', async () => {
    await handlePush({
      upsert: true,
      api: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
      public: true,
      'batch-id': ' ',
      'batch-size': 2,
    });

    expect(exitWithError).toBeCalledTimes(1);
  });

  it('fails if batchSize value is less than 2', async () => {
    await handlePush({
      upsert: true,
      api: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
      public: true,
      'batch-id': '123',
      'batch-size': 1,
    });

    expect(exitWithError).toBeCalledTimes(1);
  });

  it('push with --files', async () => {
    (loadConfigAndHandleErrors as jest.Mock).mockImplementation(({ files }) => {
      return { ...ConfigFixture, files };
    });

    //@ts-ignore
    fs.statSync.mockImplementation(() => {
      return { isDirectory: () => false, size: 10 };
    });

    await handlePush({
      upsert: true,
      api: 'spec.json',
      destination: '@org/my-api@1.0.0',
      public: true,
      files: ['./resouces/1.md', './resouces/2.md'],
    });

    expect(redoclyClient.registryApi.pushApi).toHaveBeenLastCalledWith({
      filePaths: ['filePath', 'filePath', 'filePath'],
      isUpsert: true,
      isPublic: true,
      name: 'my-api',
      organizationId: 'org',
      rootFilePath: 'filePath',
      version: '1.0.0',
    });
    expect(redoclyClient.registryApi.prepareFileUpload).toBeCalledTimes(3);
  });
});

describe('transformPush', () => {
  it('should adapt the existing syntax', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeApiOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      api: 'openapi.yaml',
      destination: '@testing_org/main@v1',
    });
  });
  it('should adapt the existing syntax (including branchName)', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeApiOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
      maybeBranchName: 'other',
    });
    expect(cb).toBeCalledWith({
      api: 'openapi.yaml',
      destination: '@testing_org/main@v1',
      branchName: 'other',
    });
  });
  it('should use --branch option firstly', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeApiOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
      maybeBranchName: 'other',
      branch: 'priority-branch',
    });
    expect(cb).toBeCalledWith({
      api: 'openapi.yaml',
      destination: '@testing_org/main@v1',
      branchName: 'priority-branch',
    });
  });
  it('should work for a destination only', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeApiOrDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      destination: '@testing_org/main@v1',
    });
  });
  it('should accept aliases for the old syntax', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeApiOrDestination: 'alias',
      maybeDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      destination: '@testing_org/main@v1',
      api: 'alias',
    });
  });
  it('should accept no arguments at all', () => {
    const cb = jest.fn();
    transformPush(cb)({});
    expect(cb).toBeCalledWith({});
  });
});

describe('getDestinationProps', () => {
  it('should get valid destination props for the full destination syntax', () => {
    expect(getDestinationProps('@testing_org/main@v1', 'org-from-config')).toEqual({
      organizationId: 'testing_org',
      name: 'main',
      version: 'v1',
    });
  });
  it('should fallback the organizationId from a config for the short destination syntax', () => {
    expect(getDestinationProps('main@v1', 'org-from-config')).toEqual({
      organizationId: 'org-from-config',
      name: 'main',
      version: 'v1',
    });
  });
  it('should fallback the organizationId from a config if no destination provided', () => {
    expect(getDestinationProps(undefined, 'org-from-config')).toEqual({
      organizationId: 'org-from-config',
    });
  });
  it('should return empty organizationId if there is no one found', () => {
    expect(getDestinationProps('main@v1', undefined)).toEqual({
      organizationId: undefined,
      name: 'main',
      version: 'v1',
    });
  });
});

describe('getApiRoot', () => {
  let config: Config = {
    apis: {
      'main@v1': {
        root: 'openapi.yaml',
      },
      main: {
        root: 'latest.yaml',
      },
    },
  } as unknown as Config;
  it('should resolve the correct api for a valid name & version', () => {
    expect(getApiRoot({ name: 'main', version: 'v1', config })).toEqual('openapi.yaml');
  });
  it('should resolve the latest version of api if there is no matching version', () => {
    expect(getApiRoot({ name: 'main', version: 'latest', config })).toEqual('latest.yaml');
  });
});
