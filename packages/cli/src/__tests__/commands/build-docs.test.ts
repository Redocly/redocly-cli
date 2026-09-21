import { bundle, createConfig } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import { renderToString } from 'react-dom/server';
import { prepareApiDocs } from 'redoc';

import { handlerBuildCommand } from '../../commands/build-docs/index.js';
import { type BuildDocsArgv } from '../../commands/build-docs/types.js';
import { getPageHTML } from '../../commands/build-docs/utils.js';
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
vi.mock('../../utils/miscellaneous.js');
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

const config = {
  output: '',
  title: 'Test',
  disableGoogleFont: false,
  templateFileName: '',
  templateOptions: {},
  redocOptions: {},
  disableTelemetry: true,
  inlineBundle: false,
};

describe('build-docs', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.mocked(fs.readFileSync).mockImplementation(() => '');

    vi.mocked(getFallbackApisOrExit).mockImplementation(
      async (entrypoints) => entrypoints?.map((path: string) => ({ path })) ?? []
    );
  });

  it('should return correct html and call function for ssr', async () => {
    const result = await getPageHTML(
      { openapi: '3.1.0' },
      {
        ...config,
        redocVersion: '3.0.0',
      }
    );
    expect(renderToString).toHaveBeenCalledTimes(1);
    expect(prepareApiDocs).toHaveBeenCalledTimes(1);
    expect(result).toBe('<html></html>');
  });

  it('should work correctly when calling handlerBuildCommand', async () => {
    const processExitMock = vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    await handlerBuildCommand({
      argv: {
        o: '',
        title: 'test',
        disableGoogleFont: false,
        template: '',
        templateOptions: {},
        theme: { openapi: {} },
        inlineBundle: false,
        api: '../some-path/openapi.yaml',
      } as BuildDocsArgv,
      config: await createConfig({}),
      version: 'cli-version',
    });
    expect(bundle).toBeCalledTimes(1);
    expect(getFallbackApisOrExit).toBeCalledTimes(1);
    expect(processExitMock).toBeCalledTimes(0);
  });

  it('should render a GraphQL schema as SDL without bundling it', async () => {
    const schema = 'type Query { hello: String }';
    vi.mocked(fs.lstatSync).mockReturnValue({ isDirectory: () => false } as fs.Stats);
    vi.mocked(fs.promises.readFile).mockResolvedValue(schema);
    const processExitMock = vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    await handlerBuildCommand({
      argv: {
        o: '',
        template: '',
        templateOptions: {},
        inlineBundle: false,
        api: '../some-path/schema.graphql',
      } as BuildDocsArgv,
      config: await createConfig({}),
      version: 'cli-version',
    });
    expect(bundle).not.toHaveBeenCalled();
    expect(prepareApiDocs).toHaveBeenCalledWith(expect.objectContaining({ spec: schema }));
    expect(vi.mocked(prepareApiDocs).mock.lastCall?.[0]).not.toHaveProperty('specType');
    expect(processExitMock).toBeCalledTimes(0);
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
    expect(processExitMock).toBeCalledTimes(0);
  });

  it('keeps Redoc telemetry off in the page when CLI usage data is off', async () => {
    vi.stubEnv('REDOCLY_TELEMETRY', 'off');
    vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    const argv = {
      o: '',
      template: '',
      templateOptions: {},
      inlineBundle: false,
      api: '../some-path/openapi.yaml',
    } as BuildDocsArgv;

    await handlerBuildCommand({ argv, config: await createConfig({}), version: 'cli-version' });
    expect(vi.mocked(renderToString).mock.lastCall?.[0]).toMatchObject({
      props: { telemetryConfig: { disabled: true } },
    });

    await handlerBuildCommand({
      argv: { ...argv, openapi: { disableTelemetry: false } },
      config: await createConfig({}),
      version: 'cli-version',
    });
    expect(vi.mocked(renderToString).mock.lastCall?.[0]).toMatchObject({
      props: { telemetryConfig: { disabled: false } },
    });
  });
});
