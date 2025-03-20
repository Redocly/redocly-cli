import { createStore, loadAndBundleSpec } from 'redoc';
import { renderToString } from 'react-dom/server';
import { handlerBuildCommand } from '../../commands/build-docs';
import { BuildDocsArgv } from '../../commands/build-docs/types';
import { getPageHTML } from '../../commands/build-docs/utils';
import { getFallbackApisOrExit } from '../../utils/miscellaneous';
import { type OpenAPISpec } from 'redoc/typings/types';
import { getMergedConfig } from '@redocly/openapi-core';
import * as fs from 'node:fs';

const config = {
  output: '',
  title: 'Test',
  disableGoogleFont: false,
  templateFileName: '',
  templateOptions: {},
  redocOptions: {},
};

describe('build-docs', () => {
  beforeEach(() => {
    vi.mock('redoc');
    vi.mocked(loadAndBundleSpec).mockResolvedValue({ openapi: '3.0.0' } as OpenAPISpec);
    vi.mocked(createStore).mockResolvedValue({ toJS: vi.fn(async () => '{}' as any) } as any);

    vi.mock('node:fs');
    vi.mocked(fs.readFileSync).mockImplementation(() => '');

    vi.mock('../../utils/miscellaneous');

    vi.mock('react-dom/server', () => ({
      renderToString: vi.fn(),
    }));

    vi.mock('handlebars', () => ({
      compile: vi.fn(() => vi.fn(() => '<html></html>')),
    }));

    vi.mock('@redocly/openapi-core');
    vi.mocked(getMergedConfig).mockImplementation((config) => config);
    vi.mocked(getFallbackApisOrExit).mockImplementation(
      async (entrypoints) => entrypoints?.map((path: string) => ({ path })) ?? []
    );
  });

  it('should return correct html and call function for ssr', async () => {
    const result = await getPageHTML({}, '../some-path/openapi.yaml', {
      ...config,
      redocCurrentVersion: '2.0.0',
    });
    expect(renderToString).toBeCalledTimes(1);
    expect(createStore).toBeCalledTimes(1);
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
        api: '../some-path/openapi.yaml',
      } as BuildDocsArgv,
      config: {} as any,
      version: 'cli-version',
    });
    expect(loadAndBundleSpec).toBeCalledTimes(1);
    expect(getFallbackApisOrExit).toBeCalledTimes(1);
    expect(processExitMock).toBeCalledTimes(0);
  });
});
