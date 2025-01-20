import { getMergedConfig } from '@redocly/openapi-core';
import { handlePush } from '../../commands/push';
import { promptClientToken } from '../../commands/login';
import { ConfigFixture } from '../fixtures/config';
import { Readable } from 'node:stream';

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: () => {
    const readable = new Readable();
    readable.push('test data');
    readable.push(null);
    return readable;
  },
  statSync: () => ({ size: 9 }),
  readFileSync: () => Buffer.from('test data'),
  existsSync: () => false,
  readdirSync: () => [],
}));

// Mock OpenAPI core
jest.mock('@redocly/openapi-core', () => ({
  ...jest.requireActual('@redocly/openapi-core'),
  getMergedConfig: jest.fn().mockReturnValue({
    styleguide: {
      skipDecorators: jest.fn(),
      extendPaths: [],
      pluginPaths: [],
    },
  }),
  bundle: jest.fn().mockResolvedValue({
    bundle: { parsed: {} },
    problems: {
      totals: { errors: 0, warnings: 0 },
      items: [],
      [Symbol.iterator]: function* () {
        yield* this.items;
      },
    },
  }),
  RedoclyClient: jest.fn().mockImplementation((region?: string) => ({
    domain: region === 'eu' ? 'eu.redocly.com' : 'redoc.ly',
    isAuthorizedWithRedoclyByRegion: jest.fn().mockResolvedValue(false),
    login: jest.fn().mockResolvedValue({}),
    registryApi: {
      prepareFileUpload: jest.fn().mockResolvedValue({
        signedUploadUrl: 'https://example.com',
        filePath: 'test.yaml',
      }),
      pushApi: jest.fn().mockResolvedValue({}),
    },
  })),
}));

jest.mock('../../commands/login');
jest.mock('../../utils/miscellaneous');

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    headers: new Headers(),
    statusText: 'OK',
    redirected: false,
    type: 'default',
    url: '',
    clone: () => ({} as Response),
    body: new ReadableStream(),
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => '',
  } as Response)
);

const mockPromptClientToken = promptClientToken as jest.MockedFunction<typeof promptClientToken>;

describe('push-with-region', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('should call login with default domain when region is US', async () => {
    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(mockPromptClientToken).toBeCalledTimes(1);
    expect(mockPromptClientToken).toHaveBeenCalledWith('redoc.ly');
  });

  it('should call login with EU domain when region is EU', async () => {
    // Update config for EU region
    const euConfig = { ...ConfigFixture, region: 'eu' };

    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
      },
      config: euConfig as any,
      version: 'cli-version',
    });

    expect(mockPromptClientToken).toBeCalledTimes(1);
    expect(mockPromptClientToken).toHaveBeenCalledWith('eu.redocly.com');
  });
});
