import { loadConfig } from '@redocly/openapi-core';
import { handleLint } from '../../commands/lint';
import SpyInstance = jest.SpyInstance;
import { Region } from '@redocly/openapi-core/lib/config/config';

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
    const passedRegion = 'some-region';

    (loadConfig as jest.Mock).mockClear();

    await handleLint({
      entrypoints,
      region: (passedRegion as Region),
      format: 'stylish',
    }, '');

    expect(loadConfig).toHaveBeenCalledWith(expect.objectContaining({ region: passedRegion }));
    expect(processExitMock).toHaveBeenCalledWith(0);
  })
});
