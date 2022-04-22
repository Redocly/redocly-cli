import { Config, getMergedConfig } from '@redocly/openapi-core';
import {
  getApiEntrypoint,
  getDestinationProps,
  handlePush,
  transformPush,
} from '../../commands/push';

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
      entrypoint: 'spec.json',
      destination: '@org/my-api@1.0.0',
      branchName: 'test',
    });

    expect(redoclyClient.registryApi.prepareFileUpload).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toHaveBeenLastCalledWith({
      branch: 'test',
      filePaths: ['filePath'],
      isUpsert: true,
      name: 'my-api',
      organizationId: 'org',
      rootFilePath: 'filePath',
      version: '1.0.0',
    });
  });
});

describe('transformPush', () => {
  it('should adapt the existing syntax', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrAliasOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      entrypoint: 'openapi.yaml',
      destination: '@testing_org/main@v1',
    });
  });
  it('should adapt the existing syntax (including branchName)', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrAliasOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
      maybeBranchName: 'other',
    });
    expect(cb).toBeCalledWith({
      entrypoint: 'openapi.yaml',
      destination: '@testing_org/main@v1',
      branchName: 'other',
    });
  });
  it('should use --branch option firstly', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrAliasOrDestination: 'openapi.yaml',
      maybeDestination: '@testing_org/main@v1',
      maybeBranchName: 'other',
      branch: 'priority-branch',
    });
    expect(cb).toBeCalledWith({
      entrypoint: 'openapi.yaml',
      destination: '@testing_org/main@v1',
      branchName: 'priority-branch',
    });
  });
  it('should work for a destination only', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrAliasOrDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      destination: '@testing_org/main@v1',
    });
  });
  it('should accept aliases for the old syntax', () => {
    const cb = jest.fn();
    transformPush(cb)({
      maybeEntrypointOrAliasOrDestination: 'alias',
      maybeDestination: '@testing_org/main@v1',
    });
    expect(cb).toBeCalledWith({
      destination: '@testing_org/main@v1',
      entrypoint: 'alias',
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
    expect(getDestinationProps('@testing_org/main@v1', 'org-from-config')).toEqual([
      'testing_org',
      'main',
      'v1',
    ]);
  });
  it('should fallback the organizationId from a config for the short destination syntax', () => {
    expect(getDestinationProps('main@v1', 'org-from-config')).toEqual([
      'org-from-config',
      'main',
      'v1',
    ]);
  });
  it('should fallback the organizationId from a config if no destination provided', () => {
    expect(getDestinationProps(undefined, 'org-from-config')).toEqual(['org-from-config']);
  });
  it('should return empty organizationId if there is no one found', () => {
    expect(getDestinationProps('main@v1', undefined)).toEqual([, 'main', 'v1']);
  });
});

describe('getApiEntrypoint', () => {
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
    expect(getApiEntrypoint({ name: 'main', version: 'v1', config })).toEqual('openapi.yaml');
  });
  it('should resolve the latest version of api if there is no matching version', () => {
    expect(getApiEntrypoint({ name: 'main', version: 'latest', config })).toEqual('latest.yaml');
  });
});
