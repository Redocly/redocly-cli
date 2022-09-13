import { getPageHTML, handleError } from '../../commands/build-docs/utils';
import { resolve } from 'path';
import { createStore, loadAndBundleSpec } from 'redoc';
import { renderToString } from 'react-dom/server';
import { handlerBuildCommand } from '../../commands/build-docs';
import { BuildDocsArgv } from 'cli/src/commands/build-docs/types';

jest.mock('redoc');
jest.mock('fs');

const config = {
  output: '',
  cdn: false,
  title: 'Test',
  disableGoogleFont: false,
  templateFileName: '',
  templateOptions: {},
  redocOptions: {},
};

jest.mock('react-dom/server', () => ({
  renderToString: jest.fn(),
}));

jest.mock('handlebars', () => ({
  compile: jest.fn(() => jest.fn(() => '<html></html>')),
}));

jest.mock('mkdirp', () => ({
  sync: jest.fn(),
}));

describe('build-docs', () => {
  it('should return correct html and call function for ssr', async () => {
    const result = await getPageHTML({}, '../fixtures/openapi.yaml', { ...config, ssr: true });
    expect(renderToString).toBeCalledTimes(1);
    expect(createStore).toBeCalledTimes(1);
    expect(result).toBe('<html></html>');
  });

  it('should return correct html and do not call function for ssr', async () => {
    const result = await getPageHTML({}, '../fixtures/openapi.yaml', { ...config, ssr: false });
    expect(renderToString).toBeCalledTimes(0);
    expect(createStore).toBeCalledTimes(0);
    expect(result).toBe('<html></html>');
  });

  it('should correct work handlerBuildCommand', async () => {
    const processExitMock = jest.spyOn(process, 'exit').mockImplementation();
    const result = await handlerBuildCommand({
      o: '',
      cdn: false,
      title: 'test',
      disableGoogleFont: false,
      template: '',
      templateOptions: {},
      options: {},
      spec: resolve(__dirname, '../fixtures/openapi.yaml'),
    } as BuildDocsArgv);
    expect(loadAndBundleSpec).toBeCalledTimes(1);
    expect(processExitMock).toBeCalledTimes(0);
  });
});
