import { loadConfig } from '@redocly/openapi-core';
import { handleLint } from '../../commands/lint';
import SpyInstance = jest.SpyInstance;

jest.mock('../../utils');
jest.mock('@redocly/openapi-core');

describe('lint', () => {
  let processExitMock: SpyInstance;

  beforeAll(() => {
    processExitMock = jest.spyOn(process, 'exit').mockImplementation();
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  it('uses a passed region to load a config', async () => {
    const entrypoints = ['foo.yaml', 'bar.yaml'];
    const region = 'us';

    (loadConfig as jest.Mock).mockClear();

    await handleLint({
      entrypoints,
      region,
      format: 'stylish',
    }, '');

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region }));
    expect(processExitMock).toHaveBeenCalledWith(0);
  })
});
