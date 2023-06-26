import * as fs from 'fs';
import { Config, getMergedConfig } from '@redocly/openapi-core';
import { exitWithError } from '../../utils';
import { getApiRoot, getDestinationProps, handlePush, transformPush } from '../../commands/push';
import { ConfigFixture } from '../fixtures/config';
import { yellow } from 'colorette';

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
    await handlePush(
      {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      ConfigFixture as any
    );

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

  it('fails if jobId value is an empty string', async () => {
    await handlePush(
      {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
        public: true,
        'job-id': ' ',
        'batch-size': 2,
      },
      ConfigFixture as any
    );

    expect(exitWithError).toBeCalledTimes(1);
  });

  it('fails if batchSize value is less than 2', async () => {
    await handlePush(
      {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 1,
      },
      ConfigFixture as any
    );

    expect(exitWithError).toBeCalledTimes(1);
  });

  it('push with --files', async () => {
    const mockConfig = { ...ConfigFixture, files: ['./resouces/1.md', './resouces/2.md'] } as any;

    (fs.statSync as jest.Mock).mockImplementation(() => {
      return { isDirectory: () => false, size: 10 };
    });

    await handlePush(
      {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        public: true,
        files: ['./resouces/1.md', './resouces/2.md'],
      },
      mockConfig
    );

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

  it('push should fail if organization not provided', async () => {
    await handlePush(
      {
        upsert: true,
        api: 'spec.json',
        destination: 'test@v1',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      ConfigFixture as any
    );

    expect(exitWithError).toBeCalledTimes(1);
    expect(exitWithError).toBeCalledWith(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.`
    );
  });

  it('push should work with organization in config', async () => {
    const mockConfig = { ...ConfigFixture, organization: 'test_org' } as any;
    await handlePush(
      {
        upsert: true,
        api: 'spec.json',
        destination: 'my-api@1.0.0',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      mockConfig
    );

    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toHaveBeenLastCalledWith({
      branch: 'test',
      filePaths: ['filePath'],
      isUpsert: true,
      isPublic: true,
      name: 'my-api',
      organizationId: 'test_org',
      rootFilePath: 'filePath',
      version: '1.0.0',
      batchId: '123',
      batchSize: 2,
    });
  });

  it('push should work if destination not provided but api in config is provided', async () => {
    const mockConfig = {
      ...ConfigFixture,
      organization: 'test_org',
      apis: { 'my-api@1.0.0': { root: 'path' } },
    } as any;

    await handlePush(
      {
        upsert: true,
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      mockConfig
    );

    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
  });

  it('push should fail if apis not provided', async () => {
    const mockConfig = { organization: 'test_org', apis: {} } as any;

    await handlePush(
      {
        upsert: true,
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      mockConfig
    );

    expect(exitWithError).toBeCalledTimes(1);
    expect(exitWithError).toHaveBeenLastCalledWith(
      'Api not found. Please make sure you have provided the correct data in the config file.'
    );
  });

  it('push should fail if destination not provided', async () => {
    const mockConfig = { organization: 'test_org', apis: {} } as any;

    await handlePush(
      {
        upsert: true,
        api: 'api.yaml',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      mockConfig
    );

    expect(exitWithError).toBeCalledTimes(1);
    expect(exitWithError).toHaveBeenLastCalledWith(
      'No destination provided, please use --destination option to provide destination.'
    );
  });

  it('push should fail if destination format is not valid', async () => {
    const mockConfig = { organization: 'test_org', apis: {} } as any;

    await handlePush(
      {
        upsert: true,
        destination: 'name/v1',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      mockConfig
    );

    expect(exitWithError).toHaveBeenCalledWith(
      `Destination argument value is not valid, please use the right format: ${yellow(
        '<api-name@api-version>'
      )}`
    );
  });

  it('push should work and encode name with spaces', async () => {
    const encodeURIComponentSpy = jest.spyOn(global, 'encodeURIComponent');

    const mockConfig = {
      ...ConfigFixture,
      organization: 'test_org',
      apis: { 'my test api@v1': { root: 'path' } },
    } as any;

    await handlePush(
      {
        upsert: true,
        destination: 'my test api@v1',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      mockConfig
    );

    expect(encodeURIComponentSpy).toHaveReturnedWith('my%20test%20api');
    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
  });
});

describe('transformPush', () => {
  it('should adapt the existing syntax', () => {
    const cb = jest.fn();
    transformPush(cb)(
      {
        api: 'openapi.yaml',
        maybeDestination: '@testing_org/main@v1',
      },
      {} as any
    );
    expect(cb).toBeCalledWith(
      {
        api: 'openapi.yaml',
        destination: '@testing_org/main@v1',
      },
      {}
    );
  });
  it('should adapt the existing syntax (including branchName)', () => {
    const cb = jest.fn();
    transformPush(cb)(
      {
        api: 'openapi.yaml',
        maybeDestination: '@testing_org/main@v1',
        maybeBranchName: 'other',
      },
      {} as any
    );
    expect(cb).toBeCalledWith(
      {
        api: 'openapi.yaml',
        destination: '@testing_org/main@v1',
        branchName: 'other',
      },
      {}
    );
  });
  it('should use --branch option firstly', () => {
    const cb = jest.fn();
    transformPush(cb)(
      {
        api: 'openapi.yaml',
        maybeDestination: '@testing_org/main@v1',
        maybeBranchName: 'other',
        branch: 'priority-branch',
      },
      {} as any
    );
    expect(cb).toBeCalledWith(
      {
        api: 'openapi.yaml',
        destination: '@testing_org/main@v1',
        branchName: 'priority-branch',
      },
      {}
    );
  });
  it('should work for a destination only', () => {
    const cb = jest.fn();
    transformPush(cb)(
      {
        api: '@testing_org/main@v1',
      },
      {} as any
    );
    expect(cb).toBeCalledWith(
      {
        destination: '@testing_org/main@v1',
      },
      {}
    );
  });
  it('should work for a api only', () => {
    const cb = jest.fn();
    transformPush(cb)(
      {
        api: 'test.yaml',
      },
      {} as any
    );
    expect(cb).toBeCalledWith(
      {
        api: 'test.yaml',
      },
      {}
    );
  });
  it('should accept aliases for the old syntax', () => {
    const cb = jest.fn();
    transformPush(cb)(
      {
        api: 'alias',
        maybeDestination: '@testing_org/main@v1',
      },
      {} as any
    );
    expect(cb).toBeCalledWith(
      {
        destination: '@testing_org/main@v1',
        api: 'alias',
      },
      {}
    );
  });
  it('should use --job-id option firstly', () => {
    const cb = jest.fn();
    transformPush(cb)(
      {
        'batch-id': 'b-123',
        'job-id': 'j-123',
        api: 'test',
        maybeDestination: 'main@v1',
        branch: 'test',
        destination: 'main@v1',
      },
      {} as any
    );
    expect(cb).toBeCalledWith(
      {
        'job-id': 'j-123',
        api: 'test',
        branchName: 'test',
        destination: 'main@v1',
      },
      {}
    );
  });
  it('should accept no arguments at all', () => {
    const cb = jest.fn();
    transformPush(cb)({}, {} as any);
    expect(cb).toBeCalledWith({}, {});
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
  it('should return organizationId from destination string', () => {
    expect(getDestinationProps('@test-org/main@main-v1', undefined)).toEqual({
      organizationId: 'test-org',
      name: 'main',
      version: 'main-v1',
    });
  });

  it('should return organizationId, version and empty name from destination string', () => {
    expect(getDestinationProps('@test_org/@main_v1', undefined)).toEqual({
      organizationId: 'test_org',
      name: '',
      version: 'main_v1',
    });
  });

  it('should validate organizationId with space and version with dot', () => {
    expect(getDestinationProps('@test org/simple_name@main.v1', undefined)).toEqual({
      organizationId: 'test org',
      name: 'simple_name',
      version: 'main.v1',
    });
  });

  it('should not work with "@" in destination name', () => {
    expect(getDestinationProps('@test org/simple@name@main.v1', undefined)).toEqual({
      organizationId: undefined,
      name: undefined,
      version: undefined,
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
