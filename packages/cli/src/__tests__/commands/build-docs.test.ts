import { bundle, createConfig, HandledError } from '@redocly/openapi-core';
import handlebars from 'handlebars';
import * as fs from 'node:fs';
import { renderToString } from 'react-dom/server';
import { prepareApiDocs } from 'redoc';

import { handlerBuildCommand } from '../../commands/build-docs/index.js';
import { type BuildDocsArgv } from '../../commands/build-docs/types.js';
import { getObjectOrJSON, getPageHTML } from '../../commands/build-docs/utils.js';
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
    vi.mocked(fs.existsSync).mockImplementation((filePath) =>
      String(filePath).endsWith('redoc.standalone.js')
    );

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

  it('preloads the CDN bundle with an integrity hash unless the bundle is inlined', async () => {
    const template = vi.fn((_context: unknown) => '<html></html>');
    vi.mocked(handlebars.compile).mockReturnValue(template);

    await getPageHTML({ openapi: '3.1.0' }, { ...config, redocVersion: '3.0.0' });
    await getPageHTML(
      { openapi: '3.1.0' },
      { ...config, redocVersion: '3.0.0', inlineBundle: true }
    );

    const [cdnPage, inlinePage] = template.mock.calls.map(
      ([context]) => context as { redocHead: string }
    );
    expect(cdnPage.redocHead).toMatch(
      /^<link rel="modulepreload" href="https:\/\/cdn\.redoc\.ly\/redoc\/v3\.0\.0\/bundles\/redoc\.standalone\.js" integrity="sha384-[A-Za-z0-9+/]+=*" crossorigin="anonymous" \/>/
    );
    expect(inlinePage.redocHead).not.toContain('modulepreload');
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

  it('follows the CLI usage-data setting for Redoc telemetry in the page', async () => {
    vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    const argv = {
      o: '',
      template: '',
      templateOptions: {},
      inlineBundle: false,
      api: '../some-path/openapi.yaml',
    } as BuildDocsArgv;

    vi.stubEnv('REDOCLY_TELEMETRY', 'off');
    await handlerBuildCommand({ argv, config: await createConfig({}), version: 'cli-version' });
    expect(vi.mocked(renderToString).mock.lastCall?.[0]).toMatchObject({
      props: { telemetryConfig: { disabled: true } },
    });

    vi.stubEnv('REDOCLY_TELEMETRY', 'on');
    await handlerBuildCommand({ argv, config: await createConfig({}), version: 'cli-version' });
    expect(vi.mocked(renderToString).mock.lastCall?.[0]).toMatchObject({
      props: { telemetryConfig: { disabled: false } },
    });
  });

  it('reports an invalid --openapi value with the parse error only', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const redoclyConfig = await createConfig({});

    expect(() => getObjectOrJSON('not json', redoclyConfig, 'openapi')).toThrow(HandledError);
    expect(() => getObjectOrJSON('not json', redoclyConfig, 'openapi')).toThrow(
      /^Unexpected token/
    );
  });
});
