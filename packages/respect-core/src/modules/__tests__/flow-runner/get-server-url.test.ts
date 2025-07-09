import { logger } from '@redocly/openapi-core';
import type { ExtendedOperation, TestContext } from '../../../types.js';
import type { OperationDetails } from '../../description-parser/index.js';

import { getServerUrl, GetServerUrlInput } from '../../flow-runner/index.js';

describe('getServerUrl', () => {
  it('should return first server url from servers', () => {
    const ctx = {
      $sourceDescriptions: {
        test: { servers: [{ url: 'https://example.com' }, { url: 'https://example2.com' }] },
      },
      options: {
        logger,
      },
    } as unknown as TestContext;
    const descriptionName = 'test';
    const result = getServerUrl({ ctx, descriptionName });
    expect(result).toEqual({ url: 'https://example.com', parameters: [] });
  });

  it('should return undefined when path does not include url and no servers provided', () => {
    const ctx = {
      $sourceDescriptions: {},
      options: {
        logger,
      },
    } as unknown as TestContext;
    const descriptionName = 'test';
    const result = getServerUrl({ ctx, descriptionName });
    expect(result).toEqual(undefined);
  });

  it('should return server url from sourceDescription x-serverUrl', () => {
    const ctx = {
      sourceDescriptions: [
        {
          name: 'test',
          'x-serverUrl': 'https://example.com',
        },
      ],
      $sourceDescriptions: {
        test: { servers: [{ url: 'https://example.com' }] },
      },
      options: {
        logger,
      },
    } as unknown as TestContext;
    const descriptionName = 'test';
    const result = getServerUrl({ ctx, descriptionName });
    expect(result).toEqual({ url: 'https://example.com', parameters: [] });
  });

  it('should return server url from sourceDescription x-serverUrl resolved from context', () => {
    const ctx = {
      sourceDescriptions: [
        {
          name: 'test',
          'x-serverUrl': '$servers.2.url',
          type: 'openapi',
        },
      ],
      $sourceDescriptions: {
        test: {
          servers: [
            { url: 'https://example.com' },
            { url: 'https://example2.com' },
            {
              url: 'https://example3.{domain}',
              variables: {
                domain: {
                  default: 'com',
                  enum: ['com', 'net'],
                },
              },
            },
          ],
        },
      },
      options: {
        logger,
      },
    } as unknown as TestContext;
    const descriptionName = 'test';
    const result = getServerUrl({ ctx, descriptionName });
    expect(result).toEqual({
      url: 'https://example3.{domain}',
      parameters: [{ name: 'domain', value: 'com', in: 'path' }],
    });
  });

  it('should return overwritten server url from sourceDescription x-serverUrl resolved from context', () => {
    const ctx = {
      sourceDescriptions: [
        {
          name: 'test',
          'x-serverUrl': 'https://override.com',
          type: 'openapi',
          url: './openapi.yaml',
        },
      ],
      $sourceDescriptions: {
        test: { servers: [{ url: 'https://example.com' }] },
      },
      options: {
        logger,
      },
    } as unknown as TestContext;
    const descriptionName = 'test';
    const result = getServerUrl({ ctx, descriptionName });
    expect(result).toEqual({ url: 'https://override.com' });
  });

  it('should return server url from descriptionOperation', () => {
    const ctx = {
      $sourceDescriptions: {
        test: {
          paths: {
            '/test': {
              get: {
                servers: [{ url: 'https://example1.com' }],
              },
            },
          },
        },
      },
      options: {
        logger,
      },
    } as unknown as TestContext;
    const openapiOperation = {
      servers: [{ url: 'https://example1.com' }],
    } as unknown as OperationDetails & { servers: { url: string }[] };
    const descriptionName = 'test';
    const result = getServerUrl({ ctx, descriptionName, openapiOperation });
    expect(result).toEqual({ url: 'https://example1.com', parameters: [] });
  });

  it('should return "x-operation" url as server url when descriptionName is not provided', () => {
    const ctx = {
      sourceDescriptions: [
        {
          name: 'test2',
          'x-serverUrl': 'https://example2.com',
          type: 'openapi',
        },
      ],
      $sourceDescriptions: {
        test: { servers: [{ url: 'https://example.com' }] },
      },
      options: {
        logger,
      },
    } as unknown as TestContext;
    const descriptionName = '';
    const xOperation = {
      url: 'http:/localhost:3000/test',
      method: 'get',
    } as unknown as ExtendedOperation;
    const result = getServerUrl({ ctx, descriptionName, xOperation });
    expect(result).toEqual({ url: 'http:/localhost:3000/test' });
  });

  it('should return x-serverUrl when available when descriptionName is not provided and there is only one sourceDescription', () => {
    const ctx: TestContext = {
      sourceDescriptions: [
        {
          name: 'testApi',
          type: 'openapi',
          url: './openapi.yaml',
          'x-serverUrl': 'https://api.example.com',
        },
      ],
      $sourceDescriptions: {},
    } as unknown as TestContext;

    const result = getServerUrl({ ctx, descriptionName: '' });
    expect(result).toEqual({ url: 'https://api.example.com' });
  });

  it('should return server URL from $sourceDescriptions when x-serverUrl is not available when descriptionName is not provided and there is only one sourceDescription', () => {
    const ctx: TestContext = {
      sourceDescriptions: [
        {
          name: 'testApi',
          type: 'openapi',
          url: './openapi.yaml',
        },
      ],
      $sourceDescriptions: {
        testApi: {
          servers: [{ url: 'https://api.example.com' }],
        },
      },
    } as unknown as TestContext;

    const result = getServerUrl({ ctx, descriptionName: '' });
    expect(result).toEqual({ url: 'https://api.example.com', parameters: [] });
  });

  it('should return undefined when neither x-serverUrl nor $sourceDescriptions server is available when descriptionName is not provided and there is only one sourceDescription', () => {
    const ctx: TestContext = {
      sourceDescriptions: [
        {
          name: 'testApi',
          type: 'openapi',
          url: './openapi.yaml',
        },
      ],
      $sourceDescriptions: {
        testApi: {
          servers: [],
        },
      },
    } as unknown as TestContext;

    const result = getServerUrl({ ctx, descriptionName: '' });
    expect(result).toBeUndefined();
  });

  it('should return serverUrlOverride when ctx.sourceDescriptions has length 1 and contains x-serverUrl', () => {
    const mockCtx = {
      sourceDescriptions: [
        {
          'x-serverUrl': 'https://override.com',
        },
      ],
    } as unknown as TestContext;

    const mockDescriptionOperation = {
      servers: [{ url: 'https://server1.com' }],
    } as unknown as OperationDetails & { servers: { url: string }[] };
    const result = getServerUrl({
      ctx: mockCtx,
      descriptionName: 'test',
      openapiOperation: mockDescriptionOperation,
    });

    expect(result).toEqual({ url: 'https://override.com' });
  });

  it('should return descriptionOperation.servers[0] when no serverUrlOverride is present', () => {
    const mockDescriptionOperation = {
      servers: [{ url: 'https://server1.com' }],
    } as unknown as OperationDetails & { servers: { url: string }[] };
    const result = getServerUrl({
      ctx: { sourceDescriptions: [] } as unknown as TestContext,
      descriptionName: 'test',
      path: '',
      openapiOperation: mockDescriptionOperation,
    } as unknown as GetServerUrlInput);

    expect(result).toEqual({ url: 'https://server1.com', parameters: [] });
  });

  it('should return undefined when descriptionOperation.servers is empty', () => {
    const mockCtx = {
      sourceDescriptions: [
        {
          'x-serverUrl': 'https://override.com',
        },
      ],
    } as unknown as TestContext;

    const result = getServerUrl({
      ctx: mockCtx,
      descriptionName: 'test',
      openapiOperation: { servers: [] } as unknown as OperationDetails & {
        servers: { url: string }[];
      },
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined when descriptionOperation is undefined', () => {
    const mockCtx = {
      sourceDescriptions: [
        {
          'x-serverUrl': 'https://override.com',
        },
      ],
    } as unknown as TestContext;
    const result = getServerUrl({
      ctx: mockCtx,
      descriptionName: 'test',
    });

    expect(result).toBeUndefined();
  });

  it('should return serverUrlOverride when sourceDescriptionName is available and contains x-serverUrl', () => {
    const mockCtx = {
      sourceDescriptions: [
        {
          name: 'test',
          'x-serverUrl': 'https://override1.com',
        },
        {
          name: 'test2',
          'x-serverUrl': 'https://override2.com',
        },
      ],
    } as unknown as TestContext;

    const mockDescriptionOperation = {
      servers: [{ url: 'https://server1.com' }],
      sourceDescriptionName: 'test2',
    } as unknown as OperationDetails & { servers: { url: string }[] };
    const result = getServerUrl({
      ctx: mockCtx,
      descriptionName: '',
      openapiOperation: mockDescriptionOperation,
    });

    expect(result).toEqual({ url: 'https://override2.com' });
  });

  it('should return server url from cli server option', () => {
    const ctx = {
      options: { server: 'test=https://cli.com' },
    } as unknown as TestContext;
    const descriptionName = 'test';
    const result = getServerUrl({ ctx, descriptionName });
    expect(result).toEqual({ url: 'https://cli.com' });
  });

  it('should return server url from openapi server with variables', () => {
    const ctx = {
      $sourceDescriptions: {
        test: {
          paths: {
            '/test': {
              get: {
                servers: [
                  {
                    url: 'https://{region}@{task}.{region}.openapi-server-with-vars.{domain}/v1?param={task}#fragment,param={task}',
                    variables: {
                      domain: {
                        default: 'com',
                        enum: ['com', 'net'],
                      },
                      region: {
                        default: 'us',
                        enum: ['us', 'eu', 'asia'],
                      },
                      task: {
                        default: 'ping',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    } as unknown as TestContext;
    const openapiOperation = {
      servers: [
        {
          url: 'https://{region}@{task}.{region}.openapi-server-with-vars.{domain}/v1?param={task}#fragment,param={task}',
          variables: {
            domain: {
              default: 'com',
              enum: ['com', 'net'],
            },
            region: {
              default: 'us',
              enum: ['us', 'eu', 'asia'],
            },
            task: {
              default: 'ping',
            },
          },
        },
      ],
    } as unknown as OperationDetails;
    const descriptionName = 'test';
    const result = getServerUrl({ ctx, descriptionName, openapiOperation });
    expect(result).toEqual({
      url: 'https://{region}@{task}.{region}.openapi-server-with-vars.{domain}/v1?param={task}#fragment,param={task}',
      parameters: [
        { name: 'domain', value: 'com', in: 'path' },
        { name: 'region', value: 'us', in: 'path' },
        { name: 'task', value: 'ping', in: 'path' },
      ],
    });
  });

  it('should return undefined when descriptionName is provided but servers are undefined in sourceDescription', () => {
    const ctx = {
      $sourceDescriptions: {
        test: { servers: undefined },
      },
    } as unknown as TestContext;

    const result = getServerUrl({ ctx, descriptionName: 'test' });
    expect(result).toBeUndefined();
  });
});
