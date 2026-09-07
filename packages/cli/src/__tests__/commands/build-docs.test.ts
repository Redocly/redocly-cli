import { bundle, createConfig } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import { renderToString } from 'react-dom/server';
import { createStandaloneServerApp } from 'redoc/bundle/redoc.server.js';

import { handlerBuildCommand } from '../../commands/build-docs/index.js';
import { type BuildDocsArgv } from '../../commands/build-docs/types.js';
import { getPageHTML } from '../../commands/build-docs/utils.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';

vi.mock('redoc/bundle/redoc.server.js', () => ({
  convertSwagger2OpenAPI: vi.fn(async (spec: Record<string, unknown>) => spec),
  createStandaloneServerApp: vi.fn(async () => 'app'),
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
  telemetry: false,
  inlineBundle: false,
};

describe('build-docs', () => {
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
    expect(createStandaloneServerApp).toHaveBeenCalledTimes(1);
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
        telemetry: false,
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
    vi.mocked(fs.readFileSync).mockReturnValue(schema);
    const processExitMock = vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    await handlerBuildCommand({
      argv: {
        o: '',
        template: '',
        templateOptions: {},
        telemetry: false,
        inlineBundle: false,
        api: '../some-path/schema.graphql',
      } as BuildDocsArgv,
      config: await createConfig({}),
      version: 'cli-version',
    });
    expect(bundle).not.toHaveBeenCalled();
    expect(createStandaloneServerApp).toHaveBeenCalledWith(
      expect.objectContaining({ definition: schema, specType: 'graphql' })
    );
    expect(processExitMock).toBeCalledTimes(0);
  });
});
