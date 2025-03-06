import { createStore, loadAndBundleSpec } from 'redoc';
import { renderToString } from 'react-dom/server';
import { handlerBuildCommand } from '../../commands/build-docs';
import { BuildDocsArgv } from '../../commands/build-docs/types';
import { getPageHTML } from '../../commands/build-docs/utils';
import { getFallbackApisOrExit } from '../../utils/miscellaneous';

vi.mock('redoc');
vi.mock('fs');
vi.mock('../../utils/miscellaneous');

const config = {
  output: '',
  title: 'Test',
  disableGoogleFont: false,
  templateFileName: '',
  templateOptions: {},
  redocOptions: {},
};

vi.mock('react-dom/server', () => ({
  renderToString: vi.fn(),
}));

vi.mock('handlebars', () => ({
  compile: vi.fn(() => vi.fn(() => '<html></html>')),
}));

describe('build-docs', () => {
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
    const processExitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
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
