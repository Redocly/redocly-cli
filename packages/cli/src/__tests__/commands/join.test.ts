import { yellow } from 'colorette';
import {
  bundleDocument,
  detectSpec,
  getTotals,
  loadConfig,
  BaseResolver,
  type SpecVersion,
  type Document,
} from '@redocly/openapi-core';
import { handleJoin } from '../../commands/join.js';
import {
  getAndValidateFileExtension,
  getFallbackApisOrExit,
  sortTopLevelKeysForOas,
  writeToFileByExtension,
} from '../../utils/miscellaneous.js';
import { exitWithError } from '../../utils/error.js';
import { configFixture } from '../fixtures/config.js';
import {
  firstDocument,
  secondDocument,
  thirdDocument,
  serverAndPaths,
  anotherServerAndPaths,
} from '../fixtures/join/documents.js';

describe('handleJoin', () => {
  let writeToFileByExtensionSpy: any;

  beforeEach(() => {
    vi.mock('../../utils/miscellaneous.js');
    vi.mock('../../utils/error.js');
    vi.mocked(getAndValidateFileExtension).mockImplementation(
      (fileName) => fileName.split('.').pop() as any
    );
    vi.mocked(getFallbackApisOrExit).mockImplementation(
      async (entrypoints) => entrypoints?.map((path: string) => ({ path })) ?? []
    );
    vi.mocked(sortTopLevelKeysForOas).mockImplementation((document) => document);
    writeToFileByExtensionSpy = vi
      .mocked(writeToFileByExtension)
      .mockImplementation(() => undefined);

    vi.mock('colorette');
    vi.mocked(yellow).mockImplementation((text) => text as string);

    vi.mock('@redocly/openapi-core');
    vi.mocked(bundleDocument).mockResolvedValue({ problems: [] } as any);
    vi.mocked(getTotals).mockReturnValue({ errors: 0, warnings: 0, ignored: 0 });
    vi.mocked(loadConfig).mockResolvedValue(configFixture);
    vi.mocked(BaseResolver.prototype.resolveDocument)
      .mockImplementationOnce(() =>
        Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: firstDocument } as Document)
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: secondDocument } as Document)
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: thirdDocument } as Document)
      );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should call exitWithError because only one entrypoint', async () => {
    await handleJoin({ argv: { apis: ['first.yaml'] }, config: {} as any, version: 'cli-version' });
    expect(exitWithError).toHaveBeenCalledWith(`At least 2 APIs should be provided.`);
  });

  it('should call exitWithError if glob expands to less than 2 APIs', async () => {
    vi.mocked(getFallbackApisOrExit).mockResolvedValueOnce([{ path: 'first.yaml' }]);

    await handleJoin({
      argv: { apis: ['*.yaml'] },
      config: {} as any,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(`At least 2 APIs should be provided.`);
  });

  it('should proceed if glob expands to 2 or more APIs', async () => {
    vi.mocked(detectSpec).mockReturnValue('oas3_1' as SpecVersion);
    vi.mocked(getFallbackApisOrExit).mockResolvedValueOnce([
      { path: 'first.yaml' },
      { path: 'second.yaml' },
    ]);

    await handleJoin({
      argv: { apis: ['*.yaml'] },
      config: configFixture,
      version: 'cli-version',
    });

    expect(exitWithError).not.toHaveBeenCalled();
  });

  it('should call exitWithError because passed all 3 options for tags', async () => {
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
        'prefix-tags-with-info-prop': 'something',
        'without-x-tag-groups': true,
        'prefix-tags-with-filename': true,
      },
      config: {} as any,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(
      `You use prefix-tags-with-filename, prefix-tags-with-info-prop, without-x-tag-groups together.\nPlease choose only one!`
    );
  });

  it('should call exitWithError because passed all 2 options for tags', async () => {
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
        'without-x-tag-groups': true,
        'prefix-tags-with-filename': true,
      },
      config: {} as any,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(
      `You use prefix-tags-with-filename, without-x-tag-groups together.\nPlease choose only one!`
    );
  });

  it('should call exitWithError because Only OpenAPI 3.0 and OpenAPI 3.1 are supported', async () => {
    vi.mocked(detectSpec).mockReturnValueOnce('oas2_0' as SpecVersion);
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: configFixture,
      version: 'cli-version',
    });
    expect(exitWithError).toHaveBeenCalledWith(
      'Only OpenAPI 3.0 and OpenAPI 3.1 are supported: undefined.'
    );
  });

  it('should call exitWithError if mixing OpenAPI 3.0 and 3.1', async () => {
    vi.mocked(detectSpec)
      .mockImplementationOnce(() => 'oas3_0' as SpecVersion)
      .mockImplementationOnce(() => 'oas3_1' as SpecVersion);
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(
      'All APIs must use the same OpenAPI version: undefined.'
    );
  });

  it('should call writeToFileByExtension function', async () => {
    vi.mocked(detectSpec).mockReturnValue('oas3_0' as SpecVersion);
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      expect.any(Object),
      'openapi.yaml',
      expect.any(Boolean)
    );
  });

  it('should call writeToFileByExtension function for OpenAPI 3.1', async () => {
    vi.mocked(detectSpec).mockReturnValue('oas3_1' as SpecVersion);
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      expect.any(Object),
      'openapi.yaml',
      expect.any(Boolean)
    );
  });

  it('should call writeToFileByExtension function with custom output file', async () => {
    vi.mocked(detectSpec).mockReturnValue('oas3_0' as SpecVersion);
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
        output: 'output.yml',
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      expect.any(Object),
      'output.yml',
      expect.any(Boolean)
    );
  });

  it('should call writeToFileByExtension function with json file extension', async () => {
    vi.mocked(detectSpec).mockReturnValue('oas3_0' as SpecVersion);
    await handleJoin({
      argv: {
        apis: ['first.json', 'second.yaml'],
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      expect.any(Object),
      'openapi.json',
      expect.any(Boolean)
    );
  });

  it('should call skipDecorators and skipPreprocessors', async () => {
    vi.mocked(detectSpec).mockReturnValue('oas3_0' as SpecVersion);
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: configFixture,
      version: 'cli-version',
    });

    const config = await loadConfig();
    expect(config.styleguide.skipDecorators).toHaveBeenCalled();
    expect(config.styleguide.skipPreprocessors).toHaveBeenCalled();
  });

  it('should handle join with prefix-components-with-info-prop and null values', async () => {
    vi.mocked(detectSpec).mockReturnValue('oas3_0' as SpecVersion);

    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml', 'third.yaml'],
        'prefix-components-with-info-prop': 'title',
        output: 'join-result.yaml',
      },
      config: configFixture,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      {
        openapi: '3.0.0',
        info: {
          description: 'example test',
          version: '1.0.0',
          title: 'First API',
          termsOfService: 'http://swagger.io/terms/',
          license: {
            name: 'Apache 2.0',
            url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
          },
        },
        servers: [
          {
            url: 'http://localhost:8080',
          },
        ],
        tags: [
          {
            name: 'pet',
            'x-displayName': 'pet',
          },
        ],
        paths: {
          '/GETUser/{userId}': {
            summary: 'get user by id',
            description: 'user info',
            servers: [
              {
                url: '/user',
              },
              {
                url: '/pet',
                description: 'pet server',
              },
            ],
            get: {
              tags: ['pet'],
              summary: 'Find pet by ID',
              description: 'Returns a single pet',
              operationId: 'getPetById',
              servers: [
                {
                  url: '/pet',
                },
              ],
            },
            parameters: [
              {
                name: 'param1',
                in: 'header',
                schema: {
                  description: 'string',
                },
              },
            ],
          },
        },
        components: {
          schemas: {
            Third_API_SchemaWithNull: {
              type: 'string',
              default: null,
              nullable: true,
            },
            Third_API_SchemaWithRef: {
              type: 'object',
              properties: {
                schemaType: {
                  type: 'string',
                  enum: ['foo'],
                },
                foo: {
                  $ref: '#/components/schemas/Third_API_SchemaWithNull',
                },
              },
            },
            Third_API_SchemaWithDiscriminator: {
              discriminator: {
                propertyName: 'schemaType',
                mapping: {
                  foo: '#/components/schemas/Third_API_SchemaWithRef',
                  bar: '#/components/schemas/Third_API_SchemaWithNull',
                },
              },
              oneOf: [
                {
                  $ref: '#/components/schemas/Third_API_SchemaWithRef',
                },
                {
                  type: 'object',
                  properties: {
                    schemaType: {
                      type: 'string',
                      enum: ['bar'],
                    },
                    bar: {
                      type: 'string',
                    },
                  },
                },
              ],
            },
          },
        },
        'x-tagGroups': [
          {
            name: 'First API',
            tags: ['pet'],
          },
        ],
      },
      'join-result.yaml',
      true
    );
  });

  describe('servers', () => {
    it('should keep servers at root level if they are the same', async () => {
      vi.mocked(detectSpec).mockReturnValue('oas3_0' as SpecVersion);
      const docWithServers = {
        ...serverAndPaths,
        servers: [{ url: 'https://common.server.com' }],
        info: { title: 'A' },
      };
      const anotherDocWithSameServers = {
        ...anotherServerAndPaths,
        servers: [{ url: 'https://common.server.com' }],
        info: { title: 'B' },
      };

      vi.mocked(BaseResolver.prototype.resolveDocument)
        .mockReset()
        .mockImplementationOnce(() =>
          Promise.resolve({
            source: { absoluteRef: 'ref-a' },
            parsed: docWithServers,
          } as Document)
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            source: { absoluteRef: 'ref-b' },
            parsed: anotherDocWithSameServers,
          } as Document)
        );

      await handleJoin({
        argv: {
          apis: ['a.yaml', 'b.yaml'],
        },
        config: configFixture,
        version: 'cli-version',
      });

      const joinedDef = writeToFileByExtensionSpy.mock.calls[0][0];
      expect(joinedDef.servers).toEqual([{ url: 'https://common.server.com' }]);
      expect(joinedDef.paths['/foo'].servers).toBeUndefined();
      expect(joinedDef.paths['/bar'].servers).toBeUndefined();
    });

    it('should move servers to path level if they are different', async () => {
      vi.mocked(detectSpec).mockReturnValue('oas3_0' as SpecVersion);
      vi.mocked(BaseResolver.prototype.resolveDocument)
        .mockReset()
        .mockImplementationOnce(() =>
          Promise.resolve({
            source: { absoluteRef: 'ref-a' },
            parsed: serverAndPaths,
          } as Document)
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            source: { absoluteRef: 'ref-b' },
            parsed: anotherServerAndPaths,
          } as Document)
        );

      await handleJoin({
        argv: {
          apis: ['a.yaml', 'b.yaml'],
        },
        config: configFixture,
        version: 'cli-version',
      });

      const joinedDef = writeToFileByExtensionSpy.mock.calls[0][0];
      expect(joinedDef.servers).toBeUndefined();
      expect(joinedDef.paths['/foo'].servers).toEqual([{ url: 'https://foo.com/api/v1/first' }]);
      expect(joinedDef.paths['/bar'].servers).toEqual([{ url: 'https://foo.com/api/v1/second' }]);
    });
  });
});
