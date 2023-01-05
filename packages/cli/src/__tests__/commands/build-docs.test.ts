import { createStore, loadAndBundleSpec } from 'redoc';
import { renderToString } from 'react-dom/server';
import { handlerBuildCommand } from '../../commands/build-docs';
import { BuildDocsArgv } from '../../commands/build-docs/types';
import { getPageHTML } from '../../commands/build-docs/utils';
import { getFallbackApisOrExit } from '../../utils';

jest.mock('redoc');
jest.mock('fs');
jest.mock('../../utils');

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
    const result = await getPageHTML({}, '../some-path/openapi.yaml', {
      ...config,
      redocCurrentVersion: '2.0.0',
    });
    expect(renderToString).toBeCalledTimes(1);
    expect(createStore).toBeCalledTimes(1);
    expect(result).toBe('<html></html>');
  });

  it('should work correctly when calling handlerBuildCommand', async () => {
    const processExitMock = jest.spyOn(process, 'exit').mockImplementation();
    await handlerBuildCommand({
      o: '',
      cdn: false,
      title: 'test',
      disableGoogleFont: false,
      template: '',
      templateOptions: {},
      theme: { openapi: {} },
      api: '../some-path/openapi.yaml',
    } as BuildDocsArgv);
    expect(loadAndBundleSpec).toBeCalledTimes(1);
    expect(getFallbackApisOrExit).toBeCalledTimes(1);
    expect(processExitMock).toBeCalledTimes(0);
  });
});
