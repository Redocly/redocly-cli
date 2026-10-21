import { bundle, createConfig, HandledError, logger } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import { prepareApiDocs } from 'redoc';

import { handlerBuildCommand } from '../../commands/build-docs/index.js';
import { type BuildDocsArgv } from '../../commands/build-docs/types.js';
import { getRedocOptions } from '../../commands/build-docs/utils.js';
import type * as miscellaneous from '../../utils/miscellaneous.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';

vi.mock('redoc', () => ({
  convertSwagger2OpenAPI: vi.fn(async (spec: Record<string, unknown>) => spec),
  prepareApiDocs: vi.fn(async () => ({ items: [], store: {}, options: {} })),
  logoFromSpec: vi.fn(),
  RedoclyApiDocsStandalone: () => null,
  ServerStyleSheet: class {
    collectStyles(app: unknown) {
      return app;
    }
    getStyleTags() {
      return '';
    }
  },
}));
vi.mock('node:fs');
vi.mock('../../utils/miscellaneous.js', async (importOriginal) => ({
  ...(await importOriginal<typeof miscellaneous>()),
  getFallbackApisOrExit: vi.fn(),
}));
vi.mock('react-dom/server', () => ({
  renderToString: vi.fn(),
}));
vi.mock('handlebars', () => ({
  compile: vi.fn(() => vi.fn(() => '<html></html>')),
  default: {
    compile: vi.fn(() => vi.fn(() => '<html></html>')),
  },
}));
vi.mock('@redocly/openapi-core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    bundle: vi.fn(async () => ({ bundle: { parsed: { openapi: '3.1.0' } } })),
  };
});

describe('build-docs', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.mocked(fs.readFileSync).mockImplementation(() => '');

    vi.mocked(getFallbackApisOrExit).mockImplementation(
      async (entrypoints) => entrypoints?.map((path: string) => ({ path })) ?? []
    );
  });

  it('loads a remote GraphQL schema over HTTP instead of reading it from disk', async () => {
    const schema = 'type Query { hello: String }';
    const url = 'https://example.com/schema.graphql';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(schema, { status: 200 }))
    );
    const processExitMock = vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    await handlerBuildCommand({
      argv: {
        o: '',
        template: '',
        templateOptions: {},
        inlineBundle: false,
        api: url,
      } as BuildDocsArgv,
      config: await createConfig({}),
      version: 'cli-version',
    });
    expect(bundle).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(url, expect.anything());
    expect(prepareApiDocs).toHaveBeenCalledWith(expect.objectContaining({ spec: schema }));
    expect(processExitMock).toHaveBeenCalledTimes(0);
  });

  describe('getRedocOptions', () => {
    it('returns options given as an object as they are', async () => {
      const options = { hideDownloadButtons: true };

      expect(getRedocOptions(options, await createConfig({}), 'openapi')).toBe(options);
    });

    it('reads options from a JSON file', async () => {
      const redoclyConfig = await createConfig({});
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      vi.mocked(fs.lstatSync).mockReturnValueOnce({ isFile: () => true } as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValueOnce('{"hideDownloadButtons":true}');

      expect(getRedocOptions('options.json', redoclyConfig, 'openapi')).toEqual({
        hideDownloadButtons: true,
      });
      expect(fs.readFileSync).toHaveBeenCalledWith('options.json', 'utf-8');
    });

    it('parses options given as a JSON string', async () => {
      expect(
        getRedocOptions('{"hideDownloadButtons":true}', await createConfig({}), 'openapi')
      ).toEqual({ hideDownloadButtons: true });
    });

    it('falls back to the matching key of the configuration file', async () => {
      const redoclyConfig = await createConfig(
        { asyncapi: { jsonSamplesDepth: 4 } },
        { configPath: 'redocly.yaml' }
      );

      expect(getRedocOptions(undefined, redoclyConfig, 'asyncapi')).toEqual({
        jsonSamplesDepth: 4,
      });
      expect(getRedocOptions(undefined, redoclyConfig, 'graphql')).toEqual({});
    });

    it('returns no options without a configuration file', async () => {
      expect(getRedocOptions(undefined, await createConfig({}), 'openapi')).toEqual({});
    });

    it('reports an invalid value with the parse error only', async () => {
      vi.spyOn(logger, 'error').mockImplementation(() => {});
      const redoclyConfig = await createConfig({});

      expect(() => getRedocOptions('not json', redoclyConfig, 'openapi')).toThrow(HandledError);
      expect(() => getRedocOptions('not json', redoclyConfig, 'openapi')).toThrow(
        /^Unexpected token/
      );
    });
  });
});
